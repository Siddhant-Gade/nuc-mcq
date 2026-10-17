import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import { QuestionBankService } from './question-bank.service.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parserScriptPath = path.join(__dirname, 'pdf-parser.py');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});
export const createAdminQuestionBankRouter = (verifier, service = new QuestionBankService()) => {
    const router = Router();
    const auth = createAuthenticationMiddleware(verifier);
    router.use(auth);
    router.use(requireRoles('ADMIN'));

    // Get prebuilt question bank by topic/preset
    router.get('/prebuilt/:topic', async (req, res, next) => {
        try {
            const topic = (req.params.topic || 'FULL').toUpperCase();
            const map = {
                FULL: 'FULL-QUESTION-BANK.json',
                INTERNET: 'INTERNET-OBJECTIVE.json',
                WORD: 'MS-WORD-OBJECTIVE.json',
                EXCEL: 'MS-EXCEL-OBJECTIVE.json',
                POWERPOINT: 'POWER-POINT-OBJECTIVE.json',
                FUNDAMENTALS: 'COMPUTER-FUNDAMENTAL-OBJECTIVE.json',
            };
            const filename = map[topic] || 'FULL-QUESTION-BANK.json';
            const filePath = path.resolve(__dirname, '../../../../assets/question_bank', filename);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            return res.status(200).json({
                success: true,
                data,
                total: data.length,
            });
        } catch (err) {
            next(err);
        }
    });

    // Parse uploaded file (PDF, ZIP of PDFs, or JSON) and return preview questions
    router.post('/parse-file', upload.single('file'), async (req, res, next) => {
        try {
            if (!req.file) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'No file uploaded.');
            }
            const origName = req.file.originalname.toLowerCase();
            if (origName.endsWith('.json')) {
                const content = req.file.buffer.toString('utf-8');
                let items;
                try {
                    items = JSON.parse(content);
                } catch (_) {
                    throw new ApiError(400, 'VALIDATION_ERROR', 'Uploaded file is not valid JSON.');
                }
                if (!Array.isArray(items)) {
                    throw new ApiError(400, 'VALIDATION_ERROR', 'JSON file must contain an array of questions.');
                }
                return res.status(200).json({
                    success: true,
                    data: items,
                    total: items.length,
                });
            }

            if (origName.endsWith('.pdf')) {
                const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qbank-'));
                const tempFilePath = path.join(tempDir, 'upload.pdf');
                await fs.writeFile(tempFilePath, req.file.buffer);

                try {
                    const { stdout, stderr } = await execFileAsync('python', [parserScriptPath, tempFilePath, req.file.originalname], {
                        maxBuffer: 50 * 1024 * 1024,
                        encoding: 'utf-8',
                    });
                    if (stderr && !stdout) {
                        throw new ApiError(400, 'VALIDATION_ERROR', stderr.trim());
                    }
                    const parsed = JSON.parse(stdout || '[]');
                    if (!Array.isArray(parsed) || parsed.length === 0) {
                        throw new ApiError(
                            400,
                            'VALIDATION_ERROR',
                            `No questions could be extracted from "${req.file.originalname}". The file appears to be empty, scanned/image-only, or not in a recognized GCC-TBC question format.`
                        );
                    }
                    return res.status(200).json({
                        success: true,
                        data: parsed,
                        total: parsed.length,
                    });
                } finally {
                    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
                }
            }

            throw new ApiError(400, 'VALIDATION_ERROR', 'Unsupported file format. Please upload a PDF question bank (.pdf).');
        } catch (err) {
            next(err);
        }
    });
    // Upload bulk questions (either JSON body or file upload)
    router.post('/upload', upload.single('file'), async (req, res, next) => {
        try {
            let items = req.body.questions;
            if (typeof items === 'string') {
                try {
                    items = JSON.parse(items);
                }
                catch (_) {
                    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid JSON string provided for questions.');
                }
            }
            if (req.file) {
                const origName = req.file.originalname.toLowerCase();
                if (origName.endsWith('.pdf')) {
                    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qbank-'));
                    const tempFilePath = path.join(tempDir, 'upload.pdf');
                    await fs.writeFile(tempFilePath, req.file.buffer);
                    try {
                        const { stdout, stderr } = await execFileAsync('python', [parserScriptPath, tempFilePath, req.file.originalname], {
                            maxBuffer: 50 * 1024 * 1024,
                            encoding: 'utf-8',
                        });
                        if (stderr && !stdout) {
                            throw new ApiError(400, 'VALIDATION_ERROR', stderr.trim());
                        }
                        items = JSON.parse(stdout || '[]');
                    } finally {
                        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
                    }
                } else {
                    const fileContent = req.file.buffer.toString('utf-8');
                    try {
                        items = JSON.parse(fileContent);
                    }
                    catch (_) {
                        throw new ApiError(400, 'VALIDATION_ERROR', 'Uploaded file must be a valid JSON or PDF question bank.');
                    }
                }
            }
            if (!items && Array.isArray(req.body)) {
                items = req.body;
            }
            if (!Array.isArray(items) || items.length === 0) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'Expected an array of question objects.');
            }
            const replaceAll = req.body.replaceAll !== false && req.body.replaceAll !== 'false';
            const version = req.body.version || '2.0.0';
            const uploadedBy = req.auth?.authUserId;
            const result = await service.uploadBulk(items, uploadedBy, replaceAll, 'INST001', version);
            res.status(200).json({
                success: true,
                message: `Successfully uploaded ${result.insertedCount} questions.`,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    });
    // Get question bank summary & statistics
    router.get('/summary', async (_req, res, next) => {
        try {
            const summary = await service.getSummary();
            res.status(200).json({
                success: true,
                data: summary,
            });
        }
        catch (err) {
            next(err);
        }
    });
    // Paginated search & list
    router.get('/questions', async (req, res, next) => {
        try {
            const section = req.query.section;
            const search = req.query.search;
            const limit = parseInt(req.query.limit || '50', 10);
            const offset = parseInt(req.query.offset || '0', 10);
            const result = await service.listQuestions('INST001', section, search, limit, offset);
            res.status(200).json({
                success: true,
                data: result.questions,
                total: result.total,
            });
        }
        catch (err) {
            next(err);
        }
    });
    // Create individual question
    router.post('/questions', async (req, res, next) => {
        try {
            const uploadedBy = req.auth?.authUserId;
            const created = await service.createQuestion(req.body, uploadedBy, 'INST001');
            res.status(201).json({
                success: true,
                message: 'Question created successfully.',
                data: created,
            });
        } catch (err) {
            next(err);
        }
    });
    // Get individual question by ID
    router.get('/questions/:id', async (req, res, next) => {
        try {
            const question = await service.getQuestionById(req.params.id, 'INST001');
            res.status(200).json({
                success: true,
                data: question,
            });
        } catch (err) {
            next(err);
        }
    });
    // Update individual question by ID
    router.put('/questions/:id', async (req, res, next) => {
        try {
            const updated = await service.updateQuestion(req.params.id, req.body, 'INST001');
            res.status(200).json({
                success: true,
                message: 'Question updated successfully.',
                data: updated,
            });
        } catch (err) {
            next(err);
        }
    });
    // Delete individual question by ID
    router.delete('/questions/:id', async (req, res, next) => {
        try {
            const result = await service.deleteQuestion(req.params.id, 'INST001');
            res.status(200).json({
                success: true,
                message: 'Question deleted successfully.',
                data: result,
            });
        } catch (err) {
            next(err);
        }
    });
    // Clear questions
    router.delete('/clear', async (_req, res, next) => {
        try {
            await service.clearQuestions('INST001');
            res.status(200).json({
                success: true,
                message: 'Question bank cleared successfully.',
            });
        }
        catch (err) {
            next(err);
        }
    });
    return router;
};
export const createStudentQuestionBankRouter = (verifier, studentIdentityService, service = new QuestionBankService()) => {
    const router = Router();
    const auth = createAuthenticationMiddleware(verifier);
    router.use(auth);
    // List all questions for mobile app offline storage
    router.get('/', async (req, res, next) => {
        try {
            const authUserId = req.auth?.authUserId;
            const email = req.auth?.email;
            if (!authUserId) {
                throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
            }
            await studentIdentityService.requireActive(authUserId, email);
            const questions = await service.listAllForStudent('INST001');
            const summary = await service.getSummary('INST001');
            res.status(200).json({
                success: true,
                data: questions,
                version: summary.version,
                total: questions.length,
            });
        }
        catch (err) {
            next(err);
        }
    });
    return router;
};

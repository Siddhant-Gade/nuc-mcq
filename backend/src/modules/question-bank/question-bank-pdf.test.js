import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parserScriptPath = path.join(__dirname, 'pdf-parser.py');
const samplePdf = path.resolve(__dirname, '../../../../assets/question_bank/ENG-30/BATCH - (101).pdf');

test('PDF parser extracts questions from GCC-TBC batch PDF', async () => {
    const { stdout } = await execFileAsync('python', [parserScriptPath, samplePdf], {
        encoding: 'utf-8',
    });
    const parsed = JSON.parse(stdout);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, 25);
    
    // Test first question (Computer Fundamentals)
    const q1 = parsed[0];
    assert.equal(q1.sr, 1);
    assert.equal(q1.section, 'Computer Fundamentals');
    assert.ok(q1.question_en.includes('programs'));
    assert.equal(q1.correct_option, 'A');
    assert.equal(q1.correct_answer, 'Start');
    
    // Test middle question (MS Excel)
    const q11 = parsed[10];
    assert.equal(q11.sr, 11);
    assert.equal(q11.section, 'MS Excel');
    assert.ok(q11.question_en.includes('Workbook'));
    assert.equal(q11.correct_option, 'D');
    assert.equal(q11.correct_answer, 'Worksheet');
});

test('PDF parser extracts questions for INTERNET-OBJECTIVE.pdf', async () => {
    const internetPdf = path.resolve(__dirname, '../../../../assets/question_bank/INTERNET-OBJECTIVE.pdf');
    const { stdout } = await execFileAsync('python', [parserScriptPath, internetPdf, 'INTERNET-OBJECTIVE.pdf'], {
        encoding: 'utf-8',
    });
    const parsed = JSON.parse(stdout);
    assert.ok(Array.isArray(parsed));
    assert.ok(parsed.length > 0);
    assert.equal(parsed[0].section, 'Internet');
});


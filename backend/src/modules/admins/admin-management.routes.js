import { Router } from 'express';
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';

function hashPin(pin) {
    return crypto.createHash('sha256').update(String(pin).trim()).digest('hex');
}

export function createAdminManagementRouter({ database, tokenVerifier, superAdminEmail }) {
    const router = Router();

    // Authentication middleware
    const authenticate = async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authorization token required.'));
        }
        try {
            const token = authHeader.substring(7);
            const identity = await tokenVerifier.verify(token);
            if (!identity.roles.includes('ADMIN') && !identity.roles.includes('SUPER_ADMIN')) {
                return next(new ApiError(403, 'FORBIDDEN', 'Admin privileges required.'));
            }
            req.auth = identity;
            next();
        } catch (err) {
            next(new ApiError(401, 'INVALID_TOKEN', err.message || 'Invalid or expired token.'));
        }
    };

    router.use(authenticate);

    // 1. Check if master security PIN / Password / Pattern is set up
    router.get('/security/pin-status', async (req, res, next) => {
        try {
            const result = await database.execute(sql`
                SELECT id, security_type as "securityType", updated_at as "updatedAt" FROM admin_security WHERE id = 'master_pin' LIMIT 1
            `);
            const rows = result.rows || result;
            const hasPin = Array.isArray(rows) && rows.length > 0;
            const securityType = hasPin ? (rows[0].securityType || 'pin') : null;
            const updatedAt = hasPin ? rows[0].updatedAt : null;
            res.status(200).json(successResponse({ hasPin, securityType, updatedAt }));
        } catch (err) {
            next(err);
        }
    });

    // 2. Setup or Update master security PIN / Password / Pattern
    router.post('/security/setup-pin', async (req, res, next) => {
        try {
            const { pin, currentPin, securityType } = req.body || {};
            if (!pin || typeof pin !== 'string' || pin.trim().length < 4) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'Security PIN/Password/Pattern must be at least 4 characters.');
            }

            const existingResult = await database.execute(sql`
                SELECT pin_hash FROM admin_security WHERE id = 'master_pin' LIMIT 1
            `);
            const existingRows = existingResult.rows || existingResult;
            const hasPin = Array.isArray(existingRows) && existingRows.length > 0;

            if (hasPin) {
                // If PIN exists, require current PIN to change it
                if (!currentPin || hashPin(currentPin) !== existingRows[0].pin_hash) {
                    throw new ApiError(403, 'INVALID_PIN', 'Current PIN / Security Key is incorrect.');
                }
            }

            const newHash = hashPin(pin);
            const secType = securityType && ['pin', 'pattern', 'password'].includes(securityType) ? securityType : 'pin';
            await database.execute(sql`
                INSERT INTO admin_security (id, pin_hash, security_type, updated_at)
                VALUES ('master_pin', ${newHash}, ${secType}, NOW())
                ON CONFLICT (id) DO UPDATE SET pin_hash = ${newHash}, security_type = ${secType}, updated_at = NOW()
            `);

            res.status(200).json(successResponse({ message: 'Security credential saved successfully.', securityType: secType }));
        } catch (err) {
            next(err);
        }
    });

    // 3. Verify master security PIN / Password / Pattern
    router.post('/security/verify-pin', async (req, res, next) => {
        try {
            const { pin } = req.body || {};
            if (!pin) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'PIN or Pattern key is required.');
            }

            const result = await database.execute(sql`
                SELECT pin_hash, security_type as "securityType" FROM admin_security WHERE id = 'master_pin' LIMIT 1
            `);
            const rows = result.rows || result;
            if (!Array.isArray(rows) || rows.length === 0) {
                throw new ApiError(400, 'NO_PIN_CONFIGURED', 'No security credential has been configured yet. Please set up one first.');
            }

            const isValid = hashPin(pin) === rows[0].pin_hash;
            if (!isValid) {
                throw new ApiError(403, 'INVALID_PIN', 'Incorrect Security Credential / PIN / Pattern.');
            }

            res.status(200).json(successResponse({ valid: true, securityType: rows[0].securityType || 'pin' }));
        } catch (err) {
            next(err);
        }
    });

    // 4. List all Admins
    router.get('/admins', async (req, res, next) => {
        try {
            const admins = [];

            // Add institute super admin
            if (superAdminEmail) {
                admins.push({
                    id: 'SUPER_ADMIN_01',
                    name: 'Institute Super Admin',
                    email: superAdminEmail,
                    role: 'SUPER_ADMIN',
                    isSuperAdmin: true,
                    hasPassword: true,
                    createdAt: new Date().toISOString(),
                });
            }

            const result = await database.execute(sql`
                SELECT id, name, email, role, password_hash as "passwordHash", created_at as "createdAt"
                FROM admin_users
                ORDER BY created_at DESC
            `);
            const rows = result.rows || result;
            if (Array.isArray(rows)) {
                for (const row of rows) {
                    // Avoid duplicating if super admin was inserted
                    if (superAdminEmail && row.email.toLowerCase() === superAdminEmail.toLowerCase()) continue;
                    admins.push({
                        id: row.id,
                        name: row.name,
                        email: row.email,
                        role: row.role,
                        hasPassword: Boolean(row.passwordHash),
                        isSuperAdmin: false,
                        createdAt: row.createdAt,
                    });
                }
            }

            res.status(200).json(successResponse(admins));
        } catch (err) {
            next(err);
        }
    });

    // 5. Add a new Admin account (Requires PIN/Pattern verification)
    router.post('/admins', async (req, res, next) => {
        try {
            const { name, email, pin, password } = req.body || {};

            if (!name || typeof name !== 'string' || !name.trim()) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'Admin full name is required.');
            }
            if (!email || typeof email !== 'string' || !email.trim().includes('@')) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'A valid email address is required.');
            }
            if (!pin || typeof pin !== 'string') {
                throw new ApiError(400, 'VALIDATION_ERROR', 'Security authorization credential is required to add an admin.');
            }

            // Verify PIN
            const pinResult = await database.execute(sql`
                SELECT pin_hash FROM admin_security WHERE id = 'master_pin' LIMIT 1
            `);
            const pinRows = pinResult.rows || pinResult;
            if (!Array.isArray(pinRows) || pinRows.length === 0) {
                throw new ApiError(400, 'NO_PIN_CONFIGURED', 'Security PIN/Pattern must be set up first before adding an admin.');
            }
            if (hashPin(pin) !== pinRows[0].pin_hash) {
                throw new ApiError(403, 'INVALID_PIN', 'Incorrect Security PIN/Pattern. Authorization denied.');
            }

            const trimmedEmail = email.trim().toLowerCase();
            const trimmedName = name.trim();

            if (superAdminEmail && trimmedEmail === superAdminEmail.toLowerCase()) {
                throw new ApiError(400, 'ALREADY_EXISTS', 'This email is already the Super Admin.');
            }

            // Check if already registered
            const existing = await database.execute(sql`
                SELECT id FROM admin_users WHERE LOWER(email) = ${trimmedEmail} LIMIT 1
            `);
            const existRows = existing.rows || existing;
            if (Array.isArray(existRows) && existRows.length > 0) {
                throw new ApiError(409, 'ALREADY_EXISTS', 'An admin with this email is already registered.');
            }

            // Optional password hash
            const passHash = password && typeof password === 'string' && password.trim().length >= 4
                ? hashPin(password.trim())
                : null;

            // Insert into admin_users
            const insertResult = await database.execute(sql`
                INSERT INTO admin_users (email, name, role, password_hash)
                VALUES (${trimmedEmail}, ${trimmedName}, 'ADMIN', ${passHash})
                RETURNING id, name, email, role, created_at as "createdAt"
            `);
            const created = (insertResult.rows || insertResult)[0];

            res.status(201).json(successResponse({
                ...created,
                hasPassword: Boolean(passHash),
                message: `Admin access granted to ${trimmedEmail}.${passHash ? ' Password configured.' : ' They can sign in using Google.'}`,
            }));
        } catch (err) {
            next(err);
        }
    });

    // 6. Delete an Admin account (Requires PIN/Pattern verification)
    router.delete('/admins/:id', async (req, res, next) => {
        try {
            const { id } = req.params;
            const { pin } = req.body || {};

            if (!pin) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'Security PIN/Pattern is required to remove an admin.');
            }

            // Verify PIN
            const pinResult = await database.execute(sql`
                SELECT pin_hash FROM admin_security WHERE id = 'master_pin' LIMIT 1
            `);
            const pinRows = pinResult.rows || pinResult;
            if (!Array.isArray(pinRows) || pinRows.length === 0 || hashPin(pin) !== pinRows[0].pin_hash) {
                throw new ApiError(403, 'INVALID_PIN', 'Incorrect Security PIN/Pattern.');
            }

            await database.execute(sql`
                DELETE FROM admin_users WHERE id = ${id}
            `);

            res.status(200).json(successResponse({ removed: true }));
        } catch (err) {
            next(err);
        }
    });

    return router;
}

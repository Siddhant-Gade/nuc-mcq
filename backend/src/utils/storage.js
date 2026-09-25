import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { database } from '../database/client.js';
/**
 * Phase 13 shared storage boundary for study-material documents.
 * Supports Supabase Storage when configured, PostgreSQL bytea persistence
 * (so cloud/ephemeral hosts like Render never lose uploaded files), and local disk fallback.
 */
const BUCKET_NAME = 'study-materials';
export const SIGNED_URL_EXPIRY_SECONDS = 60;
/** Confirmed Phase 13 limit: 5 MB per document. */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'uploads', 'study-materials');
let cachedClient = null;
let blobTableVerified = false;

async function ensureBlobTable() {
    if (blobTableVerified) return;
    try {
        await database.execute(sql`
            CREATE TABLE IF NOT EXISTS study_material_file (
                file_path TEXT PRIMARY KEY,
                content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
                file_base64 TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        blobTableVerified = true;
    } catch (_) {}
}

function getStorageClient() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        return null;
    }
    if (cachedClient === null) {
        cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });
    }
    return cachedClient;
}
/** Uploads a document buffer to Supabase bucket, PostgreSQL fallback table, and local directory. */
export async function uploadDocument(materialId, instituteId, fileName, buffer, contentType) {
    const client = getStorageClient();
    const storagePath = `${instituteId}/${materialId}/${fileName}`;
    if (client !== null) {
        try {
            const { error } = await client.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
                contentType,
                upsert: true,
            });
            if (error !== null && error.message?.toLowerCase().includes('bucket')) {
                await client.storage.createBucket(BUCKET_NAME, { public: false }).catch(() => {});
                await client.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
                    contentType,
                    upsert: true,
                });
            }
        }
        catch (err) {
            console.warn('Supabase storage exception, falling back to DB/local storage:', err.message);
        }
    }
    // Persist in PostgreSQL so cloud deployments with ephemeral disks (Render) always retain the document
    try {
        await ensureBlobTable();
        const b64 = buffer.toString('base64');
        await database.execute(sql`
            INSERT INTO study_material_file (file_path, content_type, file_base64)
            VALUES (${storagePath}, ${contentType || 'application/octet-stream'}, ${b64})
            ON CONFLICT (file_path) DO UPDATE
            SET content_type = EXCLUDED.content_type,
                file_base64 = EXCLUDED.file_base64;
        `);
    } catch (dbErr) {
        console.warn('DB blob backup warning:', dbErr.message);
    }
    // Local storage copy
    try {
        const localTargetDir = path.join(LOCAL_STORAGE_DIR, instituteId, materialId);
        fs.mkdirSync(localTargetDir, { recursive: true });
        const localFilePath = path.join(localTargetDir, fileName);
        fs.writeFileSync(localFilePath, buffer);
    } catch (_) {}
    return { path: storagePath };
}
/** Downloads document bytes from Supabase Storage, local disk, or PostgreSQL fallback table. */
export async function downloadDocumentBuffer(filePath) {
    const client = getStorageClient();
    if (client !== null) {
        try {
            const { data, error } = await client.storage.from(BUCKET_NAME).download(filePath);
            if (error === null && data) {
                const ab = await data.arrayBuffer();
                return Buffer.from(ab);
            }
        } catch (_) {}
    }
    // Try local disk
    const candidates = [
        path.resolve(process.cwd(), 'uploads', 'study-materials', filePath),
        path.resolve(process.cwd(), 'backend', 'uploads', 'study-materials', filePath),
    ];
    const safePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (safePath) {
        return fs.readFileSync(safePath);
    }
    // Try PostgreSQL fallback table
    try {
        await ensureBlobTable();
        const res = await database.execute(sql`
            SELECT file_base64 FROM study_material_file WHERE file_path = ${filePath} LIMIT 1
        `);
        const rows = res.rows ?? res;
        if (Array.isArray(rows) && rows.length > 0 && rows[0].file_base64) {
            return Buffer.from(rows[0].file_base64, 'base64');
        }
    } catch (_) {}
    return null;
}
/** Issues a download URL for an authorized document read. */
export async function createSignedDownloadUrl(filePath) {
    const client = getStorageClient();
    if (client !== null) {
        try {
            const { data, error } = await client.storage.from(BUCKET_NAME).createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS);
            if (error === null && data?.signedUrl) {
                return data.signedUrl;
            }
        }
        catch (_) {
            // Fallback to local URL below
        }
    }
    // Local endpoint URL
    return `/api/v1/study-materials/files/${encodeURIComponent(filePath)}`;
}
/** Removes a stored object (best-effort companion to row deletion). */
export async function removeDocument(filePath) {
    const client = getStorageClient();
    if (client !== null) {
        try {
            await client.storage.from(BUCKET_NAME).remove([filePath]);
        }
        catch (_) { }
    }
    try {
        await ensureBlobTable();
        await database.execute(sql`DELETE FROM study_material_file WHERE file_path = ${filePath}`);
    } catch (_) {}
    // Also remove local copy if present
    try {
        const localFilePath = path.join(LOCAL_STORAGE_DIR, filePath);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }
    catch (_) { }
}

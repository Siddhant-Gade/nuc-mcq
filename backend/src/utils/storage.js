import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
/**
 * Phase 13 shared storage boundary for study-material documents.
 * Supports Supabase Storage when configured, with seamless local disk fallback.
 */
const BUCKET_NAME = 'study-materials';
export const SIGNED_URL_EXPIRY_SECONDS = 60;
/** Confirmed Phase 13 limit: 5 MB per document. */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'uploads', 'study-materials');
let cachedClient = null;
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
/** Uploads a document buffer to Supabase bucket or local directory fallback. */
export async function uploadDocument(materialId, instituteId, fileName, buffer, contentType) {
    const client = getStorageClient();
    const storagePath = `${instituteId}/${materialId}/${fileName}`;
    if (client !== null) {
        try {
            const { error } = await client.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
                contentType,
                upsert: true,
            });
            if (error === null) {
                return { path: storagePath };
            }
            console.warn('Supabase storage upload failed, falling back to local storage:', error.message);
        }
        catch (err) {
            console.warn('Supabase storage exception, falling back to local storage:', err.message);
        }
    }
    // Local storage fallback
    const localTargetDir = path.join(LOCAL_STORAGE_DIR, instituteId, materialId);
    fs.mkdirSync(localTargetDir, { recursive: true });
    const localFilePath = path.join(localTargetDir, fileName);
    fs.writeFileSync(localFilePath, buffer);
    return { path: storagePath };
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
    // Also remove local copy if present
    try {
        const localFilePath = path.join(LOCAL_STORAGE_DIR, filePath);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }
    catch (_) { }
}

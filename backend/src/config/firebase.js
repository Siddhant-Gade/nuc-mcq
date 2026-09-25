import fs from 'node:fs';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from './env.js';

let firebaseApp = null;
let messagingInstance = null;

export function getFirebaseAdmin() {
    if (firebaseApp) return { app: firebaseApp, messaging: () => messagingInstance };

    try {
        let credential = null;

        if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            const parsed = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
            credential = cert(parsed);
        } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            const resolvedPath = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
            if (fs.existsSync(resolvedPath)) {
                credential = cert(resolvedPath);
            }
        } else {
            // Check default filenames in root backend/ folder
            const defaultPaths = [
                path.resolve(process.cwd(), 'serviceAccountKey.json'),
                path.resolve(process.cwd(), 'firebase-service-account.json'),
            ];
            for (const candidate of defaultPaths) {
                if (fs.existsSync(candidate)) {
                    const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
                    credential = cert(parsed);
                    break;
                }
            }
        }

        if (credential) {
            firebaseApp = initializeApp({
                credential,
                projectId: 'nuctyping',
            });
            messagingInstance = getMessaging(firebaseApp);
            console.log('[FCM] Firebase Admin SDK initialized successfully.');
        } else {
            console.warn('[FCM] No service account credentials found. FCM will run in dry-run/mock mode.');
        }
    } catch (err) {
        console.error('[FCM] Error initializing Firebase Admin:', err.message);
    }

    return { app: firebaseApp, messaging: () => messagingInstance };
}

export function isFirebaseReady() {
    return firebaseApp !== null;
}

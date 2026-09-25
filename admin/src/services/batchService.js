import { request } from './api';
export async function getBatches() {
    return request('get', '/batches');
}
/** The backend has no single-batch endpoint; resolve via the list. */
export async function getBatchById(id) {
    const batches = await getBatches();
    return batches.find((b) => b.batchId === id);
}
export async function getActiveBatches() {
    return request('get', '/batches/active');
}
export async function createBatch(data) {
    // The server derives enrollment/status; extra keys are stripped anyway.
    const created = await request('post', '/batches', { batchId: data.batchId, batchName: data.batchName, instituteId: data.instituteId, capacity: data.capacity, timing: data.timing || undefined });
    return { ...created, enrolledCount: 0 };
}
export async function deleteBatch(id) {
    await request('delete', `/batches/${id}`);
}

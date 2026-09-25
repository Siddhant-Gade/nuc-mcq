import { request } from './api';
export async function getBroadcasts() {
    return request('get', '/broadcasts');
}
export async function getBroadcastById(id) {
    try {
        return await request('get', `/broadcasts/${id}`);
    }
    catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 404) {
            return undefined;
        }
        throw error;
    }
}
export async function createBroadcast(data) {
    // The backend always creates DRAFT rows; publishing is an explicit step.
    return request('post', '/broadcasts', {
        title: data.title,
        message: data.message,
        audienceType: data.audienceType,
        targetBatchIds: data.audienceType === 'BATCH' ? data.targetBatchIds : undefined,
    });
}
export async function updateBroadcast(id, data) {
    const body = {};
    if (data.title !== undefined)
        body.title = data.title;
    if (data.message !== undefined)
        body.message = data.message;
    if (data.audienceType !== undefined)
        body.audienceType = data.audienceType;
    if (data.targetBatchIds !== undefined)
        body.targetBatchIds = data.targetBatchIds;
    return request('patch', `/broadcasts/${id}`, body);
}
export async function publishBroadcast(id) {
    return request('post', `/broadcasts/${id}/publish`);
}
export async function deleteBroadcast(id) {
    await request('delete', `/broadcasts/${id}`);
}

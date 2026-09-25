import apiClient, { request } from './api';
export async function getStudyMaterials() {
    return request('get', '/study-materials');
}
export async function getStudyMaterialById(id) {
    try {
        return await request('get', `/study-materials/${id}`);
    }
    catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 404) {
            return undefined;
        }
        throw error;
    }
}
export async function uploadStudyMaterialDocument(data) {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description)
        formData.append('description', data.description);
    formData.append('instituteId', data.instituteId);
    if (data.batchId)
        formData.append('batchId', data.batchId);
    formData.append('file', data.file);
    const response = await apiClient.post('/study-materials/documents', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.data;
}
export async function createStudyMaterialVideo(data) {
    return request('post', '/study-materials/videos', data);
}
export async function updateStudyMaterial(id, data) {
    return request('patch', `/study-materials/${id}`, data);
}
export async function publishStudyMaterial(id) {
    return request('post', `/study-materials/${id}/publish`);
}
export async function deleteStudyMaterial(id) {
    await request('delete', `/study-materials/${id}`);
}

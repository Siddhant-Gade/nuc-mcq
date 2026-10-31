import axios from 'axios';
import config from '../config';
/** Normalized failure surfaced by every service; safe to render in the UI. */
export class ApiError extends Error {
    code;
    status;
    constructor(code, message, status) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
    }
}
export function getErrorMessage(error) {
    if (error instanceof ApiError)
        return error.message;
    if (error instanceof Error)
        return error.message;
    return 'Something went wrong. Please try again.';
}
let readAccessToken = () => undefined;
let handleUnauthorized = () => { };
/** Registered by authService once the Supabase client is available. */
export function configureApiClient(options) {
    readAccessToken = options.readAccessToken;
    handleUnauthorized = options.onUnauthorized;
}
function extractBackendError(data) {
    if (data && typeof data === 'object' && 'error' in data) {
        const error = data.error;
        if (error && typeof error === 'object') {
            return {
                code: typeof error.code === 'string' ? error.code : 'UNKNOWN',
                message: typeof error.message === 'string' ? error.message : 'The request was rejected.',
            };
        }
    }
    return null;
}
const apiClient = axios.create({
    baseURL: config.apiBaseUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});
apiClient.interceptors.request.use((request) => {
    const token = readAccessToken();
    if (token) {
        request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
});
apiClient.interceptors.response.use(
// Unwrap the backend envelope: callers receive `data` directly.
(response) => response, (error) => {
    if (error.response?.status === 401) {
        handleUnauthorized();
    }
    const backendError = extractBackendError(error.response?.data);
    if (backendError) {
        return Promise.reject(new ApiError(backendError.code, backendError.message, error.response?.status ?? 0));
    }
    if (error.code === 'ERR_NETWORK') {
        return Promise.reject(new ApiError('NETWORK_UNAVAILABLE', 'Could not reach the server. Is the backend running?', 0));
    }
    return Promise.reject(new ApiError('REQUEST_FAILED', error.message || 'The request failed.', error.response?.status ?? 0));
});
/** Performs a GET/POST/PATCH/DELETE against the backend and unwraps the
 * `{ success: true, data }` envelope. Error envelopes become {@link ApiError}.
 */
export async function request(method, url, body) {
    const response = await apiClient.request({ method, url, data: body });
    return response.data.data;
}
export default apiClient;

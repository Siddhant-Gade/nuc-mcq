export const successResponse = (data) => ({
    success: true,
    data,
});
export const errorResponse = (code, message) => ({
    success: false,
    error: { code, message },
});

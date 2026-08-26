export const successResponse = <T>(data: T) => ({
  success: true as const,
  data,
});

export const errorResponse = (code: string, message: string) => ({
  success: false as const,
  error: { code, message },
});

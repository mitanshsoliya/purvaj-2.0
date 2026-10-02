/**
 * PURVAJ 2.0 — Consistent API Response Helper
 * All responses follow: { success, message, data?, error?, code? }
 */
export const sendSuccess = (res, { data = null, message = 'Success', statusCode = 200 } = {}) => {
  const response = { success: true, message };
  if (data !== null && data !== undefined) response.data = data;
  return res.status(statusCode).json(response);
};

export const sendCreated = (res, { data = null, message = 'Created successfully' } = {}) => {
  return sendSuccess(res, { data, message, statusCode: 201 });
};

export const sendError = (res, { message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', errors = null } = {}) => {
  const response = { success: false, message, code };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

export default { sendSuccess, sendCreated, sendError };

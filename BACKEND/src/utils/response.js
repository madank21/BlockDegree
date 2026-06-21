/**
 * Standardized API Response Helpers
 */

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = {}) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(Object.keys(meta).length > 0 && { meta }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

const sendError = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total: pagination.count,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages,
      hasNext: pagination.page < pagination.totalPages,
      hasPrev: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

const sendNoContent = (res) => {
  return res.status(204).send();
};

// ---------- NEW: Missing HTTP status helpers ----------
const sendUnauthorized = (res, message = 'Unauthorized') =>
  sendError(res, message, 401);

const sendForbidden = (res, message = 'Forbidden') =>
  sendError(res, message, 403);

const sendNotFound = (res, resource = 'Resource') =>
  sendError(res, `${resource} not found`, 404);
// ------------------------------------------------------

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
  sendCreated,
  sendNoContent,
  sendUnauthorized,   // <-- newly added
  sendForbidden,      // <-- newly added
  sendNotFound,       // <-- newly added
};
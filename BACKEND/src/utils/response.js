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

/**
 * sendPaginated — FIXED
 *
 * This codebase calls sendPaginated two different, incompatible ways:
 *
 *   1) Legacy positional (6 args):
 *        sendPaginated(res, data, total, page, limit, message)
 *      e.g. degreeController.getDegrees, auditController.getAuditLogs
 *
 *   2) "Result object" (4 args):
 *        sendPaginated(res, data, result, message)
 *      where `result` is a model's raw return value, e.g.
 *        { data, total, page, limit, totalPages } — note the field is
 *        `total`, not `count`.
 *      e.g. documentController.getMyDocuments/getAllDocuments,
 *           verificationController.getAllVerifications
 *
 * The previous version of this function only ever read pagination.count
 * and pagination.totalPages — both undefined in EVERY real call site,
 * legacy or object-style — so every paginated endpoint in the app returned
 * a `pagination` block with `total: undefined` and `totalPages: undefined`.
 *
 * Rather than touching four separate controllers (and risking new typos),
 * this detects which calling convention was used and normalizes both into
 * one correct pagination block.
 */
const sendPaginated = (res, data, paginationOrTotal, pageOrMessage, limit, message) => {
  let count;
  let page;
  let lim;
  let msg;

  if (paginationOrTotal !== null && typeof paginationOrTotal === 'object') {
    // Style 2: result/pagination object — accept several possible field
    // names so callers don't have to agree on exact naming.
    count =
      paginationOrTotal.count ??
      paginationOrTotal.total ??
      (Array.isArray(data) ? data.length : 0);
    page = paginationOrTotal.page ?? 1;
    lim = paginationOrTotal.limit ?? (Array.isArray(data) ? data.length || 10 : 10);
    msg = pageOrMessage || 'Success';
  } else {
    // Style 1: legacy positional call — (res, data, total, page, limit, message)
    count = Number(paginationOrTotal) || 0;
    page = Number(pageOrMessage) || 1;
    lim = Number(limit) || 10;
    msg = message || 'Success';
  }

  page = parseInt(page, 10) || 1;
  lim = parseInt(lim, 10) || 10;
  const totalPages = lim > 0 ? Math.ceil(count / lim) : 0;

  return res.status(200).json({
    success: true,
    message: msg,
    data,
    pagination: {
      total: count,
      page,
      limit: lim,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
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

// ---------- Missing HTTP status helpers ----------
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
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
};
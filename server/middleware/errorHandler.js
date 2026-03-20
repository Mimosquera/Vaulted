function buildErrorResponse(req, status, message, details = null) {
  const payload = {
    error: {
      message,
      status,
      requestId: req.id || null,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    },
  };

  if (details) {
    payload.error.details = details;
  }

  return payload;
}

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json(
      buildErrorResponse(req, 400, 'Validation failed')
    );
  }

  if (err.code === '23505') {
    return res.status(409).json(
      buildErrorResponse(req, 409, 'Resource already exists')
    );
  }

  if (err.message === 'CORS not allowed') {
    return res.status(403).json(
      buildErrorResponse(req, 403, 'Origin is not allowed by CORS policy')
    );
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const details = process.env.NODE_ENV === 'development' ? err.message : null;

  return res.status(status).json(
    buildErrorResponse(req, status, status >= 500 ? 'Internal server error' : 'Request failed', details)
  );
};

export const notFoundHandler = (req, res) => {
  res.status(404).json(buildErrorResponse(req, 404, 'Route not found'));
};

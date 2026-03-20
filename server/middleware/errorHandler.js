export const errorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Resource already exists',
    });
  }

  return res.status(err.status || 500).json({
    error: 'Internal server error',
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Route not found' });
};

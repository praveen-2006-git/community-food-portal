const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode !== 200 && res.statusCode !== 201 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${err.message}`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};

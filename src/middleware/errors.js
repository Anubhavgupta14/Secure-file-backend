function notFoundHandler(_req, res, _next) {
  res.status(404).json({ 
    status: 404,
    error: 'Not Found' 
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.publicMessage || 'Internal Server Error';
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ 
    status: status,
    error: message 
  });
}

module.exports = { notFoundHandler, errorHandler };



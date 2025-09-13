const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDatabase } = require('./utils/db');
const { configureCloudinary } = require('./utils/cloudinary');
const filesRouter = require('./routes/files');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

const app = express();

// Security headers
app.use(helmet());

// Basic JSON parsing for non-multipart endpoints
app.use(express.json({ limit: '1mb' }));

// Logging
app.use(morgan('combined'));

// Simple rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(limiter);

// Healthcheck
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 200,
    message: 'ok' 
  });
});

// Mount routes
app.use('/files', filesRouter);

// 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

initDatabase();
configureCloudinary();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});



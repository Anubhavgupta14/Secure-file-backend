const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const { getPool } = require('../utils/db');
const { sha256File } = require('../utils/hash');
const { uploadFile, buildDownloadUrl } = require('../utils/cloudinary');

const router = express.Router();

// Use memory storage; we'll stream to Cloudinary and not persist locally
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded');
      err.status = 400;
      err.publicMessage = 'No file uploaded';
      throw err;
    }

    // Write buffer to a temp file to compute hash and upload
    const tempPath = path.join(require('os').tmpdir(), `${Date.now()}-${Math.round(Math.random() * 1e9)}-${path.basename(req.file.originalname)}`);
    fs.writeFileSync(tempPath, req.file.buffer);
    const fileHash = await sha256File(tempPath);

    const pool = getPool();
    const { rows: dupRows } = await pool.query('SELECT * FROM files WHERE sha256 = $1', [fileHash]);
    const existing = dupRows[0];
    if (existing) {
      // Duplicate: remove temp file and return existing metadata
      try { fs.unlinkSync(tempPath); } catch (_) {}
      return res.status(200).json({ 
        status: 200,
        duplicate: true, 
        file: sanitize(existing) 
      });
    }

    const id = uuidv4();
    const uploadResult = await uploadFile(tempPath, { folder: process.env.CLOUDINARY_FOLDER || 'uploads' });
    const record = {
      id,
      original_name: req.file.originalname,
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      mime_type: req.file.mimetype || 'application/octet-stream',
      byte_size: req.file.size,
      sha256: fileHash
    };

    await pool.query(
      `INSERT INTO files (id, original_name, public_id, secure_url, mime_type, byte_size, sha256)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [record.id, record.original_name, record.public_id, record.secure_url, record.mime_type, record.byte_size, record.sha256]
    );

    try { fs.unlinkSync(tempPath); } catch (_) {}

    res.status(201).json({ 
      status: 201,
      duplicate: false, 
      file: sanitize(record) 
    });
  } catch (err) {
    // Clean up temp file on error
    if (typeof tempPath === 'string' && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM files ORDER BY created_at DESC');
    res.status(200).json({ status: 200, files: rows.map(sanitize) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/metadata', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM files WHERE id = $1', [req.params.id]);
    const row = rows[0];
    if (!row) {
      const err = new Error('File not found');
      err.status = 404;
      err.publicMessage = 'File not found';
      throw err;
    }
    res.status(200).json({ 
      status: 200,
      file: sanitize(row) 
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/download', async (req, res, next) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM files WHERE id = $1', [req.params.id]);
    const row = rows[0];
    if (!row) {
      const err = new Error('File not found');
      err.status = 404;
      err.publicMessage = 'File not found';
      throw err;
    }
    // Redirect to a Cloudinary attachment URL with the proper filename
    const url = buildDownloadUrl(row.public_id, row.original_name);
    return res.redirect(302, url);
  } catch (err) {
    next(err);
  }
});

function sanitize(row) {
  const { id, original_name, mime_type, byte_size, sha256, created_at, public_id, secure_url } = row;
  return { 
    id, 
    originalName: original_name, 
    mimeType: mime_type, 
    byteSize: Number(byte_size), 
    sha256, 
    createdAt: created_at, 
    publicId: public_id,
    url: secure_url
  };
}

module.exports = router;



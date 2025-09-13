const cloudinary = require('cloudinary').v2;

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

async function uploadFile(filePath, options = {}) {
  return cloudinary.uploader.upload(filePath, {
    resource_type: 'auto',
    use_filename: true,
    unique_filename: true,
    ...options
  });
}

function buildDownloadUrl(publicId, originalFilename) {
  const safeFilename = encodeURIComponent(originalFilename.replace(/[^a-zA-Z0-9\.\-_]/g, '_'));
  
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    secure: true,
    flags: `attachment:${safeFilename}`  // Correct syntax
  });
}

module.exports = { configureCloudinary, uploadFile, buildDownloadUrl };



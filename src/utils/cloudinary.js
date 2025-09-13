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

module.exports = { configureCloudinary, uploadFile };



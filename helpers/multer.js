require('dotenv').config();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 're-image',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [
            { width: 440, height: 440, crop: "fill" }
        ],
        public_id: (req, file) => Date.now() + '-' + file.originalname.split('.')[0],
    },
});

// Configure Multer with file size limit and file filter
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpg|jpeg|png/;
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file format. Only JPG, JPEG, and PNG are allowed.'));
        }
    }
});

module.exports = upload;
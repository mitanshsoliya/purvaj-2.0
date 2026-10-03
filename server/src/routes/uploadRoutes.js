import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config with robust extension handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || ext === '.') {
      if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      else if (file.mimetype === 'image/gif') ext = '.gif';
      else ext = '.jpg';
    } else if (ext === '.jfif') {
      ext = '.jpg';
    }
    cb(null, `prod-${uniqueSuffix}${ext}`);
  },
});

// File filter accepting all common downloaded and photographed image formats
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif|svg|jfif|avif|bmp/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimetype = (file.mimetype || '').toLowerCase();

  if (
    allowed.test(ext) ||
    mimetype.startsWith('image/') ||
    (mimetype === 'application/octet-stream' && allowed.test(ext))
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP, GIF, JFIF, AVIF) are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for high-res images
  fileFilter,
});

/**
 * @route   POST /api/upload
 * @desc    Upload product image
 * @access  Authenticated users only
 */
router.post('/', authenticate, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return sendError(res, { message: `Upload error: ${err.message}`, statusCode: 400 });
    } else if (err) {
      return sendError(res, { message: err.message, statusCode: 400 });
    }

    if (!req.file) {
      return sendError(res, { message: 'No image file provided', statusCode: 400 });
    }

    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const relativeUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    return sendSuccess(res, {
      data: {
        filename: req.file.filename,
        url: fullUrl,
        relativeUrl,
      },
      message: 'Image uploaded successfully',
    });
  });
});

export default router;

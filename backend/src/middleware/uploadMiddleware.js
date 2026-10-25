import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory structure exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'complaints');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext) {
      if (file.mimetype.includes('webm')) ext = '.webm';
      else if (file.mimetype.includes('ogg')) ext = '.ogg';
      else if (file.mimetype.includes('wav')) ext = '.wav';
      else if (file.mimetype.includes('mp4') || file.mimetype.includes('m4a')) ext = '.m4a';
      else if (file.mimetype.includes('mpeg') || file.mimetype.includes('mp3')) ext = '.mp3';
      else ext = '.bin';
    }
    const prefix = file.fieldname === 'voice_recording' ? 'voice' : 'complaint';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

// File validation filter for images and voice recordings
const fileFilter = (req, file, cb) => {
  const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const allowedAudioMimeTypes = [
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/aac',
  ];

  if (file.fieldname === 'problem_image') {
    if (allowedImageMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Invalid image type. Only JPEG, PNG, and WebP images are allowed.'));
  }

  if (file.fieldname === 'voice_recording') {
    if (
      file.mimetype.startsWith('audio/') ||
      allowedAudioMimeTypes.some((t) => file.mimetype.toLowerCase().startsWith(t))
    ) {
      return cb(null, true);
    }
    return cb(new Error('Invalid audio type. Supported audio formats include WebM, WAV, OGG, MP3, and M4A.'));
  }

  // Generic fallback if fieldname is unlisted
  if (
    allowedImageMimeTypes.includes(file.mimetype) ||
    file.mimetype.startsWith('audio/') ||
    allowedAudioMimeTypes.some((t) => file.mimetype.toLowerCase().startsWith(t))
  ) {
    return cb(null, true);
  }

  cb(new Error(`Invalid file upload for field ${file.fieldname}.`));
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

const multerFields = multerInstance.fields([
  { name: 'problem_image', maxCount: 1 },
  { name: 'voice_recording', maxCount: 1 },
]);

export const uploadComplaintMedia = (req, res, next) => {
  multerFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload validation error.',
      });
    }

    // Preserve req.file for legacy code and existing automated test suites
    if (req.files) {
      if (req.files.problem_image && req.files.problem_image.length > 0) {
        req.file = req.files.problem_image[0];
      }
    }

    next();
  });
};

// Backward-compatible export
export const uploadComplaintImage = uploadComplaintMedia;

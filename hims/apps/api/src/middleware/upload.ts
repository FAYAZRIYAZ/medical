import multer from 'multer';
import type { Request } from 'express';
import path from 'path';
import { ValidationError } from '../utils/errors.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB

const memoryStorage = multer.memoryStorage();

function fileFilter(allowedTypes: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new ValidationError(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`));
      return;
    }
    const ext = path.extname(file.originalname).toLowerCase();
    const dangerousExtensions = ['.exe', '.sh', '.bat', '.cmd', '.php', '.js', '.html'];
    if (dangerousExtensions.includes(ext)) {
      cb(new ValidationError('File extension not allowed'));
      return;
    }
    cb(null, true);
  };
}

export const uploadImage = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
});

export const uploadDocument = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_DOCUMENT_SIZE, files: 5 },
  fileFilter: fileFilter(ALLOWED_DOCUMENT_TYPES),
});

export const uploadAny = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_DOCUMENT_SIZE, files: 5 },
  fileFilter: fileFilter([...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]),
});

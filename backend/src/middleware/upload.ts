import multer from 'multer';

/** Binary upload — avoids base64 JSON bloat (4 MB PDF stays ~4 MB, under Vercel's 4.5 MB body limit). */
export const resourceFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { statusCode?: number; type?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err.type === 'entity.too.large') {
    res.status(413).json({
      error: 'Request is too large. Upload files up to 4 MB using the file picker.',
    });
    return;
  }
  const status = err.statusCode ?? 500;
  const message = err.message ?? 'Internal server error';
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: message });
}

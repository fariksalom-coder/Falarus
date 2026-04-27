import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const adminJwtSecretEnv = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
if (!adminJwtSecretEnv || adminJwtSecretEnv.length < 32) {
  throw new Error('ADMIN_JWT_SECRET (or JWT_SECRET) must be set to a strong value (>=32 chars)');
}
const JWT_SECRET = adminJwtSecretEnv;

export interface AdminPayload {
  adminId: number;
  email: string;
}

/**
 * Protects admin routes: requires valid JWT in Authorization header
 * and that the token was issued for an admin (req.adminId set by admin login).
 * Returns 401 if no/invalid token, 403 if not admin.
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Token kerak' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as {
      id?: number;
      adminId?: number;
      email?: string;
    };
    const adminId = decoded.adminId ?? decoded.id;
    if (adminId == null || typeof adminId !== 'number') {
      res.status(403).json({ error: 'Ruxsat yo\'q' });
      return;
    }
    (req as any).adminId = adminId;
    (req as any).adminEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Yaroqsiz token' });
  }
}

export { JWT_SECRET };

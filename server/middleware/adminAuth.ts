import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'super-secret-key-uz-ru';

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
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: number; adminId?: number; email?: string };
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

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'super-secret-key-uz-ru';

export function requireAdmin(req: VercelRequest, res: VercelResponse): number | null {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Token kerak' });
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId?: number; id?: number };
    const adminId = decoded.adminId ?? decoded.id;
    if (adminId == null || typeof adminId !== 'number') {
      res.status(403).json({ error: "Ruxsat yo'q" });
      return null;
    }
    return adminId;
  } catch {
    res.status(401).json({ error: 'Yaroqsiz token' });
    return null;
  }
}


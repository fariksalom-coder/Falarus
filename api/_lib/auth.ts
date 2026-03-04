import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-uz-ru';

export function getUserIdFromRequest(req: { headers?: { authorization?: string } }): number | null {
  const auth = req.headers?.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    return decoded.id;
  } catch {
    return null;
  }
}

export function requireAuth(req: any, res: any): number | null {
  const userId = getUserIdFromRequest(req);
  if (userId == null) {
    res.status(401).json({ error: 'Ruxsat berilmagan' });
    return null;
  }
  return userId;
}

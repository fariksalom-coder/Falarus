import jwt from 'jsonwebtoken';

const jwtSecretEnv = process.env.JWT_SECRET;
if (!jwtSecretEnv || jwtSecretEnv.length < 32) {
  throw new Error('JWT_SECRET must be set to a strong value (>=32 chars)');
}
const JWT_SECRET = jwtSecretEnv;

export function getUserIdFromRequest(req: { headers?: { authorization?: string } }): number | null {
  const auth = req.headers?.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { id?: number; sub?: string | number };
    const rawId = decoded.id ?? decoded.sub;
    const userId = Number(rawId);
    if (!Number.isFinite(userId) || userId < 1) return null;
    return userId;
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

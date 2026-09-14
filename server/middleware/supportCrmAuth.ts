import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { DbClient } from '../types/dbClient';

/**
 * Support CRM auth — mirrors adminAuth: role claim + live agent lookup.
 * Ordinary user / admin tokens must never pass.
 */
const jwtSecretEnv = process.env.SUPPORT_CRM_JWT_SECRET || process.env.JWT_SECRET;
if (!jwtSecretEnv || jwtSecretEnv.length < 32) {
  throw new Error('SUPPORT_CRM_JWT_SECRET (or JWT_SECRET) must be set to a strong value (>=32 chars)');
}
const JWT_SECRET = jwtSecretEnv;

export const SUPPORT_CRM_TOKEN_ROLE = 'support_crm' as const;

export interface SupportCrmPayload {
  agentId: number;
  login: string;
  role: typeof SUPPORT_CRM_TOKEN_ROLE;
}

const AGENT_CACHE_MS = 60_000;
const agentCache = new Map<number, number>();

export function clearSupportCrmAgentCache(agentId?: number): void {
  if (agentId == null) agentCache.clear();
  else agentCache.delete(agentId);
}

async function agentActive(supabase: DbClient, agentId: number): Promise<boolean> {
  const now = Date.now();
  const until = agentCache.get(agentId);
  if (until != null && until > now) return true;

  const { data, error } = await supabase
    .from('support_crm_agents')
    .select('id')
    .eq('id', agentId)
    .eq('active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    agentCache.delete(agentId);
    return false;
  }
  agentCache.set(agentId, now + AGENT_CACHE_MS);
  return true;
}

export function createSupportCrmAuthMiddleware(supabase: DbClient) {
  return function supportCrmAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Token kerak' });
      return;
    }

    let decoded: { agentId?: unknown; role?: unknown; login?: unknown };
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as typeof decoded;
    } catch {
      res.status(401).json({ error: 'Yaroqsiz token' });
      return;
    }

    if (decoded.role !== SUPPORT_CRM_TOKEN_ROLE) {
      res.status(401).json({ error: 'Support CRM tokeni kerak' });
      return;
    }

    const agentId = decoded.agentId;
    if (typeof agentId !== 'number' || !Number.isInteger(agentId) || agentId <= 0) {
      res.status(401).json({ error: 'Support CRM tokeni kerak' });
      return;
    }

    void agentActive(supabase, agentId)
      .then((ok) => {
        if (!ok) {
          res.status(401).json({ error: 'Support CRM tokeni kerak' });
          return;
        }
        (req as Request & { supportCrmAgentId?: number }).supportCrmAgentId = agentId;
        (req as Request & { supportCrmLogin?: unknown }).supportCrmLogin = decoded.login;
        next();
      })
      .catch((err: Error) => {
        console.error('[supportCrmAuth]', err.message);
        res.status(503).json({ error: 'Xizmat vaqtincha ishlamayapti' });
      });
  };
}

export { JWT_SECRET as SUPPORT_CRM_JWT_SECRET };

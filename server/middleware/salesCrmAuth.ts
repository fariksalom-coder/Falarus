import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { DbClient } from '../types/dbClient';

const jwtSecretEnv = process.env.SALES_CRM_JWT_SECRET || process.env.JWT_SECRET;
if (!jwtSecretEnv || jwtSecretEnv.length < 32) {
  throw new Error('SALES_CRM_JWT_SECRET (or JWT_SECRET) must be set to a strong value (>=32 chars)');
}
const JWT_SECRET = jwtSecretEnv;

export const SALES_CRM_TOKEN_ROLE = 'sales_crm' as const;
export type SalesCrmAgentRole = 'admin' | 'operator';

export interface SalesCrmPayload {
  agentId: number;
  login: string;
  role: typeof SALES_CRM_TOKEN_ROLE;
  agentRole: SalesCrmAgentRole;
}

const AGENT_CACHE_MS = 60_000;
const agentCache = new Map<number, { until: number; agentRole: SalesCrmAgentRole; name: string }>();

export function clearSalesCrmAgentCache(agentId?: number): void {
  if (agentId == null) agentCache.clear();
  else agentCache.delete(agentId);
}

async function loadAgent(
  supabase: DbClient,
  agentId: number,
): Promise<{ agentRole: SalesCrmAgentRole; name: string } | null> {
  const now = Date.now();
  const cached = agentCache.get(agentId);
  if (cached && cached.until > now) {
    return { agentRole: cached.agentRole, name: cached.name };
  }

  const { data, error } = await supabase
    .from('sales_crm_agents')
    .select('id, role, name, active')
    .eq('id', agentId)
    .eq('active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    agentCache.delete(agentId);
    return null;
  }
  const agentRole = String((data as { role?: string }).role) === 'admin' ? 'admin' : 'operator';
  const name = String((data as { name?: string }).name ?? '');
  agentCache.set(agentId, { until: now + AGENT_CACHE_MS, agentRole, name });
  return { agentRole, name };
}

export function createSalesCrmAuthMiddleware(supabase: DbClient) {
  return function salesCrmAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: 'Token kerak' });
      return;
    }

    let decoded: { agentId?: unknown; role?: unknown; login?: unknown; agentRole?: unknown };
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as typeof decoded;
    } catch {
      res.status(401).json({ error: 'Yaroqsiz token' });
      return;
    }

    if (decoded.role !== SALES_CRM_TOKEN_ROLE) {
      res.status(401).json({ error: 'Sales CRM tokeni kerak' });
      return;
    }

    const agentId = decoded.agentId;
    if (typeof agentId !== 'number' || !Number.isInteger(agentId) || agentId <= 0) {
      res.status(401).json({ error: 'Sales CRM tokeni kerak' });
      return;
    }

    void loadAgent(supabase, agentId)
      .then((agent) => {
        if (!agent) {
          res.status(401).json({ error: 'Sales CRM tokeni kerak' });
          return;
        }
        const r = req as Request & {
          salesCrmAgentId?: number;
          salesCrmLogin?: unknown;
          salesCrmAgentRole?: SalesCrmAgentRole;
          salesCrmAgentName?: string;
        };
        r.salesCrmAgentId = agentId;
        r.salesCrmLogin = decoded.login;
        r.salesCrmAgentRole = agent.agentRole;
        r.salesCrmAgentName = agent.name;
        next();
      })
      .catch((err: Error) => {
        console.error('[salesCrmAuth]', err.message);
        res.status(503).json({ error: 'Xizmat vaqtincha ishlamayapti' });
      });
  };
}

export function requireSalesCrmAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req as Request & { salesCrmAgentRole?: SalesCrmAgentRole }).salesCrmAgentRole;
  if (role !== 'admin') {
    res.status(403).json({ error: 'Faqat admin uchun' });
    return;
  }
  next();
}

export { JWT_SECRET as SALES_CRM_JWT_SECRET };

import { Router, type Request } from 'express';
import type { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { DbClient } from '../types/dbClient';
import {
  SALES_CRM_JWT_SECRET,
  SALES_CRM_TOKEN_ROLE,
  createSalesCrmAuthMiddleware,
  requireSalesCrmAdmin,
  type SalesCrmAgentRole,
} from '../middleware/salesCrmAuth';
import {
  addLeadComment,
  assignLead,
  changeLeadStatus,
  completeTask,
  getAssignmentMode,
  getDashboard,
  getOperatorStats,
  getSalesLead,
  getTaskSummary,
  listAgents,
  listSalesLeads,
  listTasks,
  logCall,
  scheduleTask,
  setAssignmentMode,
  syncRecentRegistrations,
} from '../services/salesCrm.service';
import {
  isSalesCrmStatus,
  SALES_CRM_ANSWERED_RESULTS,
  SALES_CRM_NO_ANSWER_RESULTS,
  type SalesCrmCallResult,
} from '../../shared/salesCrm.js';

const TOKEN_TTL = '12h';

function agentFromReq(req: Request): { id: number; role: SalesCrmAgentRole } {
  const r = req as Request & {
    salesCrmAgentId?: number;
    salesCrmAgentRole?: SalesCrmAgentRole;
  };
  const id = r.salesCrmAgentId;
  const role = r.salesCrmAgentRole ?? 'operator';
  if (typeof id !== 'number' || id <= 0) throw new Error('Agent topilmadi');
  return { id, role };
}

function scopeOp(role: SalesCrmAgentRole, id: number): number | null {
  return role === 'admin' ? null : id;
}

function isCallResult(v: unknown): v is SalesCrmCallResult {
  const s = String(v ?? '');
  return (
    (SALES_CRM_ANSWERED_RESULTS as readonly string[]).includes(s) ||
    (SALES_CRM_NO_ANSWER_RESULTS as readonly string[]).includes(s)
  );
}

export function createSalesCrmRoutes(supabase: DbClient, leadDb?: Pick<Pool, 'query'>): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    try {
      const login = String(req.body?.login ?? '')
        .trim()
        .toLowerCase();
      const password = String(req.body?.password ?? '');
      if (!login || !password) {
        res.status(400).json({ error: 'Login va parol kerak' });
        return;
      }

      const { data: agent, error } = await supabase
        .from('sales_crm_agents')
        .select('id, login, name, password_hash, active, role')
        .eq('login', login)
        .maybeSingle();

      if (error) {
        console.error('[sales-crm/login]', error.message);
        res.status(503).json({ error: 'Xizmat vaqtincha ishlamayapti' });
        return;
      }
      if (!agent || !(agent as { active?: boolean }).active) {
        res.status(401).json({ error: 'Login yoki parol noto‘g‘ri' });
        return;
      }

      const ok = await bcrypt.compare(password, String((agent as { password_hash: string }).password_hash));
      if (!ok) {
        res.status(401).json({ error: 'Login yoki parol noto‘g‘ri' });
        return;
      }

      const agentRole: SalesCrmAgentRole =
        String((agent as { role?: string }).role) === 'admin' ? 'admin' : 'operator';

      const token = jwt.sign(
        {
          agentId: (agent as { id: number }).id,
          login: (agent as { login: string }).login,
          role: SALES_CRM_TOKEN_ROLE,
          agentRole,
        },
        SALES_CRM_JWT_SECRET,
        { expiresIn: TOKEN_TTL },
      );

      res.json({
        token,
        agent: {
          id: (agent as { id: number }).id,
          login: (agent as { login: string }).login,
          name: (agent as { name: string }).name,
          role: agentRole,
        },
      });
    } catch (e) {
      console.error('[sales-crm/login]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  const auth = createSalesCrmAuthMiddleware(supabase);
  router.use(auth);

  router.get('/me', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const { data } = await supabase
        .from('sales_crm_agents')
        .select('id, login, name, role, active')
        .eq('id', id)
        .maybeSingle();
      const tasks = await getTaskSummary(scopeOp(role, id));
      res.json({ agent: data, role, tasks });
    } catch (e) {
      console.error('[sales-crm/me]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  router.get('/dashboard', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const data = await getDashboard({
        scopeOperatorId: scopeOp(role, id),
        period: typeof req.query.period === 'string' ? req.query.period : '30d',
        from: typeof req.query.from === 'string' ? req.query.from : null,
        to: typeof req.query.to === 'string' ? req.query.to : null,
      });
      res.json(data);
    } catch (e) {
      console.error('[sales-crm/dashboard]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  router.get('/leads', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const statusRaw = typeof req.query.status === 'string' ? req.query.status : '';
      const statuses = statusRaw
        .split(',')
        .map((s) => s.trim())
        .filter(isSalesCrmStatus);
      const data = await listSalesLeads({
        scopeOperatorId: scopeOp(role, id),
        operatorId:
          role === 'admin' && typeof req.query.operatorId === 'string'
            ? Number(req.query.operatorId)
            : undefined,
        status: statuses.length ? statuses : undefined,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        nextContact:
          req.query.nextContact === 'overdue' ||
          req.query.nextContact === 'today' ||
          req.query.nextContact === 'tomorrow' ||
          req.query.nextContact === 'none'
            ? req.query.nextContact
            : null,
        createdFrom: typeof req.query.from === 'string' ? req.query.from : null,
        createdTo: typeof req.query.to === 'string' ? req.query.to : null,
        page: Number(req.query.page) || 1,
        pageSize: Number(req.query.pageSize) || 30,
      }, leadDb);
      res.json(data);
    } catch (e) {
      console.error('[sales-crm/leads]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  router.get('/leads/:id', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const leadId = Number(req.params.id);
      if (!Number.isFinite(leadId)) {
        res.status(400).json({ error: 'Noto‘g‘ri id' });
        return;
      }
      const data = await getSalesLead(leadId, scopeOp(role, id));
      if (!data) {
        res.status(404).json({ error: 'Lead topilmadi' });
        return;
      }
      res.json(data);
    } catch (e) {
      console.error('[sales-crm/leads/:id]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  router.post('/leads/:id/status', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const leadId = Number(req.params.id);
      const status = req.body?.status;
      if (!isSalesCrmStatus(status)) {
        res.status(400).json({ error: 'Noto‘g‘ri status' });
        return;
      }
      await changeLeadStatus({
        leadId,
        status,
        actorId: id,
        scopeOperatorId: scopeOp(role, id),
        confirmPaidDowngrade: Boolean(req.body?.confirmPaidDowngrade),
        comment: req.body?.comment != null ? String(req.body.comment) : null,
        nextContactAt: req.body?.nextContactAt != null ? String(req.body.nextContactAt) : null,
      });
      res.json({ ok: true });
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      if (err.status === 400) {
        res.status(400).json({ error: err.message, code: err.code });
        return;
      }
      if (err.status === 409) {
        res.status(409).json({ error: err.message, code: err.code });
        return;
      }
      if (err.status === 404) {
        res.status(404).json({ error: err.message });
        return;
      }
      console.error('[sales-crm/status]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  router.post('/leads/:id/assign', requireSalesCrmAdmin, async (req, res) => {
    try {
      const { id } = agentFromReq(req);
      const leadId = Number(req.params.id);
      const operatorId =
        req.body?.operatorId == null || req.body?.operatorId === ''
          ? null
          : Number(req.body.operatorId);
      if (operatorId != null && !Number.isFinite(operatorId)) {
        res.status(400).json({ error: 'Noto‘g‘ri operator' });
        return;
      }
      await assignLead(leadId, operatorId, id);
      res.json({ ok: true });
    } catch (e) {
      const err = e as Error & { status?: number };
      res.status(err.status ?? 500).json({ error: err.message || 'Xatolik' });
    }
  });

  router.post('/leads/:id/comment', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      await addLeadComment(
        Number(req.params.id),
        id,
        String(req.body?.comment ?? ''),
        scopeOp(role, id),
      );
      res.json({ ok: true });
    } catch (e) {
      const err = e as Error & { status?: number };
      res.status(err.status ?? 500).json({ error: err.message || 'Xatolik' });
    }
  });

  router.post('/leads/:id/task', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const leadId = Number(req.params.id);
      const detail = await getSalesLead(leadId, scopeOp(role, id));
      if (!detail) {
        res.status(404).json({ error: 'Lead topilmadi' });
        return;
      }
      const operatorId =
        role === 'admin' && Number(req.body?.operatorId)
          ? Number(req.body.operatorId)
          : Number(detail.lead.assigned_operator_id) || id;
      const taskId = await scheduleTask({
        leadId,
        operatorId,
        scheduledAt: String(req.body?.scheduledAt ?? ''),
        note: req.body?.note ? String(req.body.note) : null,
        actorId: id,
      });
      res.json({ ok: true, taskId });
    } catch (e) {
      const err = e as Error & { status?: number };
      res.status(err.status ?? 500).json({ error: err.message || 'Xatolik' });
    }
  });

  router.post('/leads/:id/call', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const result = req.body?.result;
      if (!isCallResult(result)) {
        res.status(400).json({ error: 'Noto‘g‘ri natija' });
        return;
      }
      const answered = Boolean(req.body?.answered ?? SALES_CRM_ANSWERED_RESULTS.includes(result as never));
      const out = await logCall({
        leadId: Number(req.params.id),
        operatorId: id,
        answered,
        result,
        comment: req.body?.comment ? String(req.body.comment) : null,
        nextContactAt: req.body?.nextContactAt ? String(req.body.nextContactAt) : null,
        scopeOperatorId: scopeOp(role, id),
      });
      res.json({ ok: true, ...out });
    } catch (e) {
      const err = e as Error & { status?: number };
      res.status(err.status ?? 500).json({ error: err.message || 'Xatolik' });
    }
  });

  router.get('/tasks', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const bucket =
        req.query.bucket === 'overdue' ||
        req.query.bucket === 'today' ||
        req.query.bucket === 'done' ||
        req.query.bucket === 'all'
          ? req.query.bucket
          : 'all';
      const items = await listTasks({
        scopeOperatorId: scopeOp(role, id),
        operatorId:
          role === 'admin' && Number(req.query.operatorId)
            ? Number(req.query.operatorId)
            : undefined,
        bucket,
      });
      const summary = await getTaskSummary(scopeOp(role, id));
      res.json({ items, summary });
    } catch (e) {
      console.error('[sales-crm/tasks]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  router.post('/tasks/:id/complete', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      await completeTask(Number(req.params.id), id, scopeOp(role, id));
      res.json({ ok: true });
    } catch (e) {
      const err = e as Error & { status?: number };
      res.status(err.status ?? 500).json({ error: err.message || 'Xatolik' });
    }
  });

  router.get('/operators', requireSalesCrmAdmin, async (_req, res) => {
    try {
      res.json({ items: await listAgents(false), assignment: await getAssignmentMode() });
    } catch (e) {
      console.error('[sales-crm/operators]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  router.get('/operators/stats', requireSalesCrmAdmin, async (req, res) => {
    try {
      const items = await getOperatorStats({
        period: typeof req.query.period === 'string' ? req.query.period : '30d',
        from: typeof req.query.from === 'string' ? req.query.from : null,
        to: typeof req.query.to === 'string' ? req.query.to : null,
      });
      res.json({ items });
    } catch (e) {
      console.error('[sales-crm/operators/stats]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  router.post('/settings/assignment', requireSalesCrmAdmin, async (req, res) => {
    try {
      const mode = req.body?.mode === 'manual' ? 'manual' : 'round_robin';
      await setAssignmentMode(mode);
      res.json({ ok: true, mode });
    } catch (e) {
      console.error('[sales-crm/settings]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  router.post('/sync', requireSalesCrmAdmin, async (_req, res) => {
    try {
      const n = await syncRecentRegistrations(300);
      res.json({ ok: true, synced: n });
    } catch (e) {
      console.error('[sales-crm/sync]', e);
      res.status(500).json({ error: 'Xatolik yuz berdi' });
    }
  });

  return router;
}

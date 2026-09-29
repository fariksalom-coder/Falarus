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
  createAgent,
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
  updateAgent,
  type SalesCrmLeadFlow,
} from '../services/salesCrm.service';
import {
  getFunnelReport,
  getLeadMilestones,
  normalizeMonth,
  setFunnelPlans,
  setLeadMilestone,
} from '../services/salesCrmFunnel.service';
import { getPromoLandingAnalytics } from '../services/promoLandingAnalytics.service';
import {
  isSalesCrmStatus,
  isSalesFunnelStage,
  SALES_FUNNEL_MANUAL_STAGES,
  type SalesFunnelManualStage,
  type SalesFunnelStage,
  SALES_CRM_ANSWERED_RESULTS,
  SALES_CRM_NO_ANSWER_RESULTS,
  type SalesCrmCallResult,
} from '../../shared/salesCrm.js';

const TOKEN_TTL = '12h';

function isDbUnavailableError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e ?? '');
  return /ECONNREFUSED|timeout|Connection terminated|DATABASE_URL|connect/i.test(message);
}

function queryFlow(req: Request, role: SalesCrmAgentRole): SalesCrmLeadFlow | null {
  if (role !== 'admin') return null;
  if (req.query.flow === 'platform') return 'platform';
  return 'promo';
}

function sendSalesCrmError(res: { status: (code: number) => { json: (body: unknown) => void } }, e: unknown): void {
  if (isDbUnavailableError(e)) {
    res.status(503).json({
      error: 'CRM bazasi vaqtincha javob bermayapti',
      code: 'CRM_DB_UNAVAILABLE',
    });
    return;
  }
  res.status(500).json({ error: 'Xatolik yuz berdi' });
}

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

function normalizeAgentLogin(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}

function validateAgentInput(input: { login?: string; name?: string; password?: string }, opts: { passwordRequired: boolean }) {
  if (input.login != null && !/^[a-z0-9_.-]{3,40}$/.test(input.login)) {
    throw Object.assign(new Error('Login 3–40 belgi: a-z, 0-9, _, ., -'), { status: 400 });
  }
  if (input.name != null && (!input.name.trim() || input.name.trim().length > 100)) {
    throw Object.assign(new Error('Ism 1–100 belgi bo‘lishi kerak'), { status: 400 });
  }
  if (opts.passwordRequired || input.password) {
    const p = input.password ?? '';
    if (p.length < 12 || p.length > 72 || !/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
      throw Object.assign(new Error('Parol 12–72 belgi, harf va raqamdan iborat bo‘lsin'), { status: 400 });
    }
  }
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
        flow: queryFlow(req, role),
      });
      res.json(data);
    } catch (e) {
      console.error('[sales-crm/dashboard]', e);
      sendSalesCrmError(res, e);
    }
  });

  router.get('/promo-analytics', requireSalesCrmAdmin, async (req, res) => {
    try {
      const period = typeof req.query.period === 'string' ? req.query.period : '30d';
      res.json(await getPromoLandingAnalytics(period, leadDb));
    } catch (e) {
      console.error('[sales-crm/promo-analytics]', e);
      sendSalesCrmError(res, e);
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
        flow:
          role === 'admin' && req.query.flow === 'platform'
            ? 'platform'
            : role === 'admin' && req.query.flow === 'promo'
              ? 'promo'
              : null,
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
      res.json({ ...data, milestones: await getLeadMilestones(leadId) });
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

  router.post('/leads/:id/milestone', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const stage = String(req.body?.stage ?? '');
      if (!(SALES_FUNNEL_MANUAL_STAGES as readonly string[]).includes(stage)) {
        res.status(400).json({ error: 'Noto‘g‘ri bosqich' });
        return;
      }
      await setLeadMilestone({
        leadId: Number(req.params.id),
        stage: stage as SalesFunnelManualStage,
        done: Boolean(req.body?.done),
        actorId: id,
        scopeOperatorId: scopeOp(role, id),
      });
      res.json({ ok: true });
    } catch (e) {
      const err = e as Error & { status?: number };
      res.status(err.status ?? 500).json({ error: err.message || 'Xatolik' });
    }
  });

  // Plan / fact by funnel stage. Operators always get their own numbers.
  router.get('/funnel', async (req, res) => {
    try {
      const { id, role } = agentFromReq(req);
      const requested = Number(req.query.operatorId);
      const operatorId =
        role === 'admin' ? (Number.isFinite(requested) && requested > 0 ? requested : null) : id;
      const report = await getFunnelReport({
        month: normalizeMonth(req.query.month),
        operatorId,
        flow: queryFlow(req, role),
      });
      if (role !== 'admin') report.operators = report.operators.filter((o) => o.id === id);
      res.json(report);
    } catch (e) {
      console.error('[sales-crm/funnel]', e);
      sendSalesCrmError(res, e);
    }
  });

  router.put('/funnel/plans', requireSalesCrmAdmin, async (req, res) => {
    try {
      const rawOp = req.body?.operatorId;
      const operatorId = rawOp == null || rawOp === '' ? null : Number(rawOp);
      if (operatorId != null && !(Number.isFinite(operatorId) && operatorId > 0)) {
        res.status(400).json({ error: 'Noto‘g‘ri operator' });
        return;
      }
      const rawTargets = (req.body?.targets ?? {}) as Record<string, unknown>;
      const targets: Partial<Record<SalesFunnelStage, number | null>> = {};
      for (const [k, v] of Object.entries(rawTargets)) {
        if (!isSalesFunnelStage(k)) continue;
        if (v === null || v === '') targets[k] = null;
        else if (Number.isFinite(Number(v)) && Number(v) >= 0) targets[k] = Number(v);
        else {
          res.status(400).json({ error: 'Reja musbat son bo‘lishi kerak' });
          return;
        }
      }
      await setFunnelPlans({ month: normalizeMonth(req.body?.month), operatorId, targets });
      res.json({ ok: true });
    } catch (e) {
      console.error('[sales-crm/funnel/plans]', e);
      sendSalesCrmError(res, e);
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
      sendSalesCrmError(res, e);
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
      sendSalesCrmError(res, e);
    }
  });

  router.post('/operators', requireSalesCrmAdmin, async (req, res) => {
    try {
      const login = normalizeAgentLogin(req.body?.login);
      const name = String(req.body?.name ?? '').trim();
      const password = String(req.body?.password ?? '');
      validateAgentInput({ login, name, password }, { passwordRequired: true });
      const passwordHash = await bcrypt.hash(password, 12);
      const agent = await createAgent({ login, name, passwordHash, role: 'operator' });
      res.status(201).json({ agent });
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      if (err.status) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      if (err.code === '23505') {
        res.status(409).json({ error: 'Bu login band' });
        return;
      }
      console.error('[sales-crm/operators:create]', e);
      sendSalesCrmError(res, e);
    }
  });

  router.get('/operators/stats', requireSalesCrmAdmin, async (req, res) => {
    try {
      const items = await getOperatorStats({
        period: typeof req.query.period === 'string' ? req.query.period : '30d',
        from: typeof req.query.from === 'string' ? req.query.from : null,
        to: typeof req.query.to === 'string' ? req.query.to : null,
        flow: queryFlow(req, 'admin'),
      });
      res.json({ items });
    } catch (e) {
      console.error('[sales-crm/operators/stats]', e);
      sendSalesCrmError(res, e);
    }
  });

  router.patch('/operators/:id', requireSalesCrmAdmin, async (req, res) => {
    try {
      const operatorId = Number(req.params.id);
      if (!Number.isFinite(operatorId) || operatorId <= 0) {
        res.status(400).json({ error: 'Noto‘g‘ri operator' });
        return;
      }
      const body: {
        name?: string;
        login?: string;
        password?: string;
        active?: boolean;
      } = {};
      if (req.body?.name != null) body.name = String(req.body.name).trim();
      if (req.body?.login != null) body.login = normalizeAgentLogin(req.body.login);
      if (req.body?.password != null) body.password = String(req.body.password);
      if (req.body?.active != null) body.active = Boolean(req.body.active);
      validateAgentInput(body, { passwordRequired: false });
      const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : undefined;
      const agent = await updateAgent({
        id: operatorId,
        name: body.name,
        login: body.login,
        passwordHash,
        active: body.active,
      });
      res.json({ agent });
    } catch (e) {
      const err = e as Error & { status?: number; code?: string };
      if (err.status) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      if (err.code === '23505') {
        res.status(409).json({ error: 'Bu login band' });
        return;
      }
      console.error('[sales-crm/operators:update]', e);
      sendSalesCrmError(res, e);
    }
  });

  router.delete('/operators/:id', requireSalesCrmAdmin, async (req, res) => {
    try {
      const operatorId = Number(req.params.id);
      if (!Number.isFinite(operatorId) || operatorId <= 0) {
        res.status(400).json({ error: 'Noto‘g‘ri operator' });
        return;
      }
      const agent = await updateAgent({ id: operatorId, active: false });
      res.json({ agent });
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error('[sales-crm/operators:delete]', e);
      sendSalesCrmError(res, e);
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

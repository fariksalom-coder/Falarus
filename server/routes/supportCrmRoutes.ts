import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { DbClient } from '../types/dbClient';
import {
  SUPPORT_CRM_JWT_SECRET,
  SUPPORT_CRM_TOKEN_ROLE,
  createSupportCrmAuthMiddleware,
} from '../middleware/supportCrmAuth';
import {
  createSupportCrmContact,
  getSupportCrmStats,
  getSupportCrmUser,
  listSupportCrmQueue,
  nextQueueUserId,
  type ContactChannel,
  type ContactOutcome,
  type ContactResult,
  type QueueFilter,
} from '../services/supportCrm.service';

const TOKEN_TTL = '12h';

function agentIdFromReq(req: { supportCrmAgentId?: number }): number {
  const id = req.supportCrmAgentId;
  if (typeof id !== 'number' || id <= 0) throw new Error('Agent topilmadi');
  return id;
}

export function createSupportCrmRoutes(supabase: DbClient): Router {
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
        .from('support_crm_agents')
        .select('id, login, name, password_hash, active')
        .eq('login', login)
        .maybeSingle();

      if (error) {
        console.error('[support-crm/login]', error.message);
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

      const token = jwt.sign(
        {
          agentId: (agent as { id: number }).id,
          login: (agent as { login: string }).login,
          role: SUPPORT_CRM_TOKEN_ROLE,
        },
        SUPPORT_CRM_JWT_SECRET,
        { expiresIn: TOKEN_TTL }
      );

      res.json({
        token,
        agent: {
          id: (agent as { id: number }).id,
          login: (agent as { login: string }).login,
          name: (agent as { name?: string }).name ?? '',
        },
      });
    } catch (e) {
      console.error('[support-crm/login]', e);
      res.status(500).json({ error: 'Kirish amalga oshmadi' });
    }
  });

  router.use(createSupportCrmAuthMiddleware(supabase));

  router.get('/me', async (req, res) => {
    try {
      const id = agentIdFromReq(req as { supportCrmAgentId?: number });
      const { data, error } = await supabase
        .from('support_crm_agents')
        .select('id, login, name, active')
        .eq('id', id)
        .eq('active', true)
        .maybeSingle();
      if (error || !data) {
        res.status(401).json({ error: 'Support CRM tokeni kerak' });
        return;
      }
      res.json({ agent: data });
    } catch (e) {
      console.error('[support-crm/me]', e);
      res.status(500).json({ error: 'Xatolik' });
    }
  });

  router.get('/stats', async (_req, res) => {
    try {
      const stats = await getSupportCrmStats();
      res.json(stats);
    } catch (e) {
      console.error('[support-crm/stats]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik' });
    }
  });

  router.get('/queue', async (req, res) => {
    try {
      const filterRaw = String(req.query.filter ?? 'needs_contact');
      const filter: QueueFilter =
        filterRaw === 'contacted_today' ? 'contacted_today' : 'needs_contact';
      const limit = Number(req.query.limit ?? 50);
      const offset = Number(req.query.offset ?? 0);
      const data = await listSupportCrmQueue({
        filter,
        limit: Number.isFinite(limit) ? limit : 50,
        offset: Number.isFinite(offset) ? offset : 0,
      });
      res.json(data);
    } catch (e) {
      console.error('[support-crm/queue]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik' });
    }
  });

  router.get('/users/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Noto‘g‘ri foydalanuvchi' });
        return;
      }
      const data = await getSupportCrmUser(id);
      if (!data) {
        res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        return;
      }
      res.json(data);
    } catch (e) {
      console.error('[support-crm/users/:id]', e);
      res.status(500).json({ error: e instanceof Error ? e.message : 'Xatolik' });
    }
  });

  router.post('/contacts', async (req, res) => {
    try {
      const agentId = agentIdFromReq(req as { supportCrmAgentId?: number });
      const body = req.body ?? {};
      const userId = Number(body.userId ?? body.user_id);
      if (!Number.isInteger(userId) || userId <= 0) {
        res.status(400).json({ error: 'userId kerak' });
        return;
      }

      const contact = await createSupportCrmContact({
        agentId,
        userId,
        channel: body.channel as ContactChannel,
        channelOther: body.channelOther ?? body.channel_other,
        outcome: body.outcome as ContactOutcome,
        result: (body.result as ContactResult | null | undefined) ?? null,
        commentText: body.commentText ?? body.comment_text,
      });

      const nextId = await nextQueueUserId(userId);
      res.status(201).json({ contact, nextUserId: nextId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Xatolik';
      console.error('[support-crm/contacts]', e);
      res.status(400).json({ error: msg });
    }
  });

  return router;
}

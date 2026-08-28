import { Router } from 'express';
import type { DbClient } from '../types/dbClient';
import multer from 'multer';
import { createAdminAuthMiddleware } from '../middleware/adminAuth';
import { createAdminOnboardingRoutes } from './onboardingRoutes.js';
import { createAdminController } from '../controllers/adminController';
import { createAdminGrammarController } from '../controllers/adminGrammarController';
import { createAdminMeetController } from '../controllers/adminMeetController';
import { blockUser, listBlocks, unblockUser } from '../services/chatBlock.service.js';
import { ochirXabarMediasi } from '../services/mediaTozalash.service.js';

const TEACHER_OWNER_SELECT = [
  'user_id',
  'first_name',
  'last_name',
  'display_name',
  'age',
  'avatar_url',
  'region',
  'city',
  'experience_years',
  'experience_months',
  'teaching_format',
  'headline',
  'about',
  'subjects',
  'teaching_levels',
  'languages',
  'monthly_course_price_amount',
  'monthly_course_price_currency',
  'rating_avg',
  'rating_count',
  'listing_paid_until',
  'telegram_username',
  'telegram_url',
  'whatsapp_phone_e164',
  'max_contact',
  'public_phone_e164',
  'public_email',
  'preferred_contact_method',
  'profile_status',
  'admin_note',
  'first_listing_discount_used',
  'is_recommended',
  'created_at',
  'updated_at',
].join(', ');

export function createAdminRoutes(supabase: DbClient): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.mimetype)) {
        cb(new Error('Faqat JPG, PNG yoki WEBP ruxsat etiladi'));
        return;
      }
      cb(null, true);
    },
  });
  const ctrl = createAdminController(supabase);
  const grammar = createAdminGrammarController(supabase);
  const meet = createAdminMeetController(supabase);

  router.post('/login', (req, res, next) => ctrl.login(req, res).catch(next));

  // Bundan keyingi HAMMA yo'l admin tokenini talab qiladi. `/login` ataylab
  // yuqorida — u token bermaydi, balki tokenni beradigan yagona yo'l.
  router.use(createAdminAuthMiddleware(supabase));

  router.get('/dashboard', (req, res, next) => ctrl.getDashboard(req, res).catch(next));

  // Ro'yxatdan o'tish so'rovnomasi hisobotlari
  router.use(createAdminOnboardingRoutes());

  // ─────────────────────────────────────────────────────────────
  // Kunlik kurs kontenti (nazariya, testlar, juftlik, gap tuzish,
  // gapirish, lug'at, o'qish) — admin tahriri.
  // Jadval/ustun nomlari faqat contentAdmin.service.ts ro'yxatidan keladi.
  // ─────────────────────────────────────────────────────────────
  const contentFail = (res: any, err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Xatolik';
    console.error('[admin/content]', err);
    res.status(400).json({ error: msg });
  };

  // ── SQL konsoli ────────────────────────────────────────────
  // Chegara bazadagi CHEKLANGAN ROL bilan qo'yilgan (sqlConsole.service.ts).
  router.get('/sql/status', async (_req, res) => {
    const { isSqlConsoleEnabled } = await import('../services/sqlConsole.service.js');
    res.json({ enabled: isSqlConsoleEnabled() });
  });

  router.get('/sql/history', async (_req, res) => {
    try {
      const { sqlHistory } = await import('../services/sqlConsole.service.js');
      res.json({ rows: await sqlHistory(30) });
    } catch (err) {
      contentFail(res, err);
    }
  });

  router.post('/sql/run', async (req: any, res) => {
    const { runSql, logSqlRun } = await import('../services/sqlConsole.service.js');
    const sql = String(req.body?.sql ?? '');
    const dryRun = req.body?.dryRun !== false; // standart holat — XAVFSIZ (quruq bajarish)
    try {
      const out = await runSql(sql, { dryRun });
      await logSqlRun({
        adminId: req.adminId ?? null,
        adminEmail: req.adminEmail ?? null,
        sql,
        dryRun,
        ok: true,
        changed: out.totalChanged,
      });
      res.json(out);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Xatolik';
      await logSqlRun({
        adminId: req.adminId ?? null,
        adminEmail: req.adminEmail ?? null,
        sql,
        dryRun,
        ok: false,
        changed: 0,
        error: message,
      });
      res.status(400).json({ error: message });
    }
  });

  router.get('/content/schema', async (_req, res) => {
    const { resourceSchemas } = await import('../services/contentAdmin.service.js');
    res.json({ resources: resourceSchemas() });
  });

  router.get('/content/overview', async (req, res) => {
    try {
      const { dayOverview } = await import('../services/contentAdmin.service.js');
      res.json(await dayOverview(Number(req.query.day)));
    } catch (err) {
      contentFail(res, err);
    }
  });

  router.get('/content/:resource', async (req, res) => {
    try {
      const { listRows } = await import('../services/contentAdmin.service.js');
      const day = req.query.day != null && req.query.day !== '' ? Number(req.query.day) : undefined;
      res.json({
        rows: await listRows({
          resource: String(req.params.resource),
          day,
          search: req.query.q ? String(req.query.q) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        }),
      });
    } catch (err) {
      contentFail(res, err);
    }
  });

  router.post('/content/:resource', async (req, res) => {
    try {
      const { createRow } = await import('../services/contentAdmin.service.js');
      const day = req.body?.day != null ? Number(req.body.day) : null;
      res.json(await createRow(String(req.params.resource), day, req.body?.values ?? {}));
    } catch (err) {
      contentFail(res, err);
    }
  });

  router.patch('/content/:resource/:id', async (req, res) => {
    try {
      const { updateRow } = await import('../services/contentAdmin.service.js');
      res.json(await updateRow(String(req.params.resource), req.params.id, req.body?.values ?? {}));
    } catch (err) {
      contentFail(res, err);
    }
  });

  router.delete('/content/:resource/:id', async (req, res) => {
    try {
      const { deleteRow } = await import('../services/contentAdmin.service.js');
      res.json(await deleteRow(String(req.params.resource), req.params.id));
    } catch (err) {
      contentFail(res, err);
    }
  });

  router.post('/content/:resource/:id/move', async (req, res) => {
    try {
      const { moveRow } = await import('../services/contentAdmin.service.js');
      const dir = req.body?.dir === 'up' ? 'up' : 'down';
      res.json(await moveRow(String(req.params.resource), req.params.id, dir));
    } catch (err) {
      contentFail(res, err);
    }
  });

  // One-shot XP backfill — iterates all users, recomputes total_points from
  // user_kunlik_day_progress + streak + time. Safe to re-run.
  router.get('/users', (req, res, next) => ctrl.getUsers(req, res).catch(next));
  router.post('/users', (req, res, next) => ctrl.createUser(req, res).catch(next));
  router.get('/users/:id', (req, res, next) => ctrl.getUserProfile(req, res).catch(next));
  /* Chat moderatsiyasi — bloklash o'qish rejimini yoqadi (Support kanali ochiq qoladi). */
  router.get('/chat-blocks', async (_req, res, next) => {
    try {
      res.json(await listBlocks(supabase));
    } catch (e) {
      next(e);
    }
  });
  router.post('/chat-blocks', async (req, res, next) => {
    try {
      const userId = Number((req.body as { user_id?: unknown })?.user_id);
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Foydalanuvchi tanlanmadi' });
      }
      const { data: target } = await supabase
        .from('users')
        .select('is_golden')
        .eq('id', userId)
        .maybeSingle();
      if ((target as { is_golden?: boolean } | null)?.is_golden) {
        return res.status(403).json({ error: "Bu hisobni bloklab bo'lmaydi" });
      }
      const body = req.body as { reason?: unknown; days?: unknown };
      const days = body.days == null || body.days === '' ? null : Number(body.days);
      const block = await blockUser(supabase, {
        userId,
        reason: typeof body.reason === 'string' ? body.reason.trim() || null : null,
        days: Number.isFinite(days as number) ? (days as number) : null,
        byAdminId: Number((req as { adminId?: number }).adminId) || null,
        byName: 'Admin',
      });
      res.status(201).json(block);
    } catch (e) {
      next(e);
    }
  });
  router.delete('/chat-blocks/:userId', async (req, res, next) => {
    try {
      res.json({ success: await unblockUser(supabase, Number(req.params.userId)) });
    } catch (e) {
      next(e);
    }
  });
  router.get('/community-messages', async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 200);
      const { data, error } = await supabase
        .from('community_group_messages')
        .select('id, sender_user_id, content, created_at, edited_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ id: number; sender_user_id: number; content: string; created_at: string; edited_at: string | null }>;
      const ids = [...new Set(rows.map((r) => Number(r.sender_user_id)))];
      const { data: users } = ids.length
        ? await supabase.from('users').select('id, first_name, last_name').in('id', ids)
        : { data: [] as unknown[] };
      const byId = new Map<number, { first_name?: string; last_name?: string }>();
      for (const u of (users ?? []) as Array<{ id: number }>) byId.set(Number(u.id), u as never);
      res.json(
        rows.map((r) => {
          const u = byId.get(Number(r.sender_user_id)) ?? {};
          return {
            ...r,
            sender_name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Foydalanuvchi',
          };
        })
      );
    } catch (e) {
      next(e);
    }
  });
  router.patch('/community-messages/:id', async (req, res, next) => {
    try {
      const content = String((req.body as { content?: unknown })?.content ?? '').trim();
      if (!content) return res.status(400).json({ error: "Matn bo'sh bo'lmasin" });
      const { error } = await supabase
        .from('community_group_messages')
        .update({ content, edited_at: new Date().toISOString(), moderated_by: 'Admin' })
        .eq('id', Number(req.params.id));
      if (error) throw error;
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });
  router.delete('/community-messages/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const { error } = await supabase
        .from('community_group_messages')
        .update({ deleted_at: new Date().toISOString(), moderated_by: 'Admin' })
        .eq('id', id);
      if (error) throw error;
      // Fayl darhol ketadi; yozuvning o'zini soatlik tozalash muhlatdan keyin oladi.
      await ochirXabarMediasi(supabase, id);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  router.get('/payments', (req, res, next) => ctrl.getPayments(req, res).catch(next));
  router.post('/payments/:id/confirm', (req, res, next) => ctrl.confirmPayment(req, res).catch(next));
  router.post('/payments/:id/reject', (req, res, next) => ctrl.rejectPayment(req, res).catch(next));
  router.post('/payments/:id/refund', (req, res, next) => ctrl.refundPayment(req, res).catch(next));
  router.get('/subscriptions', (req, res, next) => ctrl.getSubscriptions(req, res).catch(next));
  /*
   * O'QITUVCHILAR RO'YXATI — HAMMASI, ANKETA TO'LDIRILGAN-TO'LDIRILMAGANIDAN QAT'I NAZAR.
   *
   * Ilgari bu yerda faqat `teacher_profiles` o'qilardi. Lekin anketa yozuvi
   * ro'yxatdan o'tishda EMAS, o'qituvchi kabinetni birinchi marta ochganda
   * yaratiladi (`ensureTeacherProfile`). Ya'ni ro'yxatdan o'tib kabinetga
   * kirmagan odam adminga UMUMAN ko'rinmasdi — unga qo'ng'iroq qilib yordam
   * berishning iloji yo'q edi.
   *
   * Endi ro'yxat `users` dan boshlanadi va anketa unga qo'shiladi. Shu bilan
   * birga hisobning O'ZIDAGI telefon/email ham qaytadi: anketadagi
   * `public_phone_e164` — o'qituvchi ixtiyoriy to'ldiradigan maydon, u bo'sh
   * bo'lsa ham admin bog'lana olishi kerak.
   */
  router.get('/teachers', async (_req, res, next) => {
    try {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone, email, created_at')
        .eq('account_type', 'teacher')
        .order('created_at', { ascending: false })
        .limit(500);
      if (usersErr) throw usersErr;

      const { data: profiles, error: profErr } = await supabase
        .from('teacher_profiles')
        .select(TEACHER_OWNER_SELECT)
        .limit(500);
      if (profErr) throw profErr;

      const byUser = new Map<number, Record<string, unknown>>();
      for (const p of (profiles ?? []) as Record<string, unknown>[]) {
        byUser.set(Number(p.user_id), p);
      }

      const rows = ((users ?? []) as Record<string, unknown>[]).map((u) => {
        const uid = Number(u.id);
        const profile = byUser.get(uid);
        return {
          // Anketa maydonlari (bo'lmasa — bo'sh)
          ...(profile ?? {}),
          user_id: uid,
          // Hisobning o'zidagi ma'lumot — anketadan QAT'I NAZAR har doim bor.
          account_first_name: u.first_name ?? null,
          account_last_name: u.last_name ?? null,
          account_phone: u.phone ?? null,
          account_email: u.email ?? null,
          registered_at: u.created_at ?? null,
          /** Anketa yozuvi umuman bormi. `false` — hech narsa to'ldirilmagan. */
          has_profile: Boolean(profile),
        };
      });

      res.json(rows);
    } catch (e) {
      next(e);
    }
  });
  router.post('/teachers/:userId/status', (req, res, next) => ctrl.updateTeacherStatus(req, res).catch(next));
  router.post('/teachers/:userId/recommend', (req, res, next) => ctrl.setTeacherRecommended(req, res).catch(next));
  router.patch('/teachers/:userId/profile', (req, res, next) => ctrl.updateTeacherProfile(req, res).catch(next));
  router.get('/teacher-trials', async (_req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('teacher_trial_lessons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      res.json(data ?? []);
    } catch (e) {
      next(e);
    }
  });
  router.get('/card-tokens', (req, res, next) => ctrl.getCardTokens(req, res).catch(next));
  router.get('/click-payment-logs', (req, res, next) => ctrl.getClickPaymentLogs(req, res).catch(next));
  router.get('/referrals/withdrawals', (req, res, next) => ctrl.getWithdrawals(req, res).catch(next));
  router.post('/referrals/:id/approve', (req, res, next) => ctrl.approveWithdrawal(req, res).catch(next));
  router.post('/referrals/:id/reject', (req, res, next) => ctrl.rejectWithdrawal(req, res).catch(next));
  router.get('/help/broadcast-preview', (req, res, next) => ctrl.getHelpBroadcastPreview(req, res).catch(next));
  router.post('/help/broadcast', (req, res, next) => ctrl.postHelpBroadcast(req, res).catch(next));
  router.post('/help/users/:userId/messages', (req, res, next) => ctrl.sendHelpDirectUserMessage(req, res).catch(next));
  router.get('/help/chats', (req, res, next) => ctrl.getSupportChats(req, res).catch(next));
  router.get('/help/chats/:chatId/messages', (req, res, next) => ctrl.getSupportChatMessages(req, res).catch(next));
  router.post('/help/chats/:chatId/messages', (req, res, next) => ctrl.sendSupportChatMessage(req, res).catch(next));
  router.post('/help/chats/:chatId/media', upload.single('image'), (req, res, next) =>
    ctrl.sendSupportChatMedia(req, res).catch(next)
  );
  router.post('/help/chats/:chatId/read', (req, res, next) => ctrl.markSupportChatRead(req, res).catch(next));
  router.get('/pricing', (req, res, next) => ctrl.getPricing(req, res).catch(next));
  router.put('/pricing/update', (req, res, next) => ctrl.updatePricing(req, res).catch(next));
  router.get('/payment-methods', (req, res, next) => ctrl.getPaymentMethods(req, res).catch(next));
  router.post('/payment-methods', (req, res, next) => ctrl.createPaymentMethod(req, res).catch(next));
  router.put('/payment-methods/:id', (req, res, next) => ctrl.updatePaymentMethod(req, res).catch(next));
  router.post('/payment-methods/:id/toggle', (req, res, next) => ctrl.togglePaymentMethod(req, res).catch(next));
  router.delete('/payment-methods/:id', (req, res, next) => ctrl.deletePaymentMethod(req, res).catch(next));
  router.get('/tariff-prices', (req, res, next) => ctrl.getTariffPrices(req, res).catch(next));
  router.put('/tariff-prices', (req, res, next) => ctrl.updateTariffPrice(req, res).catch(next));

  // Video dars xonalari ("met"): admin yaratadi va o'qituvchilarga yo'naltiradi.
  router.get('/meet-rooms', (req, res, next) => meet.listRooms(req, res).catch(next));
  router.post('/meet-rooms', (req, res, next) => meet.createRooms(req, res).catch(next));
  router.patch('/meet-rooms/:id', (req, res, next) => meet.updateRoom(req, res).catch(next));
  router.delete('/meet-rooms/:id', (req, res, next) => meet.deleteRoom(req, res).catch(next));
  router.get('/meet-rooms/:id/sessions', (req, res, next) => meet.listRoomSessions(req, res).catch(next));

  router.get('/grammar/lessons', (req, res, next) => grammar.listLessons(req, res).catch(next));
  router.get('/grammar/lessons/:lessonId/questions', (req, res, next) => grammar.listQuestions(req, res).catch(next));
  router.post('/grammar/lessons/:lessonId/questions', (req, res, next) => grammar.createQuestion(req, res).catch(next));
  router.get('/grammar/questions/:questionId', (req, res, next) => grammar.getQuestion(req, res).catch(next));
  router.put('/grammar/questions/:questionId', (req, res, next) => grammar.updateQuestion(req, res).catch(next));

    /* --------------------------------------------------------------------------
   * O'QITUVCHI HUJJATLARINI TEKSHIRISH
   *
   * O'qituvchi anketaga pasport/diplom yuklaydi va u `pending` holatida
   * turadi. Faqat SHU YERDAN tasdiqlash yoki rad etish mumkin — o'qituvchi
   * o'z hujjatini tasdiqlangan qila olmaydi.
   * ------------------------------------------------------------------------ */
  router.get('/teacher-documents', async (req, res) => {
    try {
      const status = String(req.query?.status ?? 'pending');
      let q = supabase
        .from('teacher_documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (['pending', 'approved', 'rejected'].includes(status)) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      const rows = ((data as any[]) ?? []).map((r) => ({ ...r }));

      // O'qituvchi ismini biriktiramiz.
      const ids = [...new Set(rows.map((r) => Number(r.teacher_user_id)).filter(Number.isFinite))];
      const byId = new Map<number, string>();
      if (ids.length) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', ids);
        for (const u of (users as any[]) ?? []) {
          const nm = `${(u as any).first_name ?? ''} ${(u as any).last_name ?? ''}`.trim();
          byId.set(Number((u as any).id), nm || "O'qituvchi");
        }
      }

      // Har holat bo'yicha sanoq — panelda nishon ko'rsatish uchun.
      const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
      for (const st of Object.keys(counts)) {
        const { count } = await supabase
          .from('teacher_documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', st);
        counts[st] = Number(count ?? 0);
      }

      res.json({
        status,
        counts,
        documents: rows.map((r) => ({
          id: Number(r.id),
          teacher_user_id: Number(r.teacher_user_id),
          teacher_name: byId.get(Number(r.teacher_user_id)) ?? "O'qituvchi",
          kind: String(r.kind),
          file_url: String(r.file_url),
          original_name: String(r.original_name ?? ''),
          status: String(r.status),
          admin_note: String(r.admin_note ?? ''),
          created_at: String(r.created_at),
        })),
      });
    } catch (e) {
      console.error('[GET /api/admin/teacher-documents]', e);
      res.status(500).json({ error: 'Hujjatlar yuklanmadi' });
    }
  });

  /**
   * TO'LIQ TEKSHIRUV: bitta o'qituvchi haqida hamma narsa bir joyda —
   * anketa maydonlari, hujjatlar, video va TO'LOV CHEKI.
   *
   * Ilgari admin faqat hujjat faylini ko'rardi: kim ekani, nima yozgani va
   * to'lov qilgan-qilmagani ko'rinmasdi.
   */
  router.get('/teacher-review', async (req, res) => {
    try {
      const status = String(req.query?.status ?? 'pending');

      // Tekshiruv kutayotgan o'qituvchilar: hujjati `pending` yoki anketani
      // yuborgan-u hali tasdiqlanmagan.
      const { data: docs } = await supabase
        .from('teacher_documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      const hujjatlar = ((docs as any[]) ?? []).map((d) => ({ ...d }));

      const { data: profs } = await supabase
        .from('teacher_profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(300);
      const profillar = ((profs as any[]) ?? []).map((p) => ({ ...p }));

      /*
       * TO'LOV QILMAGAN O'QITUVCHI ADMIN RO'YXATIDA KO'RINMAYDI.
       *
       * Ya'ni tekshiruv navbatiga faqat cheki (to'lov yozuvi) bor
       * o'qituvchilar tushadi — admin bo'sh anketalarni ko'rib chiqmaydi.
       */
      const barchaIds = profillar.map((p) => Number(p.user_id));
      const { data: allPays } = barchaIds.length
        ? await supabase
            .from('payments')
            .select('user_id, status')
            .in('user_id', barchaIds)
            .eq('product_code', 'teacher_listing')
            .limit(1000)
        : { data: [] as any[] };
      const tolovBor = new Set(((allPays as any[]) ?? []).map((x) => Number(x.user_id)));

      const kerakli = profillar.filter((p) => {
        const uid = Number(p.user_id);
        const ownDocs = hujjatlar.filter((d) => Number(d.teacher_user_id) === uid);
        const tolagan = tolovBor.has(uid) || Boolean(p.listing_paid_until);
        if (status === 'pending') {
          if (!tolagan) return false;
          return (
            ownDocs.some((d) => String(d.status) === 'pending') ||
            (p.anketa_submitted_at && String(p.profile_status) !== 'active') ||
            ((allPays as any[]) ?? []).some(
              (x) => Number(x.user_id) === uid && String(x.status) === 'pending'
            )
          );
        }
        if (status === 'active') return String(p.profile_status) === 'active';
        return tolagan;
      });

      const ids = kerakli.map((p) => Number(p.user_id));
      const users = ids.length
        ? ((await supabase.from('users').select('id, first_name, last_name, phone, email').in('id', ids))
            .data as any[]) ?? []
        : [];
      const pays = ids.length
        ? ((
            await supabase
              .from('payments')
              .select('id, user_id, amount, currency, status, payment_proof_url, created_at, approved_at')
              .in('user_id', ids)
              .eq('product_code', 'teacher_listing')
              .order('created_at', { ascending: false })
              .limit(300)
          ).data as any[]) ?? []
        : [];

      res.json({
        status,
        teachers: kerakli.map((p) => {
          const uid = Number(p.user_id);
          const u = users.find((x) => Number(x.id) === uid) ?? {};
          return {
            user_id: uid,
            name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || String(p.display_name ?? ''),
            phone: u.phone ?? null,
            email: u.email ?? p.public_email ?? null,
            profile_status: String(p.profile_status ?? 'draft'),
            admin_note: String(p.admin_note ?? ''),
            anketa_submitted_at: p.anketa_submitted_at ?? null,
            listing_paid_until: p.listing_paid_until ?? null,
            avatar_url: p.avatar_url ?? null,
            profile: {
              birth_date: p.birth_date ?? null,
              gender: p.gender ?? null,
              region: p.region ?? '',
              city: p.city ?? '',
              passport_number: p.passport_number ?? '',
              passport_issued_by: p.passport_issued_by ?? '',
              passport_issued_at: p.passport_issued_at ?? null,
              experience_years: Number(p.experience_years ?? 0),
              subjects: p.subjects ?? [],
              teaching_levels: p.teaching_levels ?? [],
              languages: p.languages ?? [],
              education: p.education ?? [],
              certificates: p.certificates ?? [],
              achievements: String(p.achievements ?? ''),
              about: String(p.about ?? ''),
              headline: String(p.headline ?? ''),
              video_url: p.video_url ?? null,
              monthly_course_price_amount: Number(p.monthly_course_price_amount ?? 0),
            },
            documents: hujjatlar
              .filter((d) => Number(d.teacher_user_id) === uid)
              .map((d) => ({
                id: Number(d.id),
                kind: String(d.kind),
                file_url: String(d.file_url),
                original_name: String(d.original_name ?? ''),
                status: String(d.status),
                admin_note: String(d.admin_note ?? ''),
                created_at: String(d.created_at),
              })),
            payments: pays
              .filter((x) => Number(x.user_id) === uid)
              .map((x) => ({
                id: Number(x.id),
                amount: Number(x.amount ?? 0),
                currency: String(x.currency ?? 'UZS'),
                status: String(x.status),
                proof_url: x.payment_proof_url ?? null,
                created_at: String(x.created_at),
                approved_at: x.approved_at ?? null,
              })),
          };
        }),
      });
    } catch (e) {
      console.error('[GET /api/admin/teacher-review]', e);
      res.status(500).json({ error: 'Maʼlumot yuklanmadi' });
    }
  });

  router.patch('/teacher-documents/:id', async (req, res) => {
    try {
      const id = Number(req.params?.id);
      const status = String(req.body?.status ?? '');
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID notoʻgʻri' });
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Holat notoʻgʻri' });
      }
      const note = String(req.body?.admin_note ?? '').slice(0, 500);
      if (status === 'rejected' && !note.trim()) {
        return res.status(400).json({ error: 'Rad etish sababini yozing' });
      }
      // Hujjatning o'zi kerak: video bo'lsa profildagi havolani ham boshqaramiz.
      const { data: doc } = await supabase
        .from('teacher_documents')
        .select('id, teacher_user_id, kind, file_url')
        .eq('id', id)
        .maybeSingle();
      if (!doc) return res.status(404).json({ error: 'Hujjat topilmadi' });

      const { error } = await supabase
        .from('teacher_documents')
        .update({ status, admin_note: note, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      /*
       * VIDEO faqat SHU YERDA ommaviy bo'ladi: tasdiqlangach havola
       * `teacher_profiles.video_url` ga yoziladi va o'quvchilarga ko'rinadi.
       * Rad etilsa yoki qayta tekshiruvga qaytarilsa — olib tashlanadi.
       */
      if (String((doc as any).kind) === 'video') {
        const teacherId = Number((doc as any).teacher_user_id);
        const fileUrl = String((doc as any).file_url);
        if (status === 'approved') {
          await supabase
            .from('teacher_profiles')
            .update({ video_url: fileUrl, updated_at: new Date().toISOString() })
            .eq('user_id', teacherId);
          await supabase.from('teacher_notifications').insert({
            recipient_user_id: teacherId,
            type: 'video_approved',
            title: 'Video tasdiqlandi',
            body: 'Video-taqdimotingiz endi o‘quvchilarga ko‘rinadi.',
            entity_type: 'teacher_document',
            entity_id: id,
          });
        } else {
          const { data: prof } = await supabase
            .from('teacher_profiles')
            .select('video_url')
            .eq('user_id', teacherId)
            .maybeSingle();
          if (String((prof as any)?.video_url ?? '') === fileUrl) {
            await supabase
              .from('teacher_profiles')
              .update({ video_url: null, updated_at: new Date().toISOString() })
              .eq('user_id', teacherId);
          }
          if (status === 'rejected') {
            await supabase.from('teacher_notifications').insert({
              recipient_user_id: teacherId,
              type: 'video_rejected',
              title: 'Video qaytarildi',
              body: note || 'Videoni qayta yuklang.',
              entity_type: 'teacher_document',
              entity_id: id,
            });
          }
        }
      }

      res.json({ success: true, id, status });
    } catch (e) {
      console.error('[PATCH /api/admin/teacher-documents/:id]', e);
      res.status(500).json({ error: 'Saqlanmadi' });
    }
  });

return router;
}

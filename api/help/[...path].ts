import '../_lib/suppress-dep0169.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Busboy from 'busboy';
import { supabase } from '../_lib/supabase.js';
import { setCors, handleOptions } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { parseBody, normalizeQueryPathSegments } from '../_lib/request.js';

const HELP_CHAT_MEDIA_BUCKET = 'help-chat-media';
const HELP_CHAT_ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const HELP_CHAT_MAX_SIZE = 4 * 1024 * 1024; // 4 MB
const HELP_IMAGE_PREFIX = '__image__:';

function isMissingSupportChatSchemaError(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';
  const message = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '');
  return (
    code === '42P01' ||
    code === '42703' ||
    message.includes('support_chats') ||
    message.includes('support_chat_messages') ||
    message.includes('user_last_read_at') ||
    message.includes('admin_last_read_at')
  );
}

async function ensureSupportChat(userId: number): Promise<number> {
  const { data: existing, error: existingErr } = await supabase
    .from('support_chats')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing?.id) return Number(existing.id);

  const now = new Date().toISOString();
  const { data: created, error: createErr } = await supabase
    .from('support_chats')
    .insert({
      user_id: userId,
      status: 'open',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (createErr || !created) throw createErr ?? new Error('Support chat yaratilmadi');
  return Number(created.id);
}

async function parseMultipartImage(req: VercelRequest): Promise<{ buffer: Buffer; mimetype: string } | null> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'));
      return;
    }

    let file: { buffer: Buffer; mimetype: string } | null = null;
    const chunks: Buffer[] = [];
    const bb = Busboy({ headers: { 'content-type': contentType } });
    bb.on('file', (name, stream, info) => {
      if (name !== 'image') {
        stream.resume();
        return;
      }
      if (!HELP_CHAT_ALLOWED_MIMES.includes(info.mimeType)) {
        stream.resume();
        reject(new Error('Faqat JPG, PNG yoki WEBP ruxsat etiladi'));
        return;
      }
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > HELP_CHAT_MAX_SIZE) {
          reject(new Error('Rasm hajmi 4 MB dan oshmasligi kerak'));
          return;
        }
        file = { buffer, mimetype: info.mimeType };
      });
      stream.on('error', reject);
    });
    bb.on('error', reject);
    bb.on('finish', () => resolve(file));
    (req as unknown as NodeJS.ReadableStream).pipe(bb);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  const userId = requireAuth(req, res);
  if (userId == null) return;

  const path = normalizeQueryPathSegments(req.query.path as string | string[] | undefined);

  try {
    // GET /api/help/chats
    if (path[0] === 'chats' && path.length === 1 && req.method === 'GET') {
      const chatId = await ensureSupportChat(userId);
      const [{ data: chat, error: chatErr }, { data: lastRows, error: lastErr }] = await Promise.all([
        supabase
          .from('support_chats')
          .select('id, status, created_at, updated_at, last_message_at, user_last_read_at')
          .eq('id', chatId)
          .single(),
        supabase
          .from('support_chat_messages')
          .select('id, content, sender_type, created_at')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);
      if (chatErr) return res.status(500).json({ error: chatErr.message });
      if (lastErr) return res.status(500).json({ error: lastErr.message });

      let unreadQuery = supabase
        .from('support_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .eq('sender_type', 'admin');
      if (chat?.user_last_read_at) unreadQuery = unreadQuery.gt('created_at', String(chat.user_last_read_at));
      const { count: unreadCount, error: unreadErr } = await unreadQuery;
      if (unreadErr) return res.status(500).json({ error: unreadErr.message });

      const last = lastRows?.[0] ?? null;
      return res.status(200).json([{
        id: Number(chat!.id),
        title: 'Admin',
        status: chat!.status,
        created_at: chat!.created_at,
        updated_at: chat!.updated_at,
        last_message_at: chat!.last_message_at,
        unread_count: Number(unreadCount ?? 0),
        last_message: last
          ? {
              id: Number(last.id),
              content: String(last.content),
              sender_type: String(last.sender_type),
              created_at: String(last.created_at),
            }
          : null,
      }]);
    }

    // GET /api/help/chats/:chatId/messages
    if (path[0] === 'chats' && path[2] === 'messages' && req.method === 'GET') {
      const chatId = Number(path[1]);
      if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
      if (chatId === -1) {
        const { data: rows, error } = await supabase
          .from('support_messages')
          .select('id, message, reply, created_at, answered_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(200);
        if (error) return res.status(500).json({ error: error.message });
        const mapped = (rows ?? []).flatMap((r: any) => {
          const rawMessage = String(r.message ?? '');
          const userMessage = rawMessage.startsWith('[ADMIN_NOTE]') ? [] : [{
            id: Number(r.id) * 2,
            chat_id: -1,
            sender_type: 'user',
            sender_user_id: userId,
            content: rawMessage,
            created_at: String(r.created_at),
          }];
          const adminMessage = r.reply ? [{
            id: Number(r.id) * 2 + 1,
            chat_id: -1,
            sender_type: 'admin',
            sender_user_id: null,
            content: String(r.reply),
            created_at: String(r.answered_at ?? r.created_at),
          }] : [];
          return [...userMessage, ...adminMessage];
        });
        return res.status(200).json(mapped);
      }
      const { data: chat, error: chatErr } = await supabase
        .from('support_chats')
        .select('id, user_id')
        .eq('id', chatId)
        .single();
      if (chatErr || !chat) return res.status(404).json({ error: 'Chat topilmadi' });
      if (Number(chat.user_id) !== userId) return res.status(403).json({ error: 'Ruxsat yo‘q' });
      const { data: rows, error } = await supabase
        .from('support_chat_messages')
        .select('id, chat_id, sender_type, sender_user_id, content, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(300);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(rows ?? []);
    }

    // POST /api/help/chats/:chatId/messages
    if (path[0] === 'chats' && path[2] === 'messages' && req.method === 'POST') {
      const chatId = Number(path[1]);
      const body = parseBody(req.body);
      const content = typeof body.content === 'string' ? body.content.trim() : '';
      if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
      if (!content) return res.status(400).json({ error: 'Xabar bo‘sh' });
      if (chatId === -1) {
        const { data: created, error } = await supabase
          .from('support_messages')
          .insert({ user_id: userId, message: content, status: 'new' })
          .select('id, message, created_at')
          .single();
        if (error || !created) return res.status(500).json({ error: error?.message || 'Xabar yuborilmadi' });
        return res.status(201).json({
          id: Number((created as any).id) * 2,
          chat_id: -1,
          sender_type: 'user',
          sender_user_id: userId,
          content: String((created as any).message),
          created_at: String((created as any).created_at),
        });
      }
      const { data: chat, error: chatErr } = await supabase
        .from('support_chats')
        .select('id, user_id')
        .eq('id', chatId)
        .single();
      if (chatErr || !chat) return res.status(404).json({ error: 'Chat topilmadi' });
      if (Number(chat.user_id) !== userId) return res.status(403).json({ error: 'Ruxsat yo‘q' });
      const now = new Date().toISOString();
      const { data: created, error: msgErr } = await supabase
        .from('support_chat_messages')
        .insert({ chat_id: chatId, sender_type: 'user', sender_user_id: userId, content, created_at: now })
        .select('id, chat_id, sender_type, sender_user_id, content, created_at')
        .single();
      if (msgErr || !created) return res.status(500).json({ error: msgErr?.message || 'Xabar yuborilmadi' });
      await supabase.from('support_chats').update({ updated_at: now, last_message_at: now }).eq('id', chatId);
      return res.status(201).json(created);
    }

    // POST /api/help/chats/:chatId/media
    if (path[0] === 'chats' && path[2] === 'media' && req.method === 'POST') {
      const chatId = Number(path[1]);
      if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
      const file = await parseMultipartImage(req);
      if (!file) return res.status(400).json({ error: 'Rasm yuklanmadi' });
      const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
      const objectPath = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const { data: buckets } = await supabase.storage.listBuckets();
      const hasBucket = (buckets ?? []).some((b: any) => b.name === HELP_CHAT_MEDIA_BUCKET);
      if (!hasBucket) await supabase.storage.createBucket(HELP_CHAT_MEDIA_BUCKET, { public: true });
      const { error: uploadErr } = await supabase.storage
        .from(HELP_CHAT_MEDIA_BUCKET)
        .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (uploadErr) return res.status(500).json({ error: uploadErr.message });
      const { data: publicData } = supabase.storage.from(HELP_CHAT_MEDIA_BUCKET).getPublicUrl(objectPath);
      const imageUrl = publicData?.publicUrl;
      if (!imageUrl) return res.status(500).json({ error: 'Rasm URL olinmadi' });
      const content = `${HELP_IMAGE_PREFIX}${imageUrl}`;
      if (chatId === -1) {
        const { data: created, error } = await supabase
          .from('support_messages')
          .insert({ user_id: userId, message: content, status: 'new' })
          .select('id, message, created_at')
          .single();
        if (error || !created) return res.status(500).json({ error: error?.message || 'Rasm yuborilmadi' });
        return res.status(201).json({
          id: Number((created as any).id) * 2,
          chat_id: -1,
          sender_type: 'user',
          sender_user_id: userId,
          content: String((created as any).message),
          created_at: String((created as any).created_at),
        });
      }
      const { data: chat, error: chatErr } = await supabase
        .from('support_chats')
        .select('id, user_id')
        .eq('id', chatId)
        .single();
      if (chatErr || !chat) return res.status(404).json({ error: 'Chat topilmadi' });
      if (Number(chat.user_id) !== userId) return res.status(403).json({ error: 'Ruxsat yo‘q' });
      const now = new Date().toISOString();
      const { data: created, error: createErr } = await supabase
        .from('support_chat_messages')
        .insert({ chat_id: chatId, sender_type: 'user', sender_user_id: userId, content, created_at: now })
        .select('id, chat_id, sender_type, sender_user_id, content, created_at')
        .single();
      if (createErr || !created) return res.status(500).json({ error: createErr?.message || 'Rasm yuborilmadi' });
      await supabase.from('support_chats').update({ updated_at: now, last_message_at: now }).eq('id', chatId);
      return res.status(201).json(created);
    }

    // POST /api/help/chats/:chatId/read
    if (path[0] === 'chats' && path[2] === 'read' && req.method === 'POST') {
      const chatId = Number(path[1]);
      if (!chatId) return res.status(400).json({ error: 'Invalid chat id' });
      if (chatId === -1) return res.status(200).json({ success: true });
      const { data: chat, error: chatErr } = await supabase
        .from('support_chats')
        .select('id, user_id')
        .eq('id', chatId)
        .single();
      if (chatErr || !chat) return res.status(404).json({ error: 'Chat topilmadi' });
      if (Number(chat.user_id) !== userId) return res.status(403).json({ error: 'Ruxsat yo‘q' });
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('support_chats')
        .update({ user_last_read_at: now, updated_at: now })
        .eq('id', chatId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    if (isMissingSupportChatSchemaError(e) && path[0] === 'chats' && path.length === 1 && req.method === 'GET') {
      const { data: lastSupportRows } = await supabase
        .from('support_messages')
        .select('id, message, reply, created_at, answered_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      const last = lastSupportRows?.[0] ?? null;
      const lastMessageAt = last ? String(last.answered_at ?? last.created_at) : null;
      const lastMessageContent = last ? String(last.reply ?? last.message) : null;
      return res.status(200).json([{
        id: -1,
        title: 'Admin',
        status: 'open',
        created_at: new Date(0).toISOString(),
        updated_at: lastMessageAt ?? new Date(0).toISOString(),
        last_message_at: lastMessageAt,
        last_message: lastMessageContent
          ? {
              id: Number(last.id ?? 0),
              content: lastMessageContent,
              sender_type: last?.reply ? 'admin' : 'user',
              created_at: lastMessageAt ?? String(last.created_at),
            }
          : null,
        unread_count: 0,
      }]);
    }
    console.error('[api/help/[...path]]', e instanceof Error ? e.message : e);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './supabase.js';
import { parseBody } from './request.js';
import { buildRequestLogContext, logError } from './logger.js';

// ---------------------------------------------------------------------------
// GET /api/partner/profile — current user's profile
// ---------------------------------------------------------------------------
async function handleGetProfile(userId: number, res: VercelResponse) {
  const { data, error } = await supabase
    .from('partner_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(200).json(data);
}

// ---------------------------------------------------------------------------
// POST /api/partner/profile — create or update profile
// ---------------------------------------------------------------------------
async function handleSaveProfile(userId: number, req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req.body);
  const display_name = String(body.display_name ?? '').trim();
  const age = Number(body.age);
  const gender = String(body.gender ?? '');
  const language_level = String(body.language_level ?? '').trim();
  const goal = String(body.goal ?? '');
  const about = String(body.about ?? '').trim();
  const seeking = String(body.seeking ?? '').trim();

  if (!display_name) return res.status(400).json({ error: 'Ism kiritilmagan' });
  if (!Number.isFinite(age) || age < 10 || age > 99)
    return res.status(400).json({ error: 'Yosh 10-99 orasida bo\'lishi kerak' });
  if (gender !== 'male' && gender !== 'female')
    return res.status(400).json({ error: 'Jins tanlanmagan' });
  if (!language_level)
    return res.status(400).json({ error: 'Til darajasi tanlanmagan' });
  if (goal !== 'work' && goal !== 'conversation')
    return res.status(400).json({ error: 'Maqsad tanlanmagan' });

  const row = {
    user_id: userId,
    display_name,
    age,
    gender,
    language_level,
    goal,
    about,
    seeking,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('partner_profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(200).json(data);
}

// ---------------------------------------------------------------------------
// GET /api/partner/people — list available people
// ---------------------------------------------------------------------------
async function handleGetPeople(userId: number, res: VercelResponse) {
  let query = supabase
    .from('partner_profiles')
    .select('user_id, display_name, age, gender, language_level, goal, about, seeking')
    .order('created_at', { ascending: false })
    .limit(50);

  query = query.neq('user_id', userId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(200).json(data ?? []);
}

// ---------------------------------------------------------------------------
// POST /api/partner/request — send partner request
// ---------------------------------------------------------------------------
async function handleSendRequest(userId: number, req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req.body);
  const receiverId = Number(body.receiver_id);
  if (!Number.isFinite(receiverId) || receiverId === userId)
    return res.status(400).json({ error: 'Noto\'g\'ri foydalanuvchi' });

  const { data: duplicatePending } = await supabase
    .from('partner_requests')
    .select('id')
    .eq('status', 'pending')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
    .maybeSingle();
  if (duplicatePending)
    return res.status(400).json({ error: 'Bu foydalanuvchi bilan faol so\'rov allaqachon mavjud' });

  const { data: duplicateMatch } = await supabase
    .from('partner_matches')
    .select('id')
    .eq('status', 'active')
    .or(`and(user1_id.eq.${userId},user2_id.eq.${receiverId}),and(user1_id.eq.${receiverId},user2_id.eq.${userId})`)
    .maybeSingle();
  if (duplicateMatch)
    return res.status(400).json({ error: 'Siz bu foydalanuvchi bilan allaqachon faol chatdasiz' });

  const { data, error } = await supabase
    .from('partner_requests')
    .insert({ sender_id: userId, receiver_id: receiverId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(201).json(data);
}

// ---------------------------------------------------------------------------
// GET /api/partner/requests/incoming — incoming pending requests
// ---------------------------------------------------------------------------
async function handleIncomingRequests(userId: number, res: VercelResponse) {
  const { data, error } = await supabase
    .from('partner_requests')
    .select('id, sender_id, status, created_at')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });

  const senderIds = (data ?? []).map((r) => r.sender_id);
  let profiles: Record<number, { display_name: string; age: number; language_level: string; goal: string; about: string }> = {};
  if (senderIds.length > 0) {
    const { data: profs } = await supabase
      .from('partner_profiles')
      .select('user_id, display_name, age, language_level, goal, about')
      .in('user_id', senderIds);
    for (const p of profs ?? []) {
      profiles[p.user_id] = p;
    }
  }

  const result = (data ?? []).map((r) => ({
    ...r,
    sender_profile: profiles[r.sender_id] ?? null,
  }));
  return res.status(200).json(result);
}

// ---------------------------------------------------------------------------
// GET /api/partner/requests/outgoing — outgoing pending requests
// ---------------------------------------------------------------------------
async function handleOutgoingRequests(userId: number, res: VercelResponse) {
  const { data, error } = await supabase
    .from('partner_requests')
    .select('id, receiver_id, status, created_at')
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });

  const receiverIds = (data ?? []).map((r) => r.receiver_id);
  const profiles: Record<number, { display_name: string; age: number; language_level: string; goal: string; about: string }> = {};
  if (receiverIds.length > 0) {
    const { data: profs } = await supabase
      .from('partner_profiles')
      .select('user_id, display_name, age, language_level, goal, about')
      .in('user_id', receiverIds);
    for (const p of profs ?? []) {
      profiles[p.user_id] = p;
    }
  }

  const result = (data ?? []).map((r) => ({
    ...r,
    receiver_profile: profiles[r.receiver_id] ?? null,
  }));
  return res.status(200).json(result);
}

// ---------------------------------------------------------------------------
// POST /api/partner/request/:id/accept
// ---------------------------------------------------------------------------
async function handleAcceptRequest(userId: number, requestId: number, res: VercelResponse) {
  const { data: req, error: reqErr } = await supabase
    .from('partner_requests')
    .select('id, sender_id, receiver_id, status')
    .eq('id', requestId)
    .eq('receiver_id', userId)
    .maybeSingle();
  if (reqErr || !req) return res.status(404).json({ error: 'So\'rov topilmadi' });
  if (req.status !== 'pending') return res.status(400).json({ error: 'So\'rov allaqachon javob berilgan' });

  const { data: existingMatch } = await supabase
    .from('partner_matches')
    .select('id')
    .eq('status', 'active')
    .or(`and(user1_id.eq.${req.sender_id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${req.sender_id})`)
    .maybeSingle();
  if (existingMatch) {
    return res.status(400).json({ error: 'Siz bu foydalanuvchi bilan allaqachon faol chatdasiz' });
  }

  const { data: match, error: matchErr } = await supabase
    .from('partner_matches')
    .insert({ user1_id: req.sender_id, user2_id: userId })
    .select()
    .single();
  if (matchErr) {
    if ((matchErr as { code?: string }).code === '23505') {
      return res.status(400).json({
        error: 'Bu sherik bilan chat allaqachon mavjud yoki eski bitta-chat cheklovi hali olingan emas',
      });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }

  const { error: updateErr } = await supabase
    .from('partner_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending');
  if (updateErr) {
    await supabase.from('partner_matches').delete().eq('id', match.id);
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
  return res.status(200).json(match);
}

// ---------------------------------------------------------------------------
// POST /api/partner/request/:id/reject
// ---------------------------------------------------------------------------
async function handleRejectRequest(userId: number, requestId: number, res: VercelResponse) {
  const { data: req, error: reqErr } = await supabase
    .from('partner_requests')
    .select('id, receiver_id, status')
    .eq('id', requestId)
    .eq('receiver_id', userId)
    .maybeSingle();
  if (reqErr || !req) return res.status(404).json({ error: 'So\'rov topilmadi' });
  if (req.status !== 'pending') return res.status(400).json({ error: 'So\'rov allaqachon javob berilgan' });

  const { error } = await supabase
    .from('partner_requests')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(200).json({ success: true });
}

// ---------------------------------------------------------------------------
// POST /api/partner/request/:id/cancel
// ---------------------------------------------------------------------------
async function handleCancelOwnRequest(userId: number, requestId: number, res: VercelResponse) {
  const { data: req, error: reqErr } = await supabase
    .from('partner_requests')
    .select('id, sender_id, status')
    .eq('id', requestId)
    .eq('sender_id', userId)
    .maybeSingle();
  if (reqErr || !req) return res.status(404).json({ error: 'So\'rov topilmadi' });
  if (req.status !== 'pending') return res.status(400).json({ error: 'So\'rov allaqachon yakunlangan' });

  const { error } = await supabase
    .from('partner_requests')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(200).json({ success: true });
}

// ---------------------------------------------------------------------------
// GET /api/partner/match — current active match + partner profile
// ---------------------------------------------------------------------------
async function handleGetMatch(userId: number, res: VercelResponse) {
  const { data: match, error } = await supabase
    .from('partner_matches')
    .select('id, user1_id, user2_id, status, matched_at')
    .eq('status', 'active')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('matched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  if (!match) return res.status(200).json(null);

  const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;
  const { data: profile } = await supabase
    .from('partner_profiles')
    .select('user_id, display_name, age, gender, language_level, goal, about')
    .eq('user_id', partnerId)
    .maybeSingle();

  return res.status(200).json({ ...match, partner_profile: profile });
}

// ---------------------------------------------------------------------------
// POST /api/partner/match/end — end partnership
// ---------------------------------------------------------------------------
async function handleEndMatch(userId: number, req: VercelRequest, res: VercelResponse) {
  const matchId = Number(req.query.id);
  if (!Number.isFinite(matchId)) {
    return res.status(400).json({ error: 'id kerak' });
  }

  const { data: match } = await supabase
    .from('partner_matches')
    .select('id, user1_id, user2_id')
    .eq('id', matchId)
    .eq('status', 'active')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();
  if (!match) return res.status(404).json({ error: 'Faol juftlik topilmadi' });

  const { error } = await supabase
    .from('partner_matches')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', match.id);
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(200).json({ success: true });
}

// ---------------------------------------------------------------------------
// GET /api/partner/messages?match_id=...&before=...
// ---------------------------------------------------------------------------
async function handleGetMessages(userId: number, req: VercelRequest, res: VercelResponse) {
  const matchId = Number(req.query.match_id);
  if (!Number.isFinite(matchId)) return res.status(400).json({ error: 'match_id kerak' });

  const { data: match } = await supabase
    .from('partner_matches')
    .select('id, user1_id, user2_id')
    .eq('id', matchId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();
  if (!match) return res.status(403).json({ error: 'Ruxsat yo\'q' });

  let query = supabase
    .from('chat_messages')
    .select('id, match_id, sender_id, content, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(50);

  const before = req.query.before;
  if (typeof before === 'string' && before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(200).json((data ?? []).reverse());
}

// ---------------------------------------------------------------------------
// POST /api/partner/messages — send message
// ---------------------------------------------------------------------------
async function handleSendMessage(userId: number, req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req.body);
  const matchId = Number(body.match_id);
  const content = String(body.content ?? '').trim();

  if (!Number.isFinite(matchId)) return res.status(400).json({ error: 'match_id kerak' });
  if (!content || content.length > 2000) return res.status(400).json({ error: 'Xabar bo\'sh yoki juda uzun' });

  const { data: match } = await supabase
    .from('partner_matches')
    .select('id, user1_id, user2_id, status')
    .eq('id', matchId)
    .eq('status', 'active')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();
  if (!match) return res.status(403).json({ error: 'Ruxsat yo\'q' });

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ match_id: matchId, sender_id: userId, content })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });
  return res.status(201).json(data);
}

// ---------------------------------------------------------------------------
// GET /api/partner/status — aggregated status for the main page state machine
// ---------------------------------------------------------------------------
async function handleGetStatus(userId: number, res: VercelResponse) {
  const [profileRes, matchesRes, outgoingRes, incomingRes] = await Promise.all([
    supabase.from('partner_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('partner_matches').select('id, user1_id, user2_id, matched_at')
      .eq('status', 'active').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).order('matched_at', { ascending: false }),
    supabase.from('partner_requests').select('id, receiver_id, created_at')
      .eq('sender_id', userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
    supabase.from('partner_requests').select('id').eq('receiver_id', userId).eq('status', 'pending'),
  ]);

  const matches = matchesRes.data ?? [];
  const partnerIds = matches.map((m) => (m.user1_id === userId ? m.user2_id : m.user1_id));
  const partnerProfilesById: Record<number, { user_id: number; display_name: string; age: number; gender: string; language_level: string; goal: string; about: string }> = {};
  if (partnerIds.length > 0) {
    const { data } = await supabase.from('partner_profiles')
      .select('user_id, display_name, age, gender, language_level, goal, about')
      .in('user_id', partnerIds);
    for (const profile of data ?? []) {
      partnerProfilesById[profile.user_id] = profile;
    }
  }

  const outgoingRequests = outgoingRes.data ?? [];
  const outgoingReceiverIds = outgoingRequests.map((r) => r.receiver_id);
  const outgoingProfilesById: Record<number, { user_id: number; display_name: string; age: number; gender: string; language_level: string; goal: string; about: string } | null> = {};
  if (outgoingReceiverIds.length > 0) {
    const { data } = await supabase
      .from('partner_profiles')
      .select('user_id, display_name, age, gender, language_level, goal, about')
      .in('user_id', outgoingReceiverIds);
    for (const profile of data ?? []) {
      outgoingProfilesById[profile.user_id] = profile;
    }
  }

  return res.status(200).json({
    hasProfile: !!profileRes.data,
    matches: matches.map((match) => {
      const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;
      return { ...match, partner_profile: partnerProfilesById[partnerId] ?? null };
    }),
    outgoingRequests: outgoingRequests.map((request) => ({
      ...request,
      receiver_profile: outgoingProfilesById[request.receiver_id] ?? null,
    })),
    outgoingRequestsCount: outgoingRequests.length,
    incomingRequestsCount: (incomingRes.data ?? []).length,
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export async function routePartnerRequest(
  req: VercelRequest,
  res: VercelResponse,
  userId: number,
  segments: string[]
) {
  try {
    const s0 = segments[0];
    const s1 = segments[1];
    const s2 = segments[2];

    if (s0 === 'profile') {
      if (req.method === 'GET') return handleGetProfile(userId, res);
      if (req.method === 'POST') return handleSaveProfile(userId, req, res);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (s0 === 'people' && req.method === 'GET') {
      return handleGetPeople(userId, res);
    }

    if (s0 === 'request' && !s1 && req.method === 'POST') {
      return handleSendRequest(userId, req, res);
    }

    if ((s0 === 'requests' && s1 === 'incoming' || s0 === 'incoming-requests') && req.method === 'GET') {
      return handleIncomingRequests(userId, res);
    }

    if ((s0 === 'requests' && s1 === 'outgoing' || s0 === 'outgoing-requests') && req.method === 'GET') {
      return handleOutgoingRequests(userId, res);
    }

    if (s0 === 'request' && s1 && s2 === 'accept' && req.method === 'POST') {
      return handleAcceptRequest(userId, Number(s1), res);
    }

    if (s0 === 'accept-request' && req.method === 'POST') {
      return handleAcceptRequest(userId, Number(req.query.id), res);
    }

    if (s0 === 'request' && s1 && s2 === 'reject' && req.method === 'POST') {
      return handleRejectRequest(userId, Number(s1), res);
    }

    if (s0 === 'request' && s1 && s2 === 'cancel' && req.method === 'POST') {
      return handleCancelOwnRequest(userId, Number(s1), res);
    }

    if (s0 === 'reject-request' && req.method === 'POST') {
      return handleRejectRequest(userId, Number(req.query.id), res);
    }

    if (s0 === 'cancel-request' && req.method === 'POST') {
      return handleCancelOwnRequest(userId, Number(req.query.id), res);
    }

    if (s0 === 'match' && !s1 && req.method === 'GET') {
      return handleGetMatch(userId, res);
    }

    if (s0 === 'match' && s1 === 'end' && req.method === 'POST') {
      return handleEndMatch(userId, req, res);
    }

    if (s0 === 'end-match' && req.method === 'POST') {
      return handleEndMatch(userId, req, res);
    }

    if (s0 === 'messages') {
      if (req.method === 'GET') return handleGetMessages(userId, req, res);
      if (req.method === 'POST') return handleSendMessage(userId, req, res);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (s0 === 'status' && req.method === 'GET') {
      return handleGetStatus(userId, res);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError('api.partner.failed', err, buildRequestLogContext('vercel', req, { segments, userId }));
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
}

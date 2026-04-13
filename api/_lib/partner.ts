import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './supabase.js';
import { parseBody } from './request.js';
import { getAccessInfo } from './subscription.js';
import { buildRequestLogContext, logError } from './logger.js';

async function requireSubscription(userId: number, res: VercelResponse): Promise<boolean> {
  const access = await getAccessInfo(supabase, userId);
  if (!access.subscription_active) {
    res.status(403).json({ error: 'Obuna kerak' });
    return false;
  }
  return true;
}

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
// GET /api/partner/people — list available people (exclude self, matched, pending)
// ---------------------------------------------------------------------------
async function handleGetPeople(userId: number, res: VercelResponse) {
  const { data: activeMatch } = await supabase
    .from('partner_matches')
    .select('id, user1_id, user2_id')
    .eq('status', 'active')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();

  if (activeMatch) {
    return res.status(200).json([]);
  }

  const { data: pendingReqs } = await supabase
    .from('partner_requests')
    .select('sender_id, receiver_id')
    .eq('status', 'pending')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  const excludeIds = new Set<number>([userId]);
  for (const r of pendingReqs ?? []) {
    excludeIds.add(r.sender_id);
    excludeIds.add(r.receiver_id);
  }

  const matchedUserIds = new Set<number>();
  const { data: activeMatches } = await supabase
    .from('partner_matches')
    .select('user1_id, user2_id')
    .eq('status', 'active');
  for (const m of activeMatches ?? []) {
    matchedUserIds.add(m.user1_id);
    matchedUserIds.add(m.user2_id);
  }

  let query = supabase
    .from('partner_profiles')
    .select('user_id, display_name, age, gender, language_level, goal, about, seeking')
    .order('created_at', { ascending: false })
    .limit(50);

  const excludeArr = Array.from(excludeIds);
  if (excludeArr.length > 0) {
    query = query.not('user_id', 'in', `(${excludeArr.join(',')})`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Xatolik yuz berdi' });

  const filtered = (data ?? []).filter((p) => !matchedUserIds.has(p.user_id));
  return res.status(200).json(filtered);
}

// ---------------------------------------------------------------------------
// POST /api/partner/request — send partner request
// ---------------------------------------------------------------------------
async function handleSendRequest(userId: number, req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req.body);
  const receiverId = Number(body.receiver_id);
  if (!Number.isFinite(receiverId) || receiverId === userId)
    return res.status(400).json({ error: 'Noto\'g\'ri foydalanuvchi' });

  const { data: activeMatch } = await supabase
    .from('partner_matches')
    .select('id')
    .eq('status', 'active')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();
  if (activeMatch)
    return res.status(400).json({ error: 'Sizda allaqachon sherik bor' });

  const { data: pending } = await supabase
    .from('partner_requests')
    .select('id')
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .maybeSingle();
  if (pending)
    return res.status(400).json({ error: 'Sizda allaqachon faol so\'rov bor' });

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

  const { error: updateErr } = await supabase
    .from('partner_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId);
  if (updateErr) return res.status(500).json({ error: 'Xatolik yuz berdi' });

  const rejectOthers = supabase
    .from('partner_requests')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('status', 'pending')
    .or(`sender_id.eq.${req.sender_id},sender_id.eq.${userId},receiver_id.eq.${req.sender_id},receiver_id.eq.${userId}`)
    .neq('id', requestId);
  await rejectOthers;

  const { data: match, error: matchErr } = await supabase
    .from('partner_matches')
    .insert({ user1_id: req.sender_id, user2_id: userId })
    .select()
    .single();
  if (matchErr) return res.status(500).json({ error: 'Xatolik yuz berdi' });
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
// GET /api/partner/match — current active match + partner profile
// ---------------------------------------------------------------------------
async function handleGetMatch(userId: number, res: VercelResponse) {
  const { data: match, error } = await supabase
    .from('partner_matches')
    .select('id, user1_id, user2_id, status, matched_at')
    .eq('status', 'active')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
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
async function handleEndMatch(userId: number, res: VercelResponse) {
  const { data: match } = await supabase
    .from('partner_matches')
    .select('id, user1_id, user2_id')
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
  const [profileRes, matchRes, outgoingRes, incomingRes] = await Promise.all([
    supabase.from('partner_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('partner_matches').select('id, user1_id, user2_id, matched_at')
      .eq('status', 'active').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).maybeSingle(),
    supabase.from('partner_requests').select('id, receiver_id, created_at')
      .eq('sender_id', userId).eq('status', 'pending').maybeSingle(),
    supabase.from('partner_requests').select('id').eq('receiver_id', userId).eq('status', 'pending'),
  ]);

  let partnerProfile = null;
  if (matchRes.data) {
    const partnerId = matchRes.data.user1_id === userId ? matchRes.data.user2_id : matchRes.data.user1_id;
    const { data } = await supabase.from('partner_profiles')
      .select('user_id, display_name, age, gender, language_level, goal, about')
      .eq('user_id', partnerId).maybeSingle();
    partnerProfile = data;
  }

  return res.status(200).json({
    hasProfile: !!profileRes.data,
    match: matchRes.data ? { ...matchRes.data, partner_profile: partnerProfile } : null,
    outgoingRequest: outgoingRes.data ?? null,
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
    if (!(await requireSubscription(userId, res))) return;

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

    if (s0 === 'requests' && s1 === 'incoming' && req.method === 'GET') {
      return handleIncomingRequests(userId, res);
    }

    if (s0 === 'request' && s1 && s2 === 'accept' && req.method === 'POST') {
      return handleAcceptRequest(userId, Number(s1), res);
    }

    if (s0 === 'request' && s1 && s2 === 'reject' && req.method === 'POST') {
      return handleRejectRequest(userId, Number(s1), res);
    }

    if (s0 === 'match' && !s1 && req.method === 'GET') {
      return handleGetMatch(userId, res);
    }

    if (s0 === 'match' && s1 === 'end' && req.method === 'POST') {
      return handleEndMatch(userId, res);
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

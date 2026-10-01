/** Isolated DB/payments; user-authorized Gemini narration for trial text only. */
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Pool } from 'pg';
import { createPostgresFacade } from '../../server/lib/postgresFacade';
import { createWelcomeVideoOfferRoutes } from '../../server/routes/welcomeVideoOfferRoutes';
import { fetchDailyCourseDayBundle } from '../../server/services/dailyCourseBundle.service';
import { TRIAL_BOARD_LESSON } from '../../server/data/doskaDarslari';
import { canPurchaseWelcomeVideoOffer } from '../../shared/welcomeVideoOffer';
import { parse } from 'dotenv';
import { darsNutqRejasi, nutqBolaklari } from '../../shared/nutqBolaklari';

process.env.DATABASE_URL = ''; process.env.REDIS_URL = '';
// Restrict the shared voice service to the explicitly authorized Gemini provider.
delete process.env.OPENAI_API_KEY;
delete process.env.SPEECHIFY_API_KEY;
process.env.TTS_RUSCHA_SPEECHIFY = '0';
const voiceEnv = parse(await readFile('.env', 'utf8'));
for (const key of ['GEMINI_API_KEY', 'GEMINI_LIVE_MODEL', 'GEMINI_LIVE_VOICE', 'GEMINI_TTS_MODEL']) {
  if (voiceEnv[key]) process.env[key] = voiceEnv[key];
}
const { speak } = await import('../../server/services/tts.service');
const trialSpeech = new Set([
  ...TRIAL_BOARD_LESSON.bosqichlar.flatMap(stage => darsNutqRejasi(stage).map(part => part.matn)),
  ...nutqBolaklari(TRIAL_BOARD_LESSON.xulosa),
]);
const db = await PGlite.create();
await db.exec(`CREATE TABLE users(id bigint PRIMARY KEY, created_at timestamptz DEFAULT now());
CREATE TABLE payments(id bigint PRIMARY KEY);
INSERT INTO users(id,created_at) VALUES (1,now()-interval '30 days');`);
await db.exec(await readFile('db/migrations/188_welcome_video_bonus_offer.sql','utf8'));
const schemas: Record<string,string> = {
  daily_grammar_topics: 'day_number int, title text, theory_text text',
  daily_grammar_mcqs: 'day_number int, quiz_kind text, sort_order int, question_text text, option_a text, option_b text, option_c text, option_d text, correct_index int',
  daily_grammar_matches: 'day_number int, block_sort_order int, pair_sort_order int, left_text text, right_text text',
  daily_grammar_sentence_arrange: 'day_number int, sort_order int, prompt_lang text, prompt_text text, word_bank text[], answer_ru text',
  daily_vocab_words: 'day_number int, sort_order int, word_uz text, word_ru text',
  daily_phrase_mcqs: 'day_number int, sort_order int, phrase_ru text, option_a text, option_b text, option_c text, option_d text, correct_index int',
  daily_reading_passages: 'day_number int, text_id text, title text, body_ru text',
  daily_reading_lexemes: 'word_ru text, translation_uz text, text_id text, word_ru_normalized text, audio_ru text',
  daily_text_questions: 'day_number int, sort_order int, question_ru text, option_a text, option_b text, option_c text, option_d text, correct_index int',
  daily_practice_prompts: 'day_number int, sort_order int, uz_text text',
  daily_speaking_tasks: 'day_number int, sort_order int, prompt_ru text, prompt_uz text',
};
for (const [table, columns] of Object.entries(schemas)) await db.exec(`CREATE TABLE ${table}(id serial PRIMARY KEY, ${columns})`);
await db.exec(await readFile('db/content/day00_falarus.sql','utf8'));
const facade = createPostgresFacade({query: (sql: string, args?: unknown[]) => db.query(sql,args)} as unknown as Pool);
const app = express(); app.use(express.json());
let paid = false;
let progress: Record<string,unknown>[] = [];
app.get('/preview', (req,res) => {
  paid = req.query.paid === '1';
  const completedDays = req.query.complete === '1' ? 1 : paid ? 14 : 0;
  progress = Array.from({length:completedDays},(_,i)=>({day_number: paid ? i+1 : 0,grammar_1:true,grammar_2:true,grammar_3:true,words_match:true,oqish_done:true,speaking_level:5,suhbat_done:true}));
  res.type('html').send(`<script>localStorage.clear();sessionStorage.clear();localStorage.setItem('token','isolated-preview');location.replace(${JSON.stringify(req.query.complete === '1' ? '/kunlik-reja/kun/0' : '/')})</script>`);
});
app.get('/api/user/me',(_req,res)=>res.json({id:1,firstName:'Sinov',accountType:'student',onboarded:true,onboardingCompleted:true,totalPoints:0}));
app.get('/api/user/access',(_req,res)=>res.json({subscription_active:paid,golden:false}));
app.get('/api/kunlik-progress',(_req,res)=>res.json({rows:progress,practice_prompt_counts:{0:5},speaking_task_counts:{0:6}}));
app.get('/api/daily-course/day/:day',async(req,res)=>{
  if(Number(req.params.day)!==0)return res.status(403).json({error:'Preview contains only day zero'});
  const result=await fetchDailyCourseDayBundle(facade,0);return res.status(result.ok?200:500).json(result.ok?result.bundle:result);
});
app.post('/api/ustoz/dars',(_req,res)=>res.json(TRIAL_BOARD_LESSON));
app.get('/api/tts', async (req, res) => {
  if (req.headers.authorization !== 'Bearer isolated-preview') return res.sendStatus(401);
  const text = typeof req.query.text === 'string' ? req.query.text.trim() : '';
  if (!trialSpeech.has(text)) return res.status(403).json({error:'Only trial narration is available in preview'});
  if (!process.env.GEMINI_API_KEY?.trim()) return res.status(503).json({error:'Local Gemini voice is not configured', code:'PREVIEW_TTS_NOT_CONFIGURED'});
  try {
    const result = await speak(text, { speed: 1, ohang: 'ustoz' });
    return res.type(result.mime).send(result.audio);
  } catch {
    return res.status(503).json({error:'Trial narration is temporarily unavailable'});
  }
});
app.use('/api',createWelcomeVideoOfferRoutes(facade,(req:any,_res,next)=>{req.userId=1;next();}));
app.post('/api/payments/rahmat/create',async(req,res)=>{
  if(req.body.welcome_offer){const r=await db.query<any>('SELECT * FROM welcome_video_offers WHERE user_id=1');if(!r.rows[0]||!canPurchaseWelcomeVideoOffer(r.rows[0]))return res.status(409).json({error:'Offer expired'});}
  // Deliberately no payment provider request and no production invoice.
  return res.json({success:true,payment_id:0,payment_url:'/preview-payment',amount:req.body.welcome_offer?530000:0,currency:'UZS'});
});
app.get('/preview-payment',(_req,res)=>res.type('html').send('<h1>Test checkout</h1><p>No real payment was created.</p>'));
app.get('/api/health',(_req,res)=>res.json({ok:true,isolated:true}));
app.use('/api',(_req,res)=>res.status(404).json({error:'Unavailable in isolated preview'}));
const vite=await createServer({configFile:false,envDir:'/private/tmp/falarus-empty-preview-env',plugins:[react(),tailwindcss()],define:{'import.meta.env.VITE_API_URL':'""'},server:{middlewareMode:true,hmr:false},appType:'spa'});
app.use(vite.middlewares);
app.listen(3002,'127.0.0.1',()=>console.log('Isolated preview: http://localhost:3002/preview'));

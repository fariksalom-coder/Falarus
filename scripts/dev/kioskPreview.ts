/** Isolated local preview. Never loads .env or connects to the production database. */
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { KioskService, type KioskDb } from '../../server/kiosk/service.js';
import type { DbClient } from '../../server/types/dbClient.js';

// Set before dynamically importing modules that configure pools/authentication.
process.env.DATABASE_URL='';process.env.REDIS_URL='';
process.env.ADMIN_JWT_SECRET=randomBytes(32).toString('hex');
const { createKioskRoutes, createAdminKioskRoutes }=await import('../../server/routes/kioskRoutes.js');
const { createAdminAuthMiddleware }=await import('../../server/middleware/adminAuth.js');
const db=await PGlite.create();
await db.exec('CREATE TABLE admins (id BIGINT PRIMARY KEY); INSERT INTO admins VALUES (1);');
await db.exec(await readFile(new URL('../../db/migrations/185_kiosk_quiz.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../db/migrations/186_kiosk_audience.sql',import.meta.url),'utf8'));
let lock=Promise.resolve();
const adapter:KioskDb={query:(sql,args)=>db.query(sql,args),connect:async()=>{const previous=lock;let release!:()=>void;lock=new Promise(resolve=>{release=resolve;});await previous;return {query:(sql,args)=>db.query(sql,args),release};}};
const service=new KioskService(adapter);
const authDb={from:()=>({select:()=>({eq:(_key:string,id:number)=>({maybeSingle:async()=>({data:(await db.query('SELECT id FROM admins WHERE id=$1',[id])).rows[0]??null,error:null})})})})} as unknown as DbClient;
const app=express();app.use(express.json({limit:'20kb'}));
app.use('/api/kiosk',createKioskRoutes(()=>service));
const adminToken=jwt.sign({adminId:1,role:'admin'},process.env.ADMIN_JWT_SECRET,{expiresIn:'4h'});
app.get('/preview-admin',(_req,res)=>res.type('html').send(`<script>localStorage.setItem('adminToken',${JSON.stringify(adminToken)});location.replace('/secure-admin-a9k7x4p2/kiosk')</script>`));
app.use('/api/admin',createAdminAuthMiddleware(authDb));
app.use('/api/admin/kiosk',createAdminKioskRoutes(()=>service));
app.get('/api/admin/dashboard',(_req,res)=>res.json({}));
app.get('/api/admin/help-chats',(_req,res)=>res.json([]));
app.get('/api/health',(_req,res)=>res.json({ok:true,preview:true}));
app.use('/api',(_req,res)=>res.status(404).json({error:'Not part of the isolated kiosk preview'}));
const vite=await createServer({configFile:false,root:process.cwd(),envDir:'/tmp/falarus-kiosk-preview-env',plugins:[react(),tailwindcss()],
  define:{'import.meta.env.VITE_API_URL':'""','import.meta.env.VITE_ADMIN_PATH':'"/secure-admin-a9k7x4p2"'},
  server:{middlewareMode:true,hmr:false},appType:'spa'});
app.use(vite.middlewares);
const port=Number(process.env.KIOSK_PREVIEW_PORT||4175);
app.listen(port,'127.0.0.1',()=>{
  console.log(`Local test: http://127.0.0.1:${port}/test-russkogo`);
  console.log(`Local admin: http://127.0.0.1:${port}/preview-admin`);
  console.log('Isolated in-memory PostgreSQL. Data disappears on restart.');
});

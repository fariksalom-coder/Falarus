import {Router, type RequestHandler} from 'express';
import {pool} from '../lib/db';
import {getAccessInfo} from '../services/subscription.service';
import {DialogueError, DialogueService} from '../situations/service';
import type {DbClient} from '../types/dbClient';

export function createSituationsRoutes(database: DbClient, authenticate: RequestHandler, service = new DialogueService(pool!,async user=>(await getAccessInfo(database,user)).subscription_active)) {
  const r = Router(); r.use(authenticate);
  r.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
  const run = (fn: (req:any,res:any)=>Promise<unknown>): RequestHandler => (req,res,next)=>{Promise.resolve(fn(req,res)).catch(next);};
  const uuid = (v:unknown): v is string => typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
  r.get('/catalog',run(async(req,res)=>res.json(await service.catalog(req.userId))));
  r.post('/sessions',run(async(req,res)=>{
    const {situationId,requestId}=req.body||{};
    if (typeof situationId!=='string' || !/^[a-z-]+-\d{2}$/.test(situationId) || !uuid(requestId)) throw new DialogueError(400,'Vaziyatni tanlang.');
    res.json(await service.start(req.userId,situationId,requestId));
  }));
  r.post('/sessions/:id/answer',run(async(req,res)=>{
    const {position,optionId,requestId}=req.body||{};
    if (!uuid(req.params.id)||!uuid(optionId)||!uuid(requestId)||!Number.isInteger(position)||position<0||position>100) throw new DialogueError(400,'Javobni tanlang.');
    res.json(await service.answer(req.userId,req.params.id,position,optionId,requestId));
  }));
  r.use((err:any,_req:any,res:any,_next:any)=>{
    if (!(err instanceof DialogueError)) console.error('[dialogue]',err);
    res.status(err instanceof DialogueError?err.status:500).json({error:err instanceof DialogueError?err.message:'Suhbat saqlanmadi. Qayta urinib ko‘ring.'});
  });
  return r;
}

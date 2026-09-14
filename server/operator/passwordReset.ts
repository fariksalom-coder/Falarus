import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { transaction, audit, enabled } from './service.js';
import { createIpRateLimitMiddleware } from '../lib/rateLimit.js';
const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function issueOperatorReset(c:PoolClient,userId:number,operatorId:number){
 const user=(await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
 if(!user)throw new Error('Foydalanuvchi topilmadi.');
 const recent=(await c.query("SELECT id FROM operator_password_resets WHERE user_id=$1 AND created_at>now()-interval '15 minutes'",[userId])).rowCount;
 if(recent)throw new Error('Tiklash havolasi yaqinda berilgan. 15 daqiqa kuting.');
 await c.query('UPDATE operator_password_resets SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL',[userId]);
 const token=randomBytes(32).toString('base64url');
 const row=(await c.query("INSERT INTO operator_password_resets(user_id,operator_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes') RETURNING id",[userId,operatorId,digest(token)])).rows[0];
 await audit(c,operatorId,null,userId,'reset_link_issued',{reset:row.id});
 return `https://falarus.uz/operator-reset#token=${token}`;
}
export async function consumeOperatorReset(token:string,password:string){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('Havola yaroqsiz yoki muddati tugagan.');
 if(password.length<12||Buffer.byteLength(password,'utf8')>72||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))throw new Error('Parol kamida 12 belgi, harf va raqamdan iborat bo‘lsin (72 baytgacha).');
 await transaction(async c=>{
  const ref=(await c.query('SELECT user_id FROM operator_password_resets WHERE token_hash=$1',[digest(token)])).rows[0];
  if(!ref)throw new Error('Havola yaroqsiz yoki muddati tugagan.');
  // Same lock order as issue: user, then token. Reissue/consume cannot race.
  await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[ref.user_id]);
  const reset=(await c.query('SELECT * FROM operator_password_resets WHERE token_hash=$1 FOR UPDATE',[digest(token)])).rows[0];
  const active=reset&&(await c.query('SELECT 1 FROM operator_accounts WHERE id=$1 AND active',[reset.operator_id])).rowCount;
  if(!active||reset.consumed_at||+new Date(reset.expires_at)<=Date.now())throw new Error('Havola yaroqsiz yoki muddati tugagan.');
  const hash=await bcrypt.hash(password,12);
  await c.query('UPDATE users SET password=$2 WHERE id=$1',[reset.user_id,hash]);
  await c.query('UPDATE operator_password_resets SET consumed_at=now() WHERE id=$1',[reset.id]);
  await audit(c,reset.operator_id,null,reset.user_id,'reset_link_consumed',{reset:reset.id});
 });
}
export function operatorResetRoutes(){
 const router=Router();
 router.use(createIpRateLimitMiddleware('operator-password-reset',15*60,10));
 router.post('/',async(req,res)=>{
  if(!enabled())return res.status(404).end();
  try{await consumeOperatorReset(String(req.body?.token??''),String(req.body?.password??''));res.json({ok:true});}
  catch(e:any){res.status(400).json({error:e.code?'Parol saqlanmadi. Qayta urinib ko‘ring.':e.message});}
 });return router;
}

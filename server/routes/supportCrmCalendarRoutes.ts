import { Router } from 'express';
import type { Pool } from 'pg';
import { pool } from '../lib/db.js';
import { calendarMonth } from '../../shared/supportCrmCalendar.js';
import { getPremiumActivityCalendar,getStudentActivityCalendar } from '../services/supportCrmCalendar.service.js';

/** Mounted after the existing Support CRM role and active-agent authentication. */
export function createSupportCrmCalendarRoutes(db:Pick<Pool,'query'>|null=pool,now=()=>new Date()) {
  const router=Router();
  router.get('/calendar',async(req,res)=>{
    try {
      const month=calendarMonth(req.query.month,now());
      const cohort=req.query.cohort??'historical';
      if(cohort!=='historical'&&cohort!=='current')return res.status(400).json({error:'Premium guruhini tekshiring.'});
      res.set('Cache-Control','private, no-store');
      res.json(await getPremiumActivityCalendar(month,cohort,db,now()));
    }catch(e){const message=e instanceof Error?e.message:'Kalendar yuklanmadi.';res.status(message.startsWith('Oy ')?400:503).json({error:message});}
  });
  router.get('/users/:id/calendar',async(req,res)=>{
    try {
      const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({error:'Foydalanuvchi noto‘g‘ri.'});
      const month=calendarMonth(req.query.month,now());
      const data=await getStudentActivityCalendar(id,month,db,now());
      if(!data)return res.status(404).json({error:'Foydalanuvchi topilmadi.'});
      res.set('Cache-Control','private, no-store');res.json(data);
    }catch(e){const message=e instanceof Error?e.message:'Kalendar yuklanmadi.';res.status(message.startsWith('Oy ')?400:503).json({error:message});}
  });
  return router;
}

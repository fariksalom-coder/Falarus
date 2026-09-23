import { Router, type Request, type Response, type NextFunction } from 'express';
import { pool } from '../lib/db.js';
import { enforceRateLimit } from '../lib/rateLimit.js';
import { KioskError, KioskService } from '../kiosk/service.js';
const service = () => {
  if (!pool) throw new KioskError(503, 'Тест временно недоступен.');
  return new KioskService(pool);
};
const token = (req: Request) => (req.headers.authorization ?? '').replace(/^Bearer /, '');
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request,res: Response,next: NextFunction) => {
  res.setHeader('Cache-Control','no-store');
  void fn(req,res).catch(error => {
    if (error instanceof KioskError) res.status(error.status).json({ error:error.message });
    else { console.error('[kiosk]',error.message); res.status(503).json({ error:'Сервис временно недоступен. / Xizmat vaqtincha ishlamayapti.' }); }
  });
};
export function createKioskRoutes(getService = service): Router {
  const router=Router();
  router.get('/config',handle(async (_req,res)=>res.json(await getService().config())));
  router.post('/sessions',handle(async(req,res)=>{
    if (!await enforceRateLimit(res,`kiosk:start:${req.ip}`,60,3600)) return;
    return res.json(await getService().start(token(req),req.body));
  }));
  router.get('/session',handle(async(req,res)=>{
    if (!await enforceRateLimit(res,`kiosk:read:${req.ip}`,240,60)) return;
    return res.json(await getService().state(token(req)));
  }));
  router.post('/answer',handle(async(req,res)=>{
    if (!await enforceRateLimit(res,`kiosk:answer:${req.ip}`,240,60)) return;
    return res.json(await getService().answer(token(req),req.body));
  }));
  return router;
}
/** Mounted only AFTER the existing admin authentication middleware. */
export function createAdminKioskRoutes(getService = service): Router {
  const router=Router();
  router.get('/stats',handle(async(req,res)=>res.json(await getService().dashboard({
    days:Number(req.query.days??30),page:Number(req.query.page??1),search:String(req.query.search??''),status:String(req.query.status??'all'),audience:String(req.query.audience??'all'),
  }))));
  router.get('/config',handle(async(_req,res)=>res.json(await getService().config())));
  router.put('/config',handle(async(req,res)=>res.json(await getService().updateConfig(req.body))));
  router.post('/coupons/:id/redeem',handle(async(req,res)=>res.json(await getService().redeem(
    String(req.params.id),(req as Request & {adminId:number}).adminId,req.body.note,
  ))));
  return router;
}

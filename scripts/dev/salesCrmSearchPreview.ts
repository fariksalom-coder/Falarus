/** Temporary local accounts and synthetic leads only, in an isolated in-memory database. */
import express from 'express';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {salesSearchFixture} from '../../tests/fixtures/salesCrmSearchFixture';
process.env.DATABASE_URL='';process.env.SALES_CRM_JWT_SECRET=randomBytes(32).toString('hex');
const {createSalesCrmRoutes}=await import('../../server/routes/salesCrmRoutes');
const {createSalesCrmAuthMiddleware}=await import('../../server/middleware/salesCrmAuth');
const {db,adapter,authDb}=await salesSearchFixture();
const app=express();app.use(express.json());
app.get('/api/sales-crm/me',createSalesCrmAuthMiddleware(authDb),(_req,res)=>res.json({agent:{id:1,login:'search-qa',name:'Search QA',role:'operator'},role:'operator',tasks:{overdue:0,today:0,done_today:0,open_total:0}}));
// Deliberately delay an old query to check stale response handling in the real UI.
app.use('/api/sales-crm/leads',(req,_res,next)=>{if(req.query.q==='Алишер')setTimeout(next,1200);else next();});
app.use('/api/sales-crm',createSalesCrmRoutes(authDb,adapter));
app.use(express.static(path.resolve('dist')));app.get('*',(_req,res)=>res.sendFile(path.resolve('dist/crm.html')));
const server=app.listen(5187,'127.0.0.1',()=>console.log('CRM Search QA: http://127.0.0.1:5187/leads — temporary account search-qa / Temporary-search-123'));
process.on('SIGINT',()=>server.close(()=>void db.close().then(()=>process.exit(0))));

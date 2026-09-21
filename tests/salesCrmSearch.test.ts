import test from 'node:test';
import assert from 'node:assert/strict';
import {salesSearchFixture} from './fixtures/salesCrmSearchFixture';
import {listSalesLeads} from '../server/services/salesCrm.service';
test('temporary operator searches full names, formatted phones and literal characters with scope and pagination',async()=>{
 const {db,adapter}=await salesSearchFixture();
 try{
 const search=(q:string,extra={})=>listSalesLeads({q,scopeOperatorId:1,...extra},adapter);
 for(const q of ['Алишер','Каримов','алишер каримов','  КАРИМОВ   АЛИШЕР  ','+998 (90) 123-45-67','901234567','4567']){const r=await search(q);assert.equal(r.total,1,q);assert.equal(r.items[0].user_id,1,q);}
 for(const q of ['несуществующий','Алишер Саидова',"' OR 1=1 --",'90%'])assert.equal((await search(q)).total,0,q);
 assert.equal((await search('%')).total,1);assert.equal((await search('_')).total,1);
 assert.equal((await search('Abdullayev O‘tkir')).total,1);
 assert.equal((await search('Алишер',{operatorId:2})).total,1,'operator cannot escape scope');
 assert.equal((await listSalesLeads({q:'Алишер'},adapter)).total,2,'admin finds both operators');
 assert.equal((await search('',{pageSize:1,page:2})).items.length,1);
 assert.equal((await search('Каримов',{status:'PAID'})).total,0);
 assert.equal((await search('   ')).total,4);
 }finally{await db.close();}
});

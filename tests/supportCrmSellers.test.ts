import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {loadSaleSellers} from '../server/services/supportCrm.service';
import {runWithSupportCrmScope} from '../server/services/supportCrmScope';

test('Support CRM shows who sold the latest subscription: operator, Rahmat with or without an operator, or manual',async()=>{
 const db=await PGlite.create();
 const adapter={query:async(sql:string,args:any[]=[])=>db.query(sql,args)};
 await db.exec(`CREATE TABLE payments(id bigserial PRIMARY KEY,user_id bigint,status text,product_code text,amount numeric,payment_channel text,approved_at timestamptz,payment_time timestamptz,created_at timestamptz DEFAULT now())`);
 const load=(ids:number[])=>runWithSupportCrmScope(null,()=>loadSaleSellers(ids),adapter as any);

 // Without the operator ledger only payments are used.
 await db.exec(`INSERT INTO payments(user_id,status,amount,payment_channel,approved_at) VALUES(1,'approved',100,'rahmat',now()-interval '1 day'),(2,'approved',100,'manual',now())`);
 let sellers=await load([1,2]);
 assert.equal(sellers.get(1)?.kind,'rahmat');assert.equal(sellers.get(2)?.kind,'manual');

 await db.exec(`CREATE TABLE operator_accounts(id bigserial PRIMARY KEY,name text);
 CREATE TABLE operator_contracts(id bigserial PRIMARY KEY,user_id bigint,operator_id bigint,product_code text DEFAULT 'russian',activated_at timestamptz);
 CREATE TABLE operator_receipts(id bigserial PRIMARY KEY,contract_id bigint,payment_id bigint);
 CREATE TABLE operator_rahmat_sales(payment_id bigint,operator_id bigint);
 INSERT INTO operator_accounts(name) VALUES('Dilnoza'),('Aziz');
 -- 1: Rahmat paid, then renewed through operator Aziz.
 INSERT INTO operator_contracts(user_id,operator_id,activated_at) VALUES(1,2,now());
 -- 3: Rahmat payment that Dilnoza proved with a receipt.
 INSERT INTO payments(id,user_id,status,amount,payment_channel,approved_at) VALUES(10,3,'approved',100,'rahmat',now());
 INSERT INTO operator_rahmat_sales VALUES(10,1);
 -- 4: a 1-sum test, a patent contract and a rejected payment are not sales.
 INSERT INTO payments(user_id,status,amount,payment_channel,approved_at) VALUES(4,'approved',1,'rahmat',now()),(4,'rejected',100,'manual',now());
 INSERT INTO operator_contracts(user_id,operator_id,product_code,activated_at) VALUES(4,1,'patent',now());
 -- 5: a payment created from an operator receipt counts as that operator's contract.
 INSERT INTO operator_contracts(id,user_id,operator_id,activated_at) VALUES(50,5,1,now()-interval '2 days');
 INSERT INTO payments(id,user_id,status,amount,payment_channel,approved_at) VALUES(20,5,'approved',100,'manual',now());
 INSERT INTO operator_receipts(contract_id,payment_id) VALUES(50,20);`);
 sellers=await load([1,2,3,4,5]);
 assert.deepEqual([sellers.get(1)?.kind,sellers.get(1)?.operator_name],['operator','Aziz']);
 assert.equal(sellers.get(2)?.kind,'manual');
 assert.deepEqual([sellers.get(3)?.kind,sellers.get(3)?.operator_name],['operator_rahmat','Dilnoza']);
 assert.equal(sellers.has(4),false);
 assert.deepEqual([sellers.get(5)?.kind,sellers.get(5)?.operator_name],['operator','Dilnoza']);
 await db.close();
});

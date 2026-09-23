import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import type {Pool} from 'pg';
import type {DbClient} from '../../server/types/dbClient';
export async function salesSearchFixture(){
 const db=await PGlite.create();
 await db.exec('CREATE TABLE users(id bigint PRIMARY KEY,first_name text,last_name text,phone text,email text);');
 await db.exec(await readFile('db/migrations/182_sales_crm.sql','utf8'));
 await db.query("INSERT INTO sales_crm_agents(id,login,name,role,password_hash) VALUES(1,'search-qa','Search QA','operator',$1),(2,'other-qa','Other QA','operator',$1)",[await bcrypt.hash('Temporary-search-123',4)]);
 const users=[[1,'Алишер','Каримов','+998 (90) 123-45-67'],[2,'Нодира','Саидова','+998 91 765 43 21'],[3,'Алишер','Каримов','+998 90 123 00 00'],[4,'100%','Test_user','+998 93 222 11 00'],[5,'O‘tkir','Abdullayev','+998 95 777 66 55']];
 for(const [id,first,last,phone] of users){await db.query('INSERT INTO users VALUES($1,$2,$3,$4,NULL)',[id,first,last,phone]);await db.query('INSERT INTO sales_crm_leads(user_id,phone_normalized,assigned_operator_id) VALUES($1,$2,$3)',[id,String(phone).replace(/\D/g,''),id===3?2:1]);}
 const adapter={query:(sql:string,args?:unknown[])=>db.query(sql,args)} as unknown as Pick<Pool,'query'>;
 const authDb={from:(table:string)=>{if(table!=='sales_crm_agents')throw Error('Unexpected auth table');const filters:[string,unknown][]=[];const builder={select:()=>builder,eq:(key:string,value:unknown)=>{if(!['id','login','active'].includes(key))throw Error('Invalid fixture key');filters.push([key,value]);return builder;},maybeSingle:async()=>({data:(await db.query(`SELECT * FROM sales_crm_agents WHERE ${filters.map(([key],i)=>key+'=$'+(i+1)).join(' AND ')}`,filters.map(([,v])=>v))).rows[0]||null,error:null})};return builder;}} as unknown as DbClient;
 return {db,adapter,authDb};
}

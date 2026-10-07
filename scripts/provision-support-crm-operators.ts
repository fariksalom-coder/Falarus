/** Run only during the approved release, with a private credential file outside Git. */
import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import {pool} from '../server/lib/db.js';
import {provisionSupportCrmOperators} from '../server/services/supportCrmOperators.service.js';
const path=process.env.SUPPORT_CRM_OPERATOR_CREDENTIALS;
if(!path)throw new Error('SUPPORT_CRM_OPERATOR_CREDENTIALS must point to the private operator credential JSON');
if(!pool)throw new Error('DATABASE_URL required');
const credentials=JSON.parse(await readFile(path,'utf8')) as {login:string;name:string;password:string}[];
if(credentials.length!==2||credentials.some((entry,index)=>entry.login!==`operator${index+1}`||!/^\d{12}$/.test(entry.password)||!entry.name))throw new Error('Expected operator1 and operator2 with separate 12-digit passwords');
if(credentials[0].password===credentials[1].password)throw new Error('Operator passwords must differ');
const operators=await Promise.all(credentials.map(async entry=>({login:entry.login,name:entry.name,passwordHash:await bcrypt.hash(entry.password,12)})));
const client=await pool.connect();
try{
 await client.query('BEGIN');
 const result=await provisionSupportCrmOperators(client,operators);
 await client.query('COMMIT');
 console.log(JSON.stringify({operators:result}));
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}

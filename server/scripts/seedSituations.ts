import 'dotenv/config';
import {pool} from '../lib/db';
import {seedDialogueContent} from '../situations/content';
if (!pool) throw new Error('DATABASE_URL is required');
const db = await pool.connect();
try {
  await db.query('BEGIN');
  console.log(await seedDialogueContent(db));
  await db.query('COMMIT');
} catch (error) {await db.query('ROLLBACK'); throw error;}
finally {db.release(); await pool.end();}

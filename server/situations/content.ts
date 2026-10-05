import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import type {PoolClient} from 'pg';
import type {Topic, Situation} from '../../shared/situations';

export function loadDialogueContent(): Topic[] {
  const dir = fileURLToPath(new URL('./content/', import.meta.url));
  const catalog = JSON.parse(readFileSync(path.join(dir, 'catalog.json'), 'utf8'));
  const dialogs = new Map<string, any>();
  for (const name of readdirSync(dir).filter(n => n !== 'catalog.json' && n.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
    if (dialogs.has(data.topic)) throw new Error(`Duplicate topic: ${data.topic}`);
    dialogs.set(data.topic, data);
  }
  return catalog.topics.filter((t: any) => dialogs.has(t.slug)).map((t: any) => {
    const source = dialogs.get(t.slug);
    if (source.situations.length !== t.situations.length) throw new Error(`Incomplete topic: ${t.slug}`);
    const scene = t.slug === 'bank' ? 'bank' : ['transport','migration'].includes(t.slug) ? 'airport' : 'street';
    return {
      id: t.slug, titleRu: t.ru, titleUz: t.uz, scene: `scenes/${scene}.svg`,
      color: t.slug === 'bank' ? '#1d4ed8' : '#0f766e', colorSoft: t.slug === 'bank' ? '#dbeafe' : '#ccfbf1',
      situations: source.situations.map((s: any, i: number): Situation => {
        if (s.n !== i + 1 || s.turns.length !== catalog.turn_plan[i]) throw new Error(`Invalid situation: ${t.slug}-${s.n}`);
        const steps = s.turns.map((r: any) => {
          if (![r.p,r.p_uz,r.ok,r.ok_uz].every(v => typeof v === 'string' && v.trim()) || !Array.isArray(r.bad) || r.bad.length !== 2 || !r.bad.every((v: any) => typeof v === 'string' && v.trim()) || new Set([r.ok,...r.bad]).size !== 3) throw new Error(`Invalid answers: ${t.slug}-${s.n}`);
          return {partnerRu:r.p,partnerUz:r.p_uz,correct:r.ok,correctUz:r.ok_uz,wrong:r.bad};
        });
        return {id:`${t.slug}-${String(s.n).padStart(2,'0')}`,titleRu:t.situations[i][0],titleUz:t.situations[i][1],partnerRu:s.partner,partnerUz:'Suhbatdosh',icon:`icons/${t.slug === 'bank' ? 'card' : 'map'}.svg`,avatar:`avatars/${/жен|девуш|бабуш|хозяйк|медсестр/i.test(s.partner) ? 'woman' : 'passerby'}.svg`,steps,closing:null};
      }),
    };
  });
}

export async function seedDialogueContent(db: Pick<PoolClient, 'query'>) {
  const topics = loadDialogueContent();
  for (const [order, topic] of topics.entries()) {
    const {situations, ...metadata} = topic;
    await db.query('INSERT INTO dialogue_topics(id,sort_order,metadata) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET sort_order=excluded.sort_order,metadata=excluded.metadata', [topic.id,order,JSON.stringify(metadata)]);
    for (const [index, situation] of situations.entries()) {
      await db.query('INSERT INTO dialogue_situations(id,topic_id,sort_order,content) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET content=excluded.content,sort_order=excluded.sort_order', [situation.id,topic.id,index,JSON.stringify(situation)]);
    }
  }
  return {topics:topics.length,situations:topics.reduce((n,t)=>n+t.situations.length,0),turns:topics.reduce((n,t)=>n+t.situations.reduce((m,s)=>m+s.steps.length,0),0)};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readPersonalChatBlocks, savePersonalChatBlocks, communityReportText } from '../src/utils/communitySafety';
test('personal blocks survive reopening and are isolated between accounts', () => {
 const map = new Map<string, string>();
 const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k,v); } };
 assert.deepEqual(savePersonalChatBlocks(storage, 42, [7,7,-1,42,8]), [7,8]);
 assert.deepEqual(readPersonalChatBlocks(storage, 42), [7,8]);
 assert.deepEqual(readPersonalChatBlocks(storage, 43), []);
 savePersonalChatBlocks(storage, 42, [8]); assert.deepEqual(readPersonalChatBlocks(storage,42), [8]);
 map.set('community-blocks:42', 'bad JSON'); assert.deepEqual(readPersonalChatBlocks(storage,42), []);
});
test('blocked storage cannot report success and reports retain moderation identifiers', () => {
 assert.throws(() => savePersonalChatBlocks({ setItem() { throw Error('storage unavailable'); } }, 42,[7]));
 const message = { id: 123, sender_name: 'User', sender_user_id: 7, created_at: '2026-10-07', content: 'x'.repeat(10000) };
 const report = communityReportText(message, 'Spam');
 assert.ok(report.includes('Xabar ID: 123') && report.includes('(ID: 7)') && report.includes('Sabab: Spam'));
 assert.ok(report.length < 2000);
 assert.throws(() => communityReportText(message, ' '));
});

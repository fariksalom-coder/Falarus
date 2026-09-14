import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ovozFormati } from '../shared/audioFormat';

test('Safari MP4 bytes override a stale WebM MIME type', () => {
  const bytes = Buffer.alloc(32);
  bytes.write('ftypM4A ', 4);
  assert.deepEqual(ovozFormati(bytes, 'audio/webm'), { ok: true, kengaytma: 'mp4' });
});

test('ADTS AAC is rejected rather than sent as an MP3', () => {
  for (const second of [0xf1, 0xf9]) {
    const bytes = Buffer.alloc(32);
    bytes[0] = 0xff;
    bytes[1] = second;
    assert.deepEqual(ovozFormati(bytes, 'audio/mpeg'), { ok: false, sabab: 'qollanmaydi', nomi: 'AAC' });
  }
});

test('MPEG audio without ID3 remains supported', () => {
  const bytes = Buffer.alloc(32);
  bytes[0] = 0xff;
  bytes[1] = 0xfb;
  assert.deepEqual(ovozFormati(bytes), { ok: true, kengaytma: 'mp3' });
});

test('unknown bytes without a supported MIME type are rejected', () => {
  assert.deepEqual(ovozFormati(Buffer.alloc(32), 'application/octet-stream'), { ok: false, sabab: 'notanish' });
});

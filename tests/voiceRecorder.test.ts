import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { useVoiceRecorder, type VoiceRecorderState } from '../src/hooks/useVoiceRecorder';

async function withRecorder(run: (get: () => VoiceRecorderState, controls: {
  resolve: () => void; rejects: (error: unknown) => void; stopped: () => number; recordings: () => number;
}) => Promise<void>) {
  const originals = ['navigator', 'MediaRecorder', 'AudioContext'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  let resolve!: (stream: MediaStream) => void;
  let reject!: (error: unknown) => void;
  const pending = new Promise<MediaStream>((yes, no) => { resolve = yes; reject = no; });
  let stopped = 0, recordings = 0;
  const stream = { getTracks: () => [{ stop: () => { stopped++; } }] } as unknown as MediaStream;
  class Recorder {
    static isTypeSupported(type: string) { return type === 'audio/mp4'; }
    state = 'inactive'; mimeType = 'audio/mp4';
    ondataavailable?: (event: { data: Blob }) => void; onstop?: () => void;
    start() { recordings++; this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['sound'], { type: this.mimeType }) }); this.onstop?.(); }
  }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: () => pending } } });
  Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: Recorder });
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: class { constructor() { throw new Error('no optional meter'); } } });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  let state!: VoiceRecorderState;
  function Probe() { state = useVoiceRecorder(); return null; }
  let renderer: ReturnType<typeof create> | undefined;
  try {
    await act(async () => { renderer = create(React.createElement(Probe)); });
    await run(() => state, { resolve: () => resolve(stream), rejects: reject, stopped: () => stopped, recordings: () => recordings });
  } finally {
    await act(async () => { renderer?.unmount(); });
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; }
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  }
}

test('tap recording uses Safari MP4, survives optional meter failure and releases microphone', async () => {
  await withRecorder(async (get, controls) => {
    let start!: Promise<void>;
    await act(async () => { start = get().startRecording(); });
    assert.equal(get().isStarting, true);
    await act(async () => { controls.resolve(); await start; });
    assert.equal(get().isRecording, true);
    assert.equal(get().isStarting, false);
    await act(async () => { get().stopRecording(); });
    assert.equal(get().isRecording, false);
    assert.equal(get().audioBlob?.type, 'audio/mp4');
    assert.equal(await get().audioBlob?.text(), 'sound');
    assert.equal(controls.stopped(), 1);
  });
});

test('leaving while microphone permission is pending discards late capture', async () => {
  await withRecorder(async (get, controls) => {
    let start!: Promise<void>;
    await act(async () => { start = get().startRecording(); });
    await act(async () => { get().reset(); });
    await act(async () => { controls.resolve(); await start; });
    assert.equal(get().isStarting, false);
    assert.equal(get().isRecording, false);
    assert.equal(get().audioBlob, null);
    assert.equal(controls.recordings(), 0);
    assert.equal(controls.stopped(), 1);
  });
});

test('permission refusal restores microphone button and explains the error', async () => {
  await withRecorder(async (get, controls) => {
    let start!: Promise<void>;
    await act(async () => { start = get().startRecording(); });
    await act(async () => { controls.rejects(new DOMException('Denied', 'NotAllowedError')); await start; });
    assert.equal(get().isStarting, false);
    assert.equal(get().isRecording, false);
    assert.match(get().error!, /Mikrofonga ruxsat berilmadi/);
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportEpisode, probeDuration } from '../src/export.js';
import { reviewEpisode } from '../src/agents.js';
import { createApp } from '../src/server.js';

test('Echter Export: mp4 mit passender Länge (ffmpeg)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zero-'));
  const out = await exportEpisode({ sceneCount: 3, durationSeconds: 6, outPath: join(dir, 'a.mp4') });
  assert.ok((await stat(out.file)).size > 1000);
  const seconds = await probeDuration(out.file);
  assert.ok(Math.abs(seconds - 6) < 0.6, `Länge ${seconds}`);
});

test('Export lehnt mehr als 60 Sekunden ab', async () => {
  await assert.rejects(exportEpisode({ sceneCount: 2, durationSeconds: 61, outPath: '/tmp/x.mp4' }));
});

test('Kontinuitäts-Agent findet geänderte Kleidung', () => {
  const review = reviewEpisode({
    sceneHistories: {
      's:1': [
        { version: 1, environment: 'Zimmer', outfit: 'Lederjacke' },
        { version: 2, environment: 'Zimmer', outfit: 'rotes Hemd' },
      ],
    },
    exportInfo: { file: 'x.mp4', seconds: 10 },
    sceneCount: 1,
    targetSeconds: 10,
  });
  assert.equal(review.ok, false);
  assert.match(review.findings[0].message, /outfit/);
});

test('Gesamte Folge: Video wird real erzeugt, geprüft und ausgeliefert', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'zero-srv-'));
  const server = createApp({ outDir });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  try {
    const res = await fetch(`${base}/api/episodes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'F1', durationSeconds: 6, idea: 'x' }),
    });
    const ep = await res.json();
    assert.equal(ep.status, 'done');
    assert.equal(ep.steps.review.result.ok, true);
    const video = await fetch(`${base}/api/episodes/${ep.id}/video`);
    assert.equal(video.status, 200);
    assert.equal(video.headers.get('content-type'), 'video/mp4');
    assert.ok((await video.arrayBuffer()).byteLength > 1000);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

async function withServer(fn) {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://localhost:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('Folge produzieren und einzelne Szene neu erstellen', async () => {
  await withServer(async (base) => {
    const res = await post(`${base}/api/episodes`, { title: 'Folge 1', durationSeconds: 60, idea: 'Mystery' });
    assert.equal(res.status, 201);
    const ep = await res.json();
    assert.equal(ep.status, 'done');
    assert.equal(ep.scenes.length, 3);
    assert.equal(ep.steps.export.result.stub, true, 'Export ist ausdrücklich ein Platzhalter');

    const regen = await post(`${base}/api/episodes/${ep.id}/scenes/2/regenerate`, { mood: 'nervös' });
    assert.equal(regen.status, 200);
    const after = await (await fetch(`${base}/api/episodes/${ep.id}`)).json();
    assert.equal(after.scenes[1].version, 2);
    assert.equal(after.scenes[0].version, 1);
    assert.equal(after.scenes[2].version, 1);
  });
});

test('Mehr als 60 Sekunden wird abgelehnt', async () => {
  await withServer(async (base) => {
    const res = await post(`${base}/api/episodes`, { title: 'Zu lang', durationSeconds: 61 });
    assert.equal(res.status, 400);
  });
});

test('Startseite wird ausgeliefert', async () => {
  await withServer(async (base) => {
    const res = await fetch(base);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Platzhalter-Modus/);
  });
});

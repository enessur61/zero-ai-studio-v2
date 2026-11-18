import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORY,
  ProviderRegistry,
  CostGuard,
  MemoryStore,
  runEpisode,
  validateBrief,
} from '../src/index.js';

const brief = { title: 'Mystery-Serie Folge 1', durationSeconds: 60 };

function makeGuard() {
  const registry = new ProviderRegistry()
    .register({ id: 'oss-video', kind: 'video', category: CATEGORY.OPEN_SOURCE_FREE })
    .register({ id: 'paid-video', kind: 'video', category: CATEGORY.PAID });
  return new CostGuard({ registry });
}

test('Brief: maximal 60 Sekunden', () => {
  assert.doesNotThrow(() => validateBrief(brief));
  assert.throws(() => validateBrief({ ...brief, durationSeconds: 61 }));
  assert.throws(() => validateBrief({ ...brief, durationSeconds: 0 }));
  assert.throws(() => validateBrief({ title: '', durationSeconds: 10 }));
});

test('Episode läuft alle Schritte durch', async () => {
  const order = [];
  const steps = ['script', 'video', 'edit'].map((id) => ({
    id,
    run: async () => {
      order.push(id);
      return `${id}-ok`;
    },
  }));
  const out = await runEpisode({ brief, steps, store: new MemoryStore(), guard: makeGuard() });
  assert.equal(out.status, 'done');
  assert.deepEqual(order, ['script', 'video', 'edit']);
});

test('Wiederaufnahme wiederholt erfolgreiche Schritte nicht', async () => {
  const store = new MemoryStore();
  const guard = makeGuard();
  const calls = { script: 0, video: 0 };
  let videoShouldFail = true;
  const steps = [
    { id: 'script', run: async () => (calls.script++, 'text') },
    {
      id: 'video',
      run: async () => {
        calls.video++;
        if (videoShouldFail) throw new Error('Modell abgestürzt');
        return 'clip';
      },
    },
  ];

  const first = await runEpisode({ brief, steps, store, guard, maxAttempts: 1 });
  assert.equal(first.status, 'failed');
  assert.equal(first.failedStep, 'video');

  videoShouldFail = false;
  const second = await runEpisode({ brief, steps, store, guard, maxAttempts: 2 });
  assert.equal(second.status, 'done');
  assert.equal(calls.script, 1, 'Drehbuch wurde nicht erneut erzeugt');
  assert.equal(calls.video, 2);
});

test('Kostenpflichtiger Provider stoppt die Produktion, ohne zu laufen', async () => {
  let ran = false;
  const steps = [{ id: 'video', providerId: 'paid-video', run: async () => (ran = true) }];
  const out = await runEpisode({ brief, steps, store: new MemoryStore(), guard: makeGuard() });
  assert.equal(out.status, 'blocked');
  assert.equal(ran, false);
});

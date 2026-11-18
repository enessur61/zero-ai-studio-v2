import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORY, CostBlockedError, ProviderRegistry, CostGuard } from '../src/index.js';

function setup() {
  const registry = new ProviderRegistry()
    .register({ id: 'oss-video', kind: 'video', category: CATEGORY.OPEN_SOURCE_FREE })
    .register({ id: 'local-tts', kind: 'voice', category: CATEGORY.LOCAL_FREE })
    .register({ id: 'trial-video', kind: 'video', category: CATEGORY.FREE_TRIAL })
    .register({ id: 'paid-video', kind: 'video', category: CATEGORY.PAID });
  return new CostGuard({ registry });
}

test('freie und lokale Provider laufen ohne Zustimmung', () => {
  const guard = setup();
  assert.equal(guard.check('oss-video').id, 'oss-video');
  assert.equal(guard.check('local-tts').id, 'local-tts');
});

test('Testkontingent und kostenpflichtig sind ohne Zustimmung gesperrt', () => {
  const guard = setup();
  assert.throws(() => guard.check('trial-video'), CostBlockedError);
  assert.throws(() => guard.check('paid-video'), CostBlockedError);
});

test('unbekannte Provider werden blockiert', () => {
  const guard = setup();
  assert.throws(() => guard.check('versteckt'), CostBlockedError);
});

test('ausdrückliche Zustimmung entsperrt genau diesen Provider', () => {
  const guard = setup();
  guard.approve('trial-video');
  assert.equal(guard.check('trial-video').id, 'trial-video');
  assert.throws(() => guard.check('paid-video'), CostBlockedError);
  guard.revoke('trial-video');
  assert.throws(() => guard.check('trial-video'), CostBlockedError);
});

test('select fällt nie still auf bezahlte Provider zurück', () => {
  const guard = setup();
  assert.equal(guard.select('video', ['paid-video', 'oss-video']).id, 'oss-video');
  assert.throws(() => guard.select('video', ['paid-video', 'trial-video']), CostBlockedError);
});

test('Ledger protokolliert Entscheidungen', () => {
  const guard = setup();
  guard.check('oss-video');
  assert.throws(() => guard.check('paid-video'));
  assert.deepEqual(
    guard.ledger.map((e) => e.decision),
    ['allowed', 'blocked'],
  );
});

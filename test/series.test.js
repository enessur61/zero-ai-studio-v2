import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SeriesMemory } from '../src/series.js';

test('Wissen gilt erst ab der Folge, in der die Figur es erfährt', () => {
  const m = new SeriesMemory();
  m.addCharacter({ id: 'elias', name: 'Elias' });
  m.learn('elias', 'wer ihn verfolgt', 2);
  assert.equal(m.knows('elias', 'wer ihn verfolgt', 1), false);
  assert.equal(m.knows('elias', 'wer ihn verfolgt', 2), true);
  assert.equal(m.knows('elias', 'wer ihn verfolgt', 5), true);
});

test('Szene neu erstellen ändert nur diese Szene und behält gesperrte Felder', () => {
  const m = new SeriesMemory();
  m.addScene('e1:1', { environment: 'Zimmer', outfit: 'schwarze Lederjacke', mood: 'ruhig' });
  m.addScene('e1:2', { environment: 'Flur', outfit: 'schwarze Lederjacke', mood: 'ruhig' });
  const v2 = m.regenerateScene('e1:1', { mood: 'nervös' });
  assert.equal(v2.version, 2);
  assert.equal(v2.mood, 'nervös');
  assert.equal(v2.environment, 'Zimmer');
  assert.equal(v2.outfit, 'schwarze Lederjacke');
  assert.equal(m.scene('e1:2').current.version, 1, 'andere Szene unverändert');
  assert.equal(m.scene('e1:1').versions.length, 2, 'Version 1 bleibt erhalten');
});

test('Unbekannte Szene wirft Fehler', () => {
  assert.throws(() => new SeriesMemory().regenerateScene('x', {}));
});

// Episode end-to-end: Produktionsbrief -> Schritte -> Ergebnis.
// Fehlgeschlagene Schritte werden wieder aufgenommen, erfolgreiche nie wiederholt.

import { readFile, writeFile } from 'node:fs/promises';
import { CostBlockedError } from './safety.js';

export const MAX_SECONDS = 60;

export function validateBrief(brief) {
  if (!brief || typeof brief.title !== 'string' || brief.title.trim() === '') {
    throw new Error('Brief braucht einen Titel');
  }
  const seconds = brief.durationSeconds;
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_SECONDS) {
    throw new Error(`Dauer muss zwischen 1 und ${MAX_SECONDS} Sekunden liegen`);
  }
  return brief;
}

export class MemoryStore {
  #state = null;
  async load() {
    return this.#state ? structuredClone(this.#state) : null;
  }
  async save(state) {
    this.#state = structuredClone(state);
  }
}

export class FileStore {
  constructor(path) {
    this.path = path;
  }
  async load() {
    try {
      return JSON.parse(await readFile(this.path, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
  async save(state) {
    await writeFile(this.path, JSON.stringify(state, null, 2));
  }
}

// steps: [{ id, providerId?, run(ctx) }]. ctx.results enthält frühere Ergebnisse.
export async function runEpisode({ brief, steps, store, guard, maxAttempts = 2 }) {
  validateBrief(brief);
  const state = (await store.load()) ?? { brief, steps: {} };

  for (const step of steps) {
    const entry = (state.steps[step.id] ??= { status: 'pending', attempts: 0 });
    if (entry.status === 'done') continue;

    // Kostenprüfung vor jedem Schritt; blockiert wird nie still umgangen.
    if (step.providerId) {
      try {
        guard.check(step.providerId);
      } catch (error) {
        if (!(error instanceof CostBlockedError)) throw error;
        entry.status = 'blocked';
        entry.error = error.message;
        await store.save(state);
        return { status: 'blocked', failedStep: step.id, state };
      }
    }

    entry.status = 'running';
    let lastError = null;
    while (entry.attempts < maxAttempts) {
      entry.attempts += 1;
      try {
        const results = Object.fromEntries(
          Object.entries(state.steps)
            .filter(([, value]) => value.status === 'done')
            .map(([id, value]) => [id, value.result]),
        );
        entry.result = await step.run({ brief, results });
        entry.status = 'done';
        delete entry.error;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) {
      entry.status = 'failed';
      entry.error = lastError.message;
      await store.save(state);
      return { status: 'failed', failedStep: step.id, state };
    }
    await store.save(state);
  }
  return { status: 'done', state };
}

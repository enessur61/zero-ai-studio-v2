// Phase 1: Kostenkontrolle und Provider-Sperren.
// Regel: Keine kostenpflichtigen Fallbacks, keine versteckten Provider-Aufrufe,
// keine Ausgaben ohne ausdrückliche Zustimmung.

export const CATEGORY = Object.freeze({
  OPEN_SOURCE_FREE: 'open_source_free', // kostenlos und Open Source verfügbar
  LOCAL_FREE: 'local_free', // lokal kostenlos, braucht passende Hardware
  FREE_TRIAL: 'free_trial', // kostenloses Kontingent, kann später Geld kosten
  PAID: 'paid', // kostet Geld
});

// Kategorien werden bewusst nicht vermischt. Nur diese laufen ohne Zustimmung.
const AUTO_ALLOWED = new Set([CATEGORY.OPEN_SOURCE_FREE, CATEGORY.LOCAL_FREE]);

export class CostBlockedError extends Error {
  constructor(message, providerId) {
    super(message);
    this.name = 'CostBlockedError';
    this.providerId = providerId;
  }
}

export class ProviderRegistry {
  #providers = new Map();

  register({ id, kind, category }) {
    if (!id || !kind) throw new Error('Provider braucht id und kind');
    if (!Object.values(CATEGORY).includes(category)) {
      throw new Error(`Unbekannte Kategorie für ${id}: ${category}`);
    }
    this.#providers.set(id, Object.freeze({ id, kind, category }));
    return this;
  }

  get(id) {
    return this.#providers.get(id);
  }

  list() {
    return [...this.#providers.values()];
  }
}

export class CostGuard {
  #registry;
  #approved = new Set();
  #ledger = [];

  constructor({ registry }) {
    if (!registry) throw new Error('CostGuard braucht eine ProviderRegistry');
    this.#registry = registry;
  }

  // Nur durch eine ausdrückliche Entscheidung der Person aufzurufen.
  approve(providerId) {
    if (!this.#registry.get(providerId)) {
      throw new CostBlockedError(`Unbekannter Provider: ${providerId}`, providerId);
    }
    this.#approved.add(providerId);
  }

  revoke(providerId) {
    this.#approved.delete(providerId);
  }

  // Wirft CostBlockedError, wenn der Aufruf nicht erlaubt ist.
  check(providerId) {
    const provider = this.#registry.get(providerId);
    if (!provider) {
      this.#record(providerId, 'blocked', 'unbekannter Provider');
      throw new CostBlockedError(`Unbekannter Provider blockiert: ${providerId}`, providerId);
    }
    if (AUTO_ALLOWED.has(provider.category) || this.#approved.has(providerId)) {
      this.#record(providerId, 'allowed', provider.category);
      return provider;
    }
    this.#record(providerId, 'blocked', provider.category);
    throw new CostBlockedError(
      `${providerId} (${provider.category}) braucht deine ausdrückliche Zustimmung`,
      providerId,
    );
  }

  // Wählt den ersten erlaubten Provider einer Art. Kein stiller Fallback
  // auf nicht erlaubte oder kostenpflichtige Provider.
  select(kind, preferredIds) {
    for (const id of preferredIds) {
      const provider = this.#registry.get(id);
      if (!provider || provider.kind !== kind) continue;
      try {
        return this.check(id);
      } catch (error) {
        if (!(error instanceof CostBlockedError)) throw error;
      }
    }
    throw new CostBlockedError(`Kein erlaubter Provider für ${kind}`, null);
  }

  get ledger() {
    return this.#ledger.map((entry) => ({ ...entry }));
  }

  #record(providerId, decision, reason) {
    this.#ledger.push({ providerId, decision, reason });
  }
}

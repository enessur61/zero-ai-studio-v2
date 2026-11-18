// Seriengedächtnis und Szenen-Versionen.
// Jede Szene hat eigene Versionen; eine Neuerstellung ändert nur diese Szene.
// Gesperrte Felder (Umgebung, Kleidung) bleiben erhalten, außer sie werden ausdrücklich geändert.

export class SeriesMemory {
  #characters = new Map();
  #knowledge = [];
  #scenes = new Map();

  addCharacter({ id, name, look = '', voice = '' }) {
    if (!id || !name) throw new Error('Figur braucht id und name');
    this.#characters.set(id, { id, name, look, voice });
  }

  character(id) {
    return this.#characters.get(id);
  }

  // Wissen mit Zeitpunkt: Eine Figur weiß etwas erst ab der angegebenen Folge.
  learn(characterId, fact, episode) {
    this.#knowledge.push({ characterId, fact, episode });
  }

  knows(characterId, fact, episode) {
    return this.#knowledge.some(
      (k) => k.characterId === characterId && k.fact === fact && k.episode <= episode,
    );
  }

  addScene(sceneKey, data) {
    if (this.#scenes.has(sceneKey)) throw new Error(`Szene existiert bereits: ${sceneKey}`);
    this.#scenes.set(sceneKey, [{ version: 1, ...data }]);
    return 1;
  }

  scene(sceneKey) {
    const versions = this.#scenes.get(sceneKey);
    if (!versions) return null;
    return { current: { ...versions[versions.length - 1] }, versions: versions.map((v) => ({ ...v })) };
  }

  regenerateScene(sceneKey, changes = {}) {
    const versions = this.#scenes.get(sceneKey);
    if (!versions) throw new Error(`Unbekannte Szene: ${sceneKey}`);
    const prev = versions[versions.length - 1];
    const next = { ...prev, ...changes, version: prev.version + 1 };
    versions.push(next);
    return { ...next };
  }
}

// ZERO AGENTS: spezialisierte Prüfer. Jeder Agent gibt Befunde zurück, nichts wird still korrigiert.
import { MAX_SECONDS } from './pipeline.js';

export const agents = {
  // Kontinuität: Gesperrte Felder dürfen sich zwischen Versionen nicht ändern, außer ausdrücklich erlaubt.
  continuity({ sceneHistories, allowedChanges = [] }) {
    const findings = [];
    for (const [sceneKey, versions] of Object.entries(sceneHistories)) {
      for (let i = 1; i < versions.length; i += 1) {
        for (const field of ['environment', 'outfit']) {
          if (versions[i][field] !== versions[i - 1][field] && !allowedChanges.includes(field)) {
            findings.push({
              agent: 'continuity',
              severity: 'error',
              message: `${sceneKey}: ${field} hat sich in v${versions[i].version} geändert`,
            });
          }
        }
      }
    }
    return findings;
  },

  // Qualitätskontrolle: Länge, Szenenanzahl, Export vorhanden.
  quality({ exportInfo, sceneCount, targetSeconds }) {
    const findings = [];
    if (sceneCount < 1) findings.push({ agent: 'quality', severity: 'error', message: 'Keine Szenen' });
    if (!exportInfo?.file) {
      findings.push({ agent: 'quality', severity: 'error', message: 'Kein exportiertes Video' });
    } else {
      if (exportInfo.seconds > MAX_SECONDS + 0.5) {
        findings.push({ agent: 'quality', severity: 'error', message: `Video zu lang: ${exportInfo.seconds}s` });
      }
      if (Math.abs(exportInfo.seconds - targetSeconds) > 1) {
        findings.push({
          agent: 'quality',
          severity: 'warning',
          message: `Länge ${exportInfo.seconds.toFixed(1)}s weicht vom Ziel ${targetSeconds}s ab`,
        });
      }
    }
    return findings;
  },
};

export function reviewEpisode(input) {
  const findings = [...agents.continuity(input), ...agents.quality(input)];
  return { ok: !findings.some((f) => f.severity === 'error'), findings };
}

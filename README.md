# ZERO AI Studio v2

Eine Idee. Ein Auftrag. Eine vollständige Produktion. BEYOND LIMITS.

## Stand (ehrlich)

**Phase 1: Sicherheitsbasis. Umgesetzt und getestet.**

| Baustein | Datei | Status |
|---|---|---|
| Provider-Kategorien (frei, lokal, Testkontingent, bezahlt) | `src/safety.js` | getestet |
| Kostensperre: Testkontingent und bezahlt nur mit ausdrücklicher Zustimmung | `src/safety.js` | getestet |
| Kein stiller Fallback auf bezahlte oder unbekannte Provider | `src/safety.js` | getestet |
| Episoden-Pipeline mit Wiederaufnahme (fertige Schritte laufen nicht erneut) | `src/pipeline.js` | getestet |
| Maximal 60 Sekunden pro Video | `src/pipeline.js` | getestet |

Noch **nicht** vorhanden und nicht als fertig zu betrachten: echte KI-Modelle, Video-Export,
Seriengedächtnis, Szenen-Versionen, Agenten, iPhone-Oberfläche, Datenbank.
Eine funktionierende Episode muss später mit realen Modellen und einem exportierten Video nachgewiesen werden.

## Regeln

- Keine kostenpflichtigen Dienste ohne ausdrückliche Zustimmung.
- Keine Datenbankänderungen, Deployments oder Merges ohne Zustimmung.
- Videos haben maximal 60 Sekunden.
- Nichts gilt als fertig, solange es nicht nachweislich funktioniert.

## Tests

```
npm test
```

Benötigt Node.js 20 oder neuer, keine weiteren Abhängigkeiten.

## Nächste Phasen

2. Episode end-to-end mit realen Modellen
3. Scene Engine (Szenen einzeln erstellen, bearbeiten, versionieren)
4. Continuity Engine (Seriengedächtnis)
5. ZERO Agents
6. iPhone-Oberfläche
7. Qualitätssicherung

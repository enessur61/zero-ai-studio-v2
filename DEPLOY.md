# Deployment (vorbereitet, noch nicht ausgeführt)

Nichts wurde deployt. Du löst es selbst aus.

## Variante A: Render (Docker, kostenloser Tarif)

1. Auf render.com mit GitHub anmelden und "New > Blueprint" wählen.
2. Repo `zero-ai-studio-v2` und den Branch auswählen. Render liest `render.yaml` und baut das `Dockerfile` (mit ffmpeg).
3. Nach dem Start unter Environment den Wert von `ZERO_ACCESS_TOKEN` kopieren.
4. Am iPhone öffnen: `https://<dein-dienst>.onrender.com/?token=<TOKEN>`

## Zu wissen

- Der kostenlose Tarif ist ein Anbieter-Kontingent, das sich ändern kann (Kategorie "Testkontingent"). Prüfe auf der Preisseite, dass nichts berechnet wird, bevor du bestätigst.
- Der Dienst schläft nach Inaktivität ein, der erste Aufruf dauert dann länger.
- Videos und das Seriengedächtnis liegen nur im Arbeitsspeicher beziehungsweise im temporären Speicher und gehen bei einem Neustart verloren.
- Ohne `ZERO_ACCESS_TOKEN` ist die App für alle offen. Immer setzen.
- Das Docker-Image wurde in dieser Umgebung nicht gebaut oder getestet.

## Lokal

`npm start`, dann `http://localhost:3000`. Mit Token: `ZERO_ACCESS_TOKEN=geheim npm start` und `http://localhost:3000/?token=geheim`.

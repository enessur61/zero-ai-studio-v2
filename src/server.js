// Zero-Dependency-Server (node:http). Läuft im PLATZHALTER-MODUS:
// Die Schritte erzeugen keine echten Medien, sondern Platzhalter-Ergebnisse.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { CATEGORY, ProviderRegistry, CostGuard } from './safety.js';
import { MemoryStore, runEpisode, validateBrief } from './pipeline.js';
import { SeriesMemory } from './series.js';

const SCENE_COUNT = 3;

export function createApp({ guard } = {}) {
  if (!guard) {
    const registry = new ProviderRegistry().register({
      id: 'stub-local',
      kind: 'any',
      category: CATEGORY.LOCAL_FREE,
    });
    guard = new CostGuard({ registry });
  }
  const memory = new SeriesMemory();
  const episodes = new Map();

  const buildSteps = (id) => [
    {
      id: 'script',
      providerId: 'stub-local',
      run: async ({ brief }) => ({ stub: true, text: `Drehbuch-Platzhalter: ${brief.idea ?? brief.title}` }),
    },
    {
      id: 'scenes',
      run: async () => {
        for (let n = 1; n <= SCENE_COUNT; n += 1) {
          memory.addScene(`${id}:${n}`, {
            summary: `Szene ${n}`,
            environment: 'unverändert',
            outfit: 'unverändert',
            mood: 'neutral',
          });
        }
        return { count: SCENE_COUNT };
      },
    },
    { id: 'video', providerId: 'stub-local', run: async () => ({ stub: true, clips: SCENE_COUNT }) },
    {
      id: 'export',
      providerId: 'stub-local',
      run: async () => ({ stub: true, file: null, note: 'Kein echtes Video: Platzhalter-Pipeline' }),
    },
  ];

  const view = (id) => {
    const ep = episodes.get(id);
    const scenes = [];
    for (let n = 1; n <= SCENE_COUNT; n += 1) {
      const s = memory.scene(`${id}:${n}`);
      if (s) scenes.push({ n, ...s.current });
    }
    return { id, status: ep.status, steps: ep.state.steps, scenes };
  };

  const send = (res, code, body) => {
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  };

  const readJson = async (req) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    return raw ? JSON.parse(raw) : {};
  };

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;

      if (req.method === 'GET' && path === '/') {
        const html = await readFile(new URL('../public/index.html', import.meta.url));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(html);
      }

      if (req.method === 'POST' && path === '/api/episodes') {
        const brief = validateBrief(await readJson(req));
        const id = randomUUID();
        const store = new MemoryStore();
        const out = await runEpisode({ brief, steps: buildSteps(id), store, guard });
        episodes.set(id, { brief, store, status: out.status, state: out.state });
        return send(res, 201, view(id));
      }

      const episodeMatch = path.match(/^\/api\/episodes\/([\w-]+)$/);
      if (req.method === 'GET' && episodeMatch) {
        if (!episodes.has(episodeMatch[1])) return send(res, 404, { error: 'Folge nicht gefunden' });
        return send(res, 200, view(episodeMatch[1]));
      }

      const sceneMatch = path.match(/^\/api\/episodes\/([\w-]+)\/scenes\/(\d+)\/regenerate$/);
      if (req.method === 'POST' && sceneMatch) {
        const [, id, n] = sceneMatch;
        if (!episodes.has(id)) return send(res, 404, { error: 'Folge nicht gefunden' });
        const { mood, note } = await readJson(req);
        const next = memory.regenerateScene(`${id}:${n}`, { ...(mood ? { mood } : {}), ...(note ? { note } : {}) });
        return send(res, 200, { n: Number(n), ...next });
      }

      return send(res, 404, { error: 'Nicht gefunden' });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => console.log(`ZERO läuft auf http://localhost:${port} (Platzhalter-Modus)`));
}

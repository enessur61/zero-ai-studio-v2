// Echter technischer Export mit ffmpeg: Farbflächen pro Szene + Ton, höchstens 60 Sekunden.
// Hinweis: Das ist ein Test-Export der Pipeline, keine KI-generierten Bilder oder Stimmen.
import { spawn } from 'node:child_process';
import { MAX_SECONDS } from './pipeline.js';

const COLORS = ['0x1B1F3B', '0x3B1B2E', '0x1B3B2F', '0x3B351B', '0x2E1B3B', '0x1B2E3B'];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`${cmd} fehlgeschlagen: ${stderr.slice(-300)}`)),
    );
  });
}

export async function probeDuration(path) {
  const out = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path,
  ]);
  return Number.parseFloat(out);
}

export async function exportEpisode({ sceneCount, durationSeconds, outPath }) {
  if (!Number.isInteger(sceneCount) || sceneCount < 1) throw new Error('Mindestens eine Szene nötig');
  if (!(durationSeconds > 0) || durationSeconds > MAX_SECONDS) {
    throw new Error(`Dauer muss zwischen 1 und ${MAX_SECONDS} Sekunden liegen`);
  }
  const per = durationSeconds / sceneCount;
  const args = ['-y', '-v', 'error'];
  for (let i = 0; i < sceneCount; i += 1) {
    args.push('-f', 'lavfi', '-i', `color=c=${COLORS[i % COLORS.length]}:s=360x640:r=24:d=${per}`);
  }
  args.push('-f', 'lavfi', '-i', `sine=frequency=220:duration=${durationSeconds}`);
  const inputs = Array.from({ length: sceneCount }, (_, i) => `[${i}:v]`).join('');
  args.push(
    '-filter_complex', `${inputs}concat=n=${sceneCount}:v=1:a=0[v]`,
    '-map', '[v]', '-map', `${sceneCount}:a`,
    '-c:v', 'mpeg4', '-q:v', '5', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    '-t', String(durationSeconds), outPath,
  );
  await run('ffmpeg', args);
  const seconds = await probeDuration(outPath);
  return { file: outPath, seconds, note: 'Technischer Test-Export (Farbflächen und Testton), keine KI-Medien' };
}

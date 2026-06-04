import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Resolve built Vite output regardless of process cwd on Render. */
export function resolveClientDist(): string {
  const candidates = [
    path.join(__dirname, '../../client/dist'),
    path.join(process.cwd(), 'client/dist'),
    path.join(process.cwd(), '../client/dist'),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return candidates[0];
}

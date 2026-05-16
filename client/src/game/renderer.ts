import { GameSnapshot, TILE_SIZE } from '../../../shared/gameTypes';
import { FruitKind } from '../../../shared/fruits';
import { MAZE_COLS, MAZE_ROWS } from '../../../shared/maze';

const PELLET_COLOR = '#ffb8ae';

const FRUIT_SPRITE_PATHS: Record<FruitKind, string> = {
  cherry: '/cherry.svg',
  orange: '/orange.svg',
  apple: '/apple.svg',
  lemon: '/lemon.svg',
};

let mazeBg: HTMLImageElement | null = null;
let bgLoadStarted = false;
const fruitSprites: Partial<Record<FruitKind, HTMLImageElement>> = {};
const fruitLoadStarted = new Set<FruitKind>();

function getMazeBackground(): HTMLImageElement | null {
  if (mazeBg?.complete) return mazeBg;
  if (!bgLoadStarted) {
    bgLoadStarted = true;
    mazeBg = new Image();
    mazeBg.src = '/maze-bg.png';
  }
  return mazeBg?.complete ? mazeBg : null;
}

function getFruitSprite(kind: FruitKind): HTMLImageElement | null {
  const cached = fruitSprites[kind];
  if (cached?.complete) return cached;
  if (!fruitLoadStarted.has(kind)) {
    fruitLoadStarted.add(kind);
    const img = new Image();
    img.src = FRUIT_SPRITE_PATHS[kind];
    fruitSprites[kind] = img;
  }
  const img = fruitSprites[kind];
  return img?.complete ? img : null;
}

export function renderGame(ctx: CanvasRenderingContext2D, snap: GameSnapshot, width: number, height: number) {
  const canvasW = MAZE_COLS * TILE_SIZE;
  const canvasH = MAZE_ROWS * TILE_SIZE;
  const scale = Math.min(width / canvasW, height / canvasH) * 0.98;
  const offsetX = (width - canvasW * scale) / 2;
  const offsetY = (height - canvasH * scale) / 2;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  const bg = getMazeBackground();
  if (bg) {
    ctx.drawImage(bg, 0, 0, canvasW, canvasH);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  drawPellets(ctx, snap);
  drawFruit(ctx, snap);
  drawPlayers(ctx, snap);

  ctx.restore();
}

function drawPellets(ctx: CanvasRenderingContext2D, snap: GameSnapshot) {
  const ts = TILE_SIZE;
  ctx.fillStyle = PELLET_COLOR;
  for (let row = 0; row < MAZE_ROWS; row++) {
    for (let col = 0; col < MAZE_COLS; col++) {
      const cx = col * ts + ts / 2;
      const cy = row * ts + ts / 2;
      if (snap.pellets[row]?.[col]) {
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      }
      if (snap.powerPellets[row]?.[col]) {
        ctx.beginPath();
        ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawFruit(ctx: CanvasRenderingContext2D, snap: GameSnapshot) {
  if (!snap.fruit) return;
  const ts = TILE_SIZE;
  const cx = snap.fruit.col * ts + ts / 2;
  const cy = snap.fruit.row * ts + ts / 2;
  const pulse = 1 + Math.sin(snap.tick / 6) * 0.06;
  const size = ts * 1.35 * pulse;

  const sprite = getFruitSprite(snap.fruit.kind);
  if (sprite) {
    ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size);
    return;
  }

  drawFruitFallback(ctx, snap.fruit.kind, cx, cy, pulse);
}

function drawFruitFallback(
  ctx: CanvasRenderingContext2D,
  kind: FruitKind,
  cx: number,
  cy: number,
  pulse: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);

  if (kind === 'cherry') {
    ctx.strokeStyle = '#228800';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.quadraticCurveTo(0, -14, 8, -10);
    ctx.stroke();
    ctx.fillStyle = '#ff4444';
    ctx.strokeStyle = '#660000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-5, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(5, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'orange') {
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'apple') {
    ctx.fillStyle = '#44cc22';
    ctx.beginPath();
    ctx.arc(0, 1, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#dddd22';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayers(ctx: CanvasRenderingContext2D, snap: GameSnapshot) {
  const t = snap.tick / 8;
  const now = Date.now();
  for (const p of snap.players) {
    const x = p.x * TILE_SIZE;
    const y = p.y * TILE_SIZE;
    const isPac = p.id === snap.pacmanId && p.role === 'pacman';

    ctx.globalAlpha = p.respawnUntil > now ? 0.4 : 1;

    if (isPac && p.speedBoostUntil > now) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(t * 2) * 0.15;
      ctx.fillStyle = '#fff59d';
      ctx.beginPath();
      ctx.arc(x, y, TILE_SIZE * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (isPac) {
      drawPacman(ctx, x, y, p.dir, t, p.color);
    } else {
      drawGhost(ctx, x, y, p.color);
    }
    ctx.globalAlpha = 1;
  }
}

function drawPacman(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: string,
  t: number,
  color: string
) {
  let rot = 0;
  if (dir === 'right') rot = 0;
  else if (dir === 'left') rot = Math.PI;
  else if (dir === 'up') rot = -Math.PI / 2;
  else if (dir === 'down') rot = Math.PI / 2;

  const mouth = 0.35 + Math.sin(t) * 0.1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, TILE_SIZE * 0.42, mouth, Math.PI * 2 - mouth);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGhost(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  const r = TILE_SIZE * 0.4;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 2, r, Math.PI, 0);
  ctx.lineTo(x + r, y + r * 0.55);
  for (let i = 0; i < 4; i++) {
    const bx = x + r - (i * (2 * r)) / 3;
    ctx.lineTo(bx, y + r * 0.55 + (i % 2 === 0 ? 3 : 0));
  }
  ctx.lineTo(x - r, y + r * 0.55);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - 5, y - 2, 4.5, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 2, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2121ff';
  ctx.beginPath();
  ctx.arc(x - 5, y - 2, 2, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

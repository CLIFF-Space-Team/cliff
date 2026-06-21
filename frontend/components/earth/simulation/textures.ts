/**
 * Procedurally-generated canvas textures shared across simulators.
 *
 * Generating sprites in code (no asset files) keeps the bundle small,
 * lets every scene tint its own copy, and survives offline. Each texture
 * is cached after first creation — Three.js handles the GPU upload.
 */

import * as THREE from 'three';

let _fire: THREE.Texture | null = null;
let _smoke: THREE.Texture | null = null;
let _ember: THREE.Texture | null = null;
let _lava: THREE.Texture | null = null;
let _cloud: THREE.Texture | null = null;
let _rainStreak: THREE.Texture | null = null;
let _foam: THREE.Texture | null = null;
let _splash: THREE.Texture | null = null;

function canvas(size = 128): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas-2d-unavailable');
  return { c, ctx };
}

/** Soft yellow→orange→red→transparent radial — billboard flame core. */
export function fireTexture(): THREE.Texture {
  if (_fire) return _fire;
  const { c, ctx } = canvas(128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0.0, 'rgba(255,255,220,1)');
  g.addColorStop(0.18, 'rgba(255,210,90,0.95)');
  g.addColorStop(0.42, 'rgba(255,120,30,0.7)');
  g.addColorStop(0.7, 'rgba(180,40,12,0.28)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _fire = t;
  return t;
}

/** Sooty grey radial with longer fade — billowing smoke billboards. */
export function smokeTexture(): THREE.Texture {
  if (_smoke) return _smoke;
  const { c, ctx } = canvas(128);
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0.0, 'rgba(80,76,68,0.85)');
  g.addColorStop(0.4, 'rgba(50,46,40,0.55)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  // Sprinkle a touch of noise so two stacked sprites don't read as one ring.
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(${Math.random() * 40 + 30},${Math.random() * 40 + 30},${
      Math.random() * 40 + 25
    },${Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 128, Math.random() * 128, 6 + Math.random() * 14, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _smoke = t;
  return t;
}

/** Bright pinpoint ember spark — white-hot core with red halo. */
export function emberTexture(): THREE.Texture {
  if (_ember) return _ember;
  const { c, ctx } = canvas(64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0.0, 'rgba(255,255,210,1)');
  g.addColorStop(0.35, 'rgba(255,150,40,0.7)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _ember = t;
  return t;
}

/** Bright orange/yellow with cracked-flow striping — animated lava skin. */
export function lavaTexture(): THREE.Texture {
  if (_lava) return _lava;
  const { c, ctx } = canvas(256);
  // Base hot orange.
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#fff39a');
  g.addColorStop(0.3, '#ff8a1a');
  g.addColorStop(0.7, '#c1280a');
  g.addColorStop(1, '#5a0e04');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  // Cracked-crust streaks — black veins.
  ctx.strokeStyle = 'rgba(20,8,4,0.65)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 28; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 256, Math.random() * 256);
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    for (let s = 0; s < 6; s++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Glowing speckles — bright pixels.
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(255,${200 + Math.random() * 55},${80 + Math.random() * 80},${0.4 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 0.6 + Math.random() * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  _lava = t;
  return t;
}

/** Soft white cloud puff — storm spiral arms + ash plume. */
export function cloudTexture(): THREE.Texture {
  if (_cloud) return _cloud;
  const { c, ctx } = canvas(128);
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  g.addColorStop(0.0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(220,224,235,0.45)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  // Cellular highlights for extra texture
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.arc(20 + Math.random() * 88, 20 + Math.random() * 88, 8 + Math.random() * 18, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _cloud = t;
  return t;
}

/** Vertical streak — single rain drop motion-blurred. */
export function rainStreakTexture(): THREE.Texture {
  if (_rainStreak) return _rainStreak;
  const { c, ctx } = canvas(32);
  const g = ctx.createLinearGradient(16, 0, 16, 32);
  g.addColorStop(0.0, 'rgba(180,210,255,0)');
  g.addColorStop(0.45, 'rgba(180,210,255,0.85)');
  g.addColorStop(0.8, 'rgba(220,235,255,1)');
  g.addColorStop(1.0, 'rgba(180,210,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(14, 0, 4, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _rainStreak = t;
  return t;
}

/** White foam puff — water surface foam edges. */
export function foamTexture(): THREE.Texture {
  if (_foam) return _foam;
  const { c, ctx } = canvas(96);
  const g = ctx.createRadialGradient(48, 48, 4, 48, 48, 46);
  g.addColorStop(0.0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.6, 'rgba(220,235,255,0.4)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _foam = t;
  return t;
}

/** Splash droplet — flood/storm water spray. */
export function splashTexture(): THREE.Texture {
  if (_splash) return _splash;
  const { c, ctx } = canvas(48);
  const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 22);
  g.addColorStop(0.0, 'rgba(220,240,255,1)');
  g.addColorStop(0.5, 'rgba(160,200,240,0.45)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 48, 48);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  _splash = t;
  return t;
}

import { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';

const DEFAULT_MORTAR_COLOR = '#8e7e6c';

function seededRand(id) {
  let s = String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 17);
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xFFFFFFFF; };
}

function drawTexture(ctx, x, y, w, h, id) {
  const r = seededRand(id);
  ctx.save();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // 1. Diagonal color wash — each brick has a unique warm/cool tint
  const hShift = (r() - 0.5) * 22;
  const lShift = (r() - 0.5) * 18;
  const wash = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  wash.addColorStop(0, `hsla(${18 + hShift}, 45%, ${52 + lShift}%, 0.22)`);
  wash.addColorStop(0.5, `hsla(${28 + hShift}, 38%, ${48 + lShift}%, 0.10)`);
  wash.addColorStop(1, `hsla(${12 + hShift}, 50%, ${44 + lShift}%, 0.18)`);
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);

  // 2. Fine stipple — scattered mineral flecks (dense, pixel-level)
  const nDots = Math.floor(w * h * 0.018) + 8;
  for (let i = 0; i < nDots; i++) {
    const dx = x + r() * w;
    const dy = y + r() * h;
    const dark = r() > 0.52;
    const alpha = 0.04 + r() * 0.09;
    ctx.fillStyle = dark ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.8})`;
    const sz = r() > 0.85 ? 2 : 1;
    ctx.fillRect(dx, dy, sz, sz);
  }

  // 3. Clay strata lines — horizontal for wide bricks, vertical for tall bricks
  const nStrata = Math.floor(r() * 5) + 3;
  const isVerticalBrick = h > w * 1.5;
  for (let i = 0; i < nStrata; i++) {
    const alpha = 0.05 + r() * 0.08;
    ctx.strokeStyle = r() > 0.55
      ? `rgba(0,0,0,${alpha})`
      : `rgba(255,240,200,${alpha})`;
    ctx.lineWidth = r() > 0.7 ? 1 : 0.5;
    ctx.beginPath();
    if (isVerticalBrick) {
      // vertical strata
      const lx = x + 1 + r() * (w - 2);
      const lh = h * (0.25 + r() * 0.65);
      const ly = y + r() * (h - lh);
      ctx.moveTo(lx, ly);
      ctx.bezierCurveTo(
        lx + (r()-0.5)*1.5, ly + lh*0.33,
        lx + (r()-0.5)*1.5, ly + lh*0.66,
        lx + (r()-0.5)*1.5, ly + lh
      );
    } else {
      // horizontal strata
      const ly = y + 1 + r() * (h - 2);
      const lw = w * (0.25 + r() * 0.65);
      const lx = x + r() * (w - lw);
      ctx.moveTo(lx, ly);
      ctx.bezierCurveTo(
        lx + lw * 0.33, ly + (r()-0.5)*1.5,
        lx + lw * 0.66, ly + (r()-0.5)*1.5,
        lx + lw, ly + (r()-0.5)*1.5
      );
    }
    ctx.stroke();
  }

  // 4. Subtle surface vignette (edges slightly darker — pressed clay effect)
  const edge = ctx.createRadialGradient(
    x + w * 0.5, y + h * 0.5, Math.min(w, h) * 0.2,
    x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.85
  );
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.13)');
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, w, h);

  // 5. Top-light sheen — very faint highlight strip on upper portion
  const sheen = ctx.createLinearGradient(x, y, x, y + h * 0.45);
  sheen.addColorStop(0, 'rgba(255,255,255,0.09)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.45);

  // 6. Occasional surface crack
  if (r() > 0.62) {
    const numSegs = Math.floor(r() * 2) + 1;
    ctx.strokeStyle = `rgba(0,0,0,${0.10 + r() * 0.10})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    let cx = x + w * 0.1 + r() * w * 0.8;
    let cy = y + h * 0.15 + r() * h * 0.25;
    ctx.moveTo(cx, cy);
    for (let s = 0; s < numSegs; s++) {
      cx += (r() - 0.5) * w * 0.25;
      cy += r() * h * 0.35;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// ── Artistic effect helpers ────────────────────────────────────────────────

function applyRoughEdges(ctx, x, y, w, h, id) {
  const r = seededRand(id + 'rough');
  ctx.save();
  // Draw each edge as a slightly wobbly line — realistic fired-clay look
  const edges = [
    { pts: () => { const pts = []; for (let i=0;i<=8;i++) { const t=i/8; pts.push([x+w*t+(r()-0.5)*0.8, y+(r()-0.5)*0.7]); } return pts; } },
    { pts: () => { const pts = []; for (let i=0;i<=8;i++) { const t=i/8; pts.push([x+w+(r()-0.5)*0.7, y+h*t+(r()-0.5)*0.8]); } return pts; } },
    { pts: () => { const pts = []; for (let i=0;i<=8;i++) { const t=i/8; pts.push([x+w*(1-t)+(r()-0.5)*0.8, y+h+(r()-0.5)*0.7]); } return pts; } },
    { pts: () => { const pts = []; for (let i=0;i<=8;i++) { const t=i/8; pts.push([x+(r()-0.5)*0.7, y+h*(1-t)+(r()-0.5)*0.8]); } return pts; } },
  ];
  for (const edge of edges) {
    const pts = edge.pts();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = `rgba(0,0,0,${0.18 + r()*0.12})`;
    ctx.lineWidth = 0.8 + r()*0.5;
    ctx.stroke();
    // second pass slightly offset — gives pressed-clay depth
    ctx.beginPath();
    ctx.moveTo(pts[0][0]+0.5, pts[0][1]+0.5);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0]+0.5, pts[i][1]+0.5);
    ctx.strokeStyle = `rgba(255,235,200,${0.08 + r()*0.06})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.restore();
}

function applyWatercolor(ctx, x, y, w, h, id) {
  const r = seededRand(id + 'wc');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const isVertical = h > w * 1.5;
  const nStrokes = Math.floor(r() * 3) + 4;

  // Helper: draw a tapered brush stroke as a filled path
  // Starts thick and solid, tapers + frays at the end
  const drawStroke = (x0, y0, x1, y1, thick, hue, sat, lit, alpha) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    // Perpendicular unit
    const px = -dy / len;
    const py =  dx / len;

    // Taper: full width at start, near-zero at end
    const hw0 = thick * 0.5;          // half-width at start
    const hw1 = thick * (0.04 + r() * 0.08); // near-zero at end (fray)

    // Main stroke body (filled quadrilateral with bezier sides)
    ctx.beginPath();
    // Start edge (flat)
    ctx.moveTo(x0 + px * hw0, y0 + py * hw0);
    // Top side curves slightly, narrows toward end
    const cp1x = x0 + dx * 0.4 + px * hw0 * (0.7 + r()*0.3) + (r()-0.5)*2;
    const cp1y = y0 + dy * 0.4 + py * hw0 * (0.7 + r()*0.3) + (r()-0.5)*2;
    const cp2x = x0 + dx * 0.75 + px * hw1 * 2 + (r()-0.5)*2;
    const cp2y = y0 + dy * 0.75 + py * hw1 * 2 + (r()-0.5)*2;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x1 + px * hw1, y1 + py * hw1);
    // End edge (jagged tip)
    ctx.lineTo(x1 + (r()-0.5)*hw1*3, y1 + (r()-0.5)*hw1*3);
    ctx.lineTo(x1 - px * hw1, y1 - py * hw1);
    // Bottom side back to start
    const cp3x = x0 + dx * 0.75 - px * hw1 * 2 + (r()-0.5)*2;
    const cp3y = y0 + dy * 0.75 - py * hw1 * 2 + (r()-0.5)*2;
    const cp4x = x0 + dx * 0.4 - px * hw0 * (0.7 + r()*0.3) + (r()-0.5)*2;
    const cp4y = y0 + dy * 0.4 - py * hw0 * (0.7 + r()*0.3) + (r()-0.5)*2;
    ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, x0 - px * hw0, y0 - py * hw0);
    ctx.closePath();

    // Fill with a gradient that fades toward the end
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0,    `hsla(${hue},${sat}%,${lit}%,${alpha})`);
    grad.addColorStop(0.3,  `hsla(${hue},${sat}%,${lit}%,${alpha * 0.75})`);
    grad.addColorStop(0.65, `hsla(${hue},${sat}%,${lit}%,${alpha * 0.35})`);
    grad.addColorStop(1,    `hsla(${hue},${sat}%,${lit}%,0)`);
    ctx.fillStyle = grad;
    ctx.fill();

    // Bristle splits at the fray end — a few thin lines
    const nBristles = Math.floor(r() * 3) + 2;
    for (let b = 0; b < nBristles; b++) {
      const bx = x1 + (r()-0.5) * hw0 * 1.5;
      const by = y1 + (r()-0.5) * hw0 * 1.5;
      const blen = r() * thick * 0.6 + 2;
      ctx.beginPath();
      ctx.moveTo(x1 + px*(r()-0.5)*hw1*2, y1 + py*(r()-0.5)*hw1*2);
      ctx.lineTo(bx + dx/len * blen, by + dy/len * blen);
      ctx.strokeStyle = `hsla(${hue},${sat}%,${lit}%,${alpha * 0.25})`;
      ctx.lineWidth = r() * 0.8 + 0.3;
      ctx.stroke();
    }
  };

  for (let i = 0; i < nStrokes; i++) {
    const hue = 10 + r() * 28;
    const sat = 22 + r() * 18;
    const lit = 40 + r() * 20;
    const alpha = 0.14 + r() * 0.12;

    if (isVertical) {
      // Top → bottom
      const cx = x + r() * w;
      const sy = y + r() * h * 0.3;
      const ey = sy + h * (0.3 + r() * 0.55);
      const thick = (r() * 0.25 + 0.1) * w;
      drawStroke(cx, sy, cx + (r()-0.5)*4, Math.min(y+h, ey), thick, hue, sat, lit, alpha);
    } else {
      // Left → right
      const cy = y + r() * h;
      const sx = x + r() * w * 0.3;
      const ex = sx + w * (0.3 + r() * 0.55);
      const thick = (r() * 0.25 + 0.1) * h;
      drawStroke(sx, cy, Math.min(x+w, ex), cy + (r()-0.5)*4, thick, hue, sat, lit, alpha);
    }
  }

  // Dry-brush flecks
  const nFlecks = Math.floor(w * h * 0.002) + 2;
  for (let i = 0; i < nFlecks; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.06})`;
    ctx.fillRect(x + r() * w, y + r() * h, r() > 0.7 ? 2 : 1, 1);
  }

  ctx.restore();
}

function applyAged(ctx, x, y, w, h, id) {
  const r = seededRand(id + 'aged');
  ctx.save();
  // Strong sepia wash
  ctx.fillStyle = `rgba(90,60,20,${0.18 + r()*0.12})`;
  ctx.fillRect(x, y, w, h);
  // Heavy vignette
  const vig = ctx.createRadialGradient(x+w/2, y+h/2, 0, x+w/2, y+h/2, Math.max(w,h)*0.9);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(0,0,0,${0.3 + r()*0.2})`);
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  // Speckle fade patches
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(255,245,200,${0.03+r()*0.05})`;
    ctx.fillRect(x + r()*w, y + r()*h, r()*w*0.4+2, r()*h*0.4+2);
  }
  ctx.restore();
}

function applyHatched(ctx, x, y, w, h, isVertical, brickColor) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const lineWidth = 1.2;
  const gap = 4;
  const angle = isVertical ? -45 : 45;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Fill with a lighter version of the hatch color
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = brickColor;
  ctx.fillRect(x, y, w, h);
  // Mix in white to further lighten
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'white';
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = brickColor;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = 0.75;

  // Draw diagonal hatch lines across the brick
  const diag = Math.sqrt(w * w + h * h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const steps = Math.ceil(diag / gap) + 2;
  for (let i = -steps; i <= steps; i++) {
    const offset = i * gap;
    // Perpendicular direction to the hatch line
    const px = -sin * offset;
    const py =  cos * offset;
    const halfLen = diag;
    ctx.beginPath();
    ctx.moveTo(cx + px + cos * (-halfLen), cy + py + sin * (-halfLen));
    ctx.lineTo(cx + px + cos * halfLen,   cy + py + sin * halfLen);
    ctx.stroke();
  }

  // Solid border — same color, double line width
  ctx.globalAlpha = 1;
  ctx.lineWidth = lineWidth * 2;
  ctx.strokeStyle = brickColor;
  ctx.strokeRect(x + lineWidth, y + lineWidth, w - lineWidth * 2, h - lineWidth * 2);

  ctx.restore();
}

function applySketch(ctx, x, y, w, h, id, brickColor) {
  const r = seededRand(id + 'sketch');
  ctx.save();
  // No fill — transparent background
  // Draw each edge as a wobbly solid line using the brick color
  const edges = [
    { pts: () => { const pts = []; for (let i=0;i<=10;i++) { const t=i/10; pts.push([x+w*t+(r()-0.5)*1.2, y+(r()-0.5)*1.0]); } return pts; } },
    { pts: () => { const pts = []; for (let i=0;i<=10;i++) { const t=i/10; pts.push([x+w+(r()-0.5)*1.0, y+h*t+(r()-0.5)*1.2]); } return pts; } },
    { pts: () => { const pts = []; for (let i=0;i<=10;i++) { const t=i/10; pts.push([x+w*(1-t)+(r()-0.5)*1.2, y+h+(r()-0.5)*1.0]); } return pts; } },
    { pts: () => { const pts = []; for (let i=0;i<=10;i++) { const t=i/10; pts.push([x+(r()-0.5)*1.0, y+h*(1-t)+(r()-0.5)*1.2]); } return pts; } },
  ];
  ctx.setLineDash([]);
  for (const edge of edges) {
    const pts = edge.pts();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = brickColor;
    ctx.lineWidth = 1.4 + r()*0.6;
    ctx.globalAlpha = 0.85 + r()*0.15;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────

const BrickCanvas = forwardRef(function BrickCanvas(
  { rows, scale, showGrid, selectedIds, primaryColor, altColor, mortarColor, mortarWidth = 3, effect, insertAt, screenWidth, screenHeight, onBrickClick, onVoidClick, bgImage, bgOpacity, bgScale, bgRotation, symV, symH, symVAxisCol, symHAxisRow },
  ref
) {
  const canvasRef = useRef(null);
  const hitRectsRef = useRef([]);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    renderForPrint: ({ width, height } = {}) => {
      const src = canvasRef.current;
      if (!src) return null;
      const tmp = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      const W = Math.max(1, Number(width) || screenWidth);
      const H = Math.max(1, Number(height) || screenHeight);
      tmp.width = Math.round(W * dpr);
      tmp.height = Math.round(H * dpr);
      const ctx = tmp.getContext('2d');
      ctx.scale(dpr, dpr);
      const M = mortarWidth;
      // Mortar background
      ctx.fillStyle = mortarColor || DEFAULT_MORTAR_COLOR;
      ctx.fillRect(0, 0, W, H);
      // Draw only bricks (no grid, no preview)
      rows.forEach((row, rowIdx) => {
        let col = 0;
        row.forEach(brick => {
          if (!brick.isVoid) {
            const bx = col * (scale + M);
            const bw = brick.units * scale + (brick.units - 1) * M;
            let bh, by;
            if (brick.isVertical) {
              const vu = brick.verticalUnits;
              bh = vu * scale + (vu - 1) * M;
              by = H - (rowIdx + vu) * (scale + M);
            } else {
              bh = scale;
              by = H - (rowIdx + 1) * (scale + M);
            }
            if (effect === 'sketch') {
              applySketch(ctx, bx, by, bw, bh, brick.id, resolveColor(brick));
            } else if (effect === 'hatched') {
              applyHatched(ctx, bx, by, bw, bh, brick.isVertical, resolveColor(brick));
            } else {
              ctx.fillStyle = resolveColor(brick);
              ctx.fillRect(bx, by, bw, bh);
              drawTexture(ctx, bx, by, bw, bh, brick.id);
              if (effect && effect !== 'none') {
                if (effect === 'rough') applyRoughEdges(ctx, bx, by, bw, bh, brick.id);
                else if (effect === 'watercolor') applyWatercolor(ctx, bx, by, bw, bh, brick.id);
              }
            }
          }
          col += brick.units;
        });
      });
      return tmp.toDataURL('image/png');
    }
  }));

  const resolveColor = (brick) => {
    if (!brick) return mortarColor || DEFAULT_MORTAR_COLOR;

    if (brick.colorRole === 'primary') return primaryColor || DEFAULT_MORTAR_COLOR;
    if (brick.colorRole === 'alt') return altColor || primaryColor || DEFAULT_MORTAR_COLOR;

    if (typeof brick.color === 'string' && brick.color.trim()) return brick.color;

    return primaryColor || altColor || mortarColor || DEFAULT_MORTAR_COLOR;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Debug: log key render parameters
    try {
      console.debug('BrickCanvas.render', { rowsLen: rows?.length, scale, screenWidth, screenHeight, mortarColor, effect });
    } catch (e) {}

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const logicalW = Math.max(1, Number(screenWidth) || 0);
    const logicalH = Math.max(1, Number(screenHeight) || 0);

    // Safety: avoid rendering with invalid or extreme sizes
    if (!Number.isFinite(logicalW) || !Number.isFinite(logicalH) || logicalW > 20000 || logicalH > 20000) {
      // eslint-disable-next-line no-console
      console.error('BrickCanvas: skipping render due to invalid canvas size', { logicalW, logicalH });
      return;
    }

    canvas.width = Math.round(logicalW * dpr);
    canvas.height = Math.round(logicalH * dpr);
    canvas.style.width = `${logicalW}px`;
    canvas.style.height = `${logicalH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, logicalW, logicalH);
    } catch (err) {
      console.error('BrickCanvas render error', err);
      return;
    }

    // Reset context state to ensure clean rendering
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = mortarColor || DEFAULT_MORTAR_COLOR;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.lineDashOffset = 0;
    ctx.setLineDash([]);

    // Background (mortar/khaki)
    ctx.fillStyle = mortarColor || DEFAULT_MORTAR_COLOR;
    ctx.fillRect(0, 0, logicalW, logicalH);

    // Draw background image if present
    if (bgImage) {
      ctx.save();
      ctx.globalAlpha = bgOpacity ?? 0.4;
      ctx.filter = 'grayscale(60%) brightness(1.1)';
      const cx = screenWidth / 2;
      const cy = screenHeight / 2;
      ctx.translate(cx, cy);
      ctx.rotate(((bgRotation ?? 0) * Math.PI) / 180);
      const s = bgScale ?? 1;
      const iw = bgImage.naturalWidth * s;
      const ih = bgImage.naturalHeight * s;
      ctx.drawImage(bgImage, -iw / 2, -ih / 2, iw, ih);
      ctx.filter = 'none';
      ctx.restore();
    }

    const M = mortarWidth;
    // Grid overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      // Vertical grid lines — center of mortar gaps
      let x = scale + M / 2;
      while (x < screenWidth) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, screenHeight); ctx.stroke();
        x += scale + M;
      }
      // Horizontal grid lines
      let y = screenHeight - (scale + M) - M / 2;
      while (y > 0) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(screenWidth, y); ctx.stroke();
        y -= scale + M;
      }
    }

    const maxUnits = Math.floor((screenWidth + M) / (scale + M));
    const hitRects = [];

    // Draw bricks
    rows.forEach((row, rowIdx) => {
      let col = 0;
      row.forEach(brick => {
        if (!brick.isVoid) {
          const bx = col * (scale + M);
          const bw = brick.units * scale + (brick.units - 1) * M;
          let bh, by;

          if (brick.isVertical) {
            const vu = brick.verticalUnits;
            bh = vu * scale + (vu - 1) * M;
            by = screenHeight - (rowIdx + vu) * (scale + M);
          } else {
            bh = scale;
            by = screenHeight - (rowIdx + 1) * (scale + M);
          }

          // Brick fill, texture & effect
          if (effect === 'sketch') {
            applySketch(ctx, bx, by, bw, bh, brick.id, resolveColor(brick));
          } else if (effect === 'hatched') {
            applyHatched(ctx, bx, by, bw, bh, brick.isVertical, resolveColor(brick));
          } else {
            ctx.fillStyle = resolveColor(brick);
            ctx.fillRect(bx, by, bw, bh);
            drawTexture(ctx, bx, by, bw, bh, brick.id);
            if (effect && effect !== 'none') {
              const rc = resolveColor(brick);
              if (effect === 'rough') applyRoughEdges(ctx, bx, by, bw, bh, brick.id);
              else if (effect === 'watercolor') applyWatercolor(ctx, bx, by, bw, bh, brick.id);
              else if (effect === 'sketch') applySketch(ctx, bx, by, bw, bh, brick.id, rc);
            }
          }

          // Selection ring
          if (selectedIds.has(brick.id)) {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
            ctx.fillStyle = '#facc15';
            ctx.font = `bold ${Math.max(8, Math.floor(scale * 0.45))}px sans-serif`;
            ctx.fillText('✓', bx + 3, by + Math.min(scale, bh) * 0.75);
          }

          hitRects.push({ id: brick.id, x: bx, y: by, w: bw, h: bh });
        }
        col += brick.units;
      });
    });

    // Preview ghost brick at next position
    let previewCol = 0;
    let previewRowIdx = 0;
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const lastUnits = lastRow.reduce((s, b) => s + b.units, 0);
      if (lastUnits < maxUnits) {
        previewCol = lastUnits;
        previewRowIdx = rows.length - 1;
      } else {
        previewRowIdx = rows.length;
      }
    }
    const px = previewCol * (scale + M);
    const py = screenHeight - (previewRowIdx + 1) * (scale + M);
    if (py >= 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(px, py, scale, scale);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(px + 0.5, py + 0.5, scale - 1, scale - 1);
      ctx.setLineDash([]);
    }

    // Draw insertAt cursor
    if (insertAt !== null) {
      const { rowIdx, col } = insertAt;
      const cursorX = col * (scale + M);
      const cursorY = screenHeight - (rowIdx + 1) * (scale + M);
      if (cursorX >= 0 && cursorX < screenWidth && cursorY >= 0) {
        ctx.fillStyle = 'rgba(96,165,250,0.18)';
        ctx.fillRect(cursorX + 1, cursorY + 1, scale - 2, scale - 2);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(cursorX + 1, cursorY + 1, scale - 2, scale - 2);
        ctx.setLineDash([]);
      }
    }

    // ── Symmetry guide lines ────────────────────────────────────────────────
    if (symV) {
      const axisCol = Math.max(0, Number(symVAxisCol) || 0);
      const colX = axisCol * (scale + M);
      const lineX = Math.max(0, Math.min(screenWidth, colX + scale / 2));
      ctx.save();
      ctx.fillStyle = 'rgba(167,139,250,0.16)';
      ctx.fillRect(colX, 0, scale, screenHeight);
      ctx.strokeStyle = 'rgba(167,139,250,0.85)'; // violet
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, screenHeight);
      ctx.stroke();
      // Label
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(167,139,250,0.9)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⟺  Vertical Symmetry', lineX, 14);
      ctx.restore();
    }
    if (symH) {
      const axisRow = Math.max(0, Number(symHAxisRow) || 0);
      const rowY = screenHeight - (axisRow + 1) * (scale + M);
      const lineY = Math.max(0, Math.min(screenHeight, rowY + scale / 2));
      ctx.save();
      ctx.fillStyle = 'rgba(52,211,153,0.16)';
      ctx.fillRect(0, rowY, screenWidth, scale);
      ctx.strokeStyle = 'rgba(52,211,153,0.85)'; // emerald
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(screenWidth, lineY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(52,211,153,0.9)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⟺  Horizontal Symmetry', 8, lineY - 5);
      ctx.restore();
    }

    hitRectsRef.current = hitRects;
  }, [rows, scale, showGrid, selectedIds, primaryColor, altColor, mortarColor, mortarWidth, insertAt, screenWidth, screenHeight, effect, bgImage, bgOpacity, bgScale, bgRotation, symV, symH, symVAxisCol, symHAxisRow]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (const hr of hitRectsRef.current) {
      if (x >= hr.x && x <= hr.x + hr.w && y >= hr.y && y <= hr.y + hr.h) {
        onBrickClick(hr.id, e);
        return;
      }
    }
    // Click on empty area — set cursor position
    const rowIdx = Math.floor((screenHeight - y) / (scale + mortarWidth));
    const col = Math.floor(x / (scale + mortarWidth));
    const maxUnits = Math.floor((screenWidth + mortarWidth) / (scale + mortarWidth));
    if (rowIdx >= 0 && col >= 0 && col < maxUnits) {
      e.stopPropagation();
      onVoidClick(rowIdx, col);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="block cursor-crosshair"
    />
  );
});

export default BrickCanvas;

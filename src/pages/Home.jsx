import { useState, useEffect, useRef, useCallback } from 'react';
import BrickCanvas from '../components/BrickCanvas';
import Toolbar from '../components/Toolbar';
import SelectionBar from '../components/SelectionBar';
import Footer from '../components/Footer';
import BgImageControls from '../components/BgImageControls';
import ColorPalette from '../components/ColorPalette';
import useUndoRedo from '../hooks/useUndoRedo';
import useModuleLibrary from '../hooks/useModuleLibrary';
import ModuleLibrary from '../components/ModuleLibrary';
import PrintDialog from '../components/PrintDialog';
import SymmetryControls from '../components/SymmetryControls';

let _id = 1;
const uid = () => String(_id++);

const DEFAULT_PRIMARY = '#b5523a';
const DEFAULT_ALT = '#c49a50';
const TARGET_VISIBLE_GRID_COLUMNS = 27;

function getMaxUnits(screenW, scale, mortar) {
  return Math.floor((screenW + mortar) / (scale + mortar));
}

function getBlockedCols(rows, targetRowIdx) {
  const blocked = new Set();
  rows.forEach((row, rowIdx) => {
    let col = 0;
    row.forEach(brick => {
      if (brick.isVertical && rowIdx < targetRowIdx && rowIdx + brick.verticalUnits > targetRowIdx) {
        blocked.add(col);
      }
      col += brick.units;
    });
  });
  return blocked;
}

function makeBrick(units, isVoid, isVertical, verticalUnits, color, colorRole = 'custom') {
  return { id: uid(), units, isVoid, isVertical, verticalUnits: verticalUnits || 1, color, colorRole };
}

function addBrick(rows, brick, maxUnits, insertAt = null) {
  let newRows = rows.map(r => [...r]);

  let currentRowIdx;
  if (insertAt !== null) {
    // Ensure enough rows exist
    while (newRows.length <= insertAt.rowIdx) newRows.push([]);
    currentRowIdx = insertAt.rowIdx;
    // Pad row with voids up to target col
    const currentRow = newRows[currentRowIdx];
    let filledCols = currentRow.reduce((s, b) => s + b.units, 0);
    while (filledCols < insertAt.col) {
      currentRow.push(makeBrick(1, true, false, 1, 'transparent'));
      filledCols++;
    }
  } else {
    const lastRow = newRows.length > 0 ? newRows[newRows.length - 1] : null;
    const lastUnits = lastRow ? lastRow.reduce((s, b) => s + b.units, 0) : 0;
    if (!lastRow || lastUnits >= maxUnits) {
      newRows.push([]);
      currentRowIdx = newRows.length - 1;
    } else {
      currentRowIdx = newRows.length - 1;
    }
  }

  const currentRow = newRows[currentRowIdx];
  const blocked = getBlockedCols(newRows, currentRowIdx);
  let col = currentRow.reduce((s, b) => s + b.units, 0);

  // Auto-skip blocked columns
  let safety = 0;
  while (col < maxUnits && blocked.has(col) && safety++ < maxUnits) {
    currentRow.push(makeBrick(1, true, false, 1, 'transparent'));
    col++;
  }

  if (col + brick.units > maxUnits) return null;

  currentRow.push({ ...brick, id: uid() });
  return newRows;
}

// Place a horizontal brick, auto-splitting around blocked (vertical) columns
function addHorizontalSplit(rows, brick, maxUnits, insertAt) {
  let newRows = rows.map(r => [...r]);
  let currentRowIdx;

  if (insertAt !== null) {
    while (newRows.length <= insertAt.rowIdx) newRows.push([]);
    currentRowIdx = insertAt.rowIdx;
    const currentRow = newRows[currentRowIdx];
    let filled = currentRow.reduce((s, b) => s + b.units, 0);
    while (filled < insertAt.col) {
      currentRow.push(makeBrick(1, true, false, 1, 'transparent'));
      filled++;
    }
  } else {
    const lastRow = newRows.length > 0 ? newRows[newRows.length - 1] : null;
    const lastUnits = lastRow ? lastRow.reduce((s, b) => s + b.units, 0) : 0;
    if (!lastRow || lastUnits >= maxUnits) {
      newRows.push([]);
    }
    currentRowIdx = newRows.length - 1;
  }

  const currentRow = newRows[currentRowIdx];
  const blocked = getBlockedCols(newRows, currentRowIdx);
  let col = currentRow.reduce((s, b) => s + b.units, 0);

  // Skip initially blocked columns
  let safety = 0;
  while (col < maxUnits && blocked.has(col) && safety++ < maxUnits) {
    currentRow.push(makeBrick(1, true, false, 1, 'transparent'));
    col++;
  }

  if (col >= maxUnits) return null;

  // Place bricks using requested size, splitting only where blocked
  let placed = 0;
  const unitsNeeded = brick.units;
  while (placed < unitsNeeded && col < maxUnits) {
    if (blocked.has(col)) {
      // Skip blocked column with void
      currentRow.push(makeBrick(1, true, false, 1, 'transparent'));
      col++;
    } else {
      // Try to place full-size brick; shrink if any col in span is blocked
      let fitUnits = brick.units;
      while (fitUnits > 1) {
        let spanBlocked = false;
        for (let c = col; c < col + fitUnits; c++) {
          if (blocked.has(c) || c >= maxUnits) { spanBlocked = true; break; }
        }
        if (!spanBlocked) break;
        fitUnits--;
      }
      currentRow.push(makeBrick(fitUnits, false, false, 1, brick.color, brick.colorRole));
      col += fitUnits;
      placed += fitUnits;
    }
  }

  if (placed === 0) return null;
  return newRows;
}

function removeLastBrick(rows) {
  if (rows.length === 0) return rows;
  const newRows = rows.map(r => [...r]);
  const last = newRows[newRows.length - 1];
  if (last.length === 0) {
    newRows.pop();
    return newRows;
  }
  last.pop();
  if (last.length === 0) newRows.pop();
  return newRows;
}

function getCurrentRowUnits(rows, maxUnits) {
  if (!rows || rows.length === 0) return 0;
  const last = rows[rows.length - 1];
  const units = last.reduce((s, b) => s + b.units, 0);
  return units >= maxUnits ? 0 : units;
}

function repeatRowToEnd(rows, maxUnits, rowIdx = null) {
  if (!rows || rows.length === 0) return null;

  const targetRowIdx = rowIdx ?? rows.length - 1;
  const sourceRow = rows[targetRowIdx];
  if (!sourceRow || sourceRow.length === 0) return null;

  const currentUnits = sourceRow.reduce((s, b) => s + b.units, 0);
  if (currentUnits <= 0 || currentUnits >= maxUnits) return rows;

  const newRows = rows.map(r => [...r]);
  const targetRow = newRows[targetRowIdx];
  const blocked = getBlockedCols(newRows, targetRowIdx);
  const sequence = sourceRow.filter(b => !b.isVoid);
  if (sequence.length === 0) return null;

  let filled = currentUnits;
  let seqIdx = 0;

  while (filled < maxUnits) {
    if (blocked.has(filled)) {
      targetRow.push(makeBrick(1, true, false, 1, 'transparent'));
      filled++;
      continue;
    }

    const source = sequence[seqIdx % sequence.length];
    const remaining = maxUnits - filled;
    let units = Math.min(source.units, remaining);

    for (let c = filled; c < filled + units; c++) {
      if (blocked.has(c)) {
        units = c - filled;
        break;
      }
    }

    if (units <= 0) {
      targetRow.push(makeBrick(1, true, false, 1, 'transparent'));
      filled++;
      continue;
    }

    targetRow.push({ ...source, id: uid(), units });
    filled += units;
    seqIdx++;
  }

  return newRows;
}

function getRowPlacements(row) {
  const placements = [];
  let col = 0;
  row.forEach(brick => {
    if (!brick.isVoid) placements.push({ brick, col, units: brick.units });
    col += brick.units;
  });
  return placements;
}

function slicePlacement(placement, startCol, endCol) {
  const left = Math.max(placement.col, startCol);
  const right = Math.min(placement.col + placement.units, endCol);
  if (right <= left) return null;
  return {
    brick: {
      ...placement.brick,
      units: right - left,
      verticalUnits: placement.brick.isVertical ? placement.brick.verticalUnits : 1
    },
    col: left,
    units: right - left
  };
}

function rowFromPlacements(placements, maxUnits, suffix) {
  const byCol = [...placements]
    .filter(p => p && p.units > 0 && p.col >= 0 && p.col < maxUnits)
    .sort((a, b) => a.col - b.col);
  const row = [];
  let col = 0;

  byCol.forEach((placement, idx) => {
    const nextCol = Math.max(0, Math.min(maxUnits, placement.col));
    const units = Math.min(placement.units, maxUnits - nextCol);
    if (units <= 0 || nextCol < col) return;
    if (nextCol > col) {
      row.push({ id: `void_${suffix}_${idx}`, units: nextCol - col, isVoid: true, isVertical: false, verticalUnits: 1, color: 'transparent', colorRole: 'custom' });
    }
    row.push({ ...placement.brick, id: `${placement.brick.id}_${suffix}_${idx}`, units });
    col = nextCol + units;
  });

  return row;
}

function mirrorRowAroundColumn(row, maxUnits, axisCol) {
  const axis = Math.max(0, Math.min(maxUnits - 1, Math.round(axisCol)));
  const placements = getRowPlacements(row);
  const axisColumn = placements
    .map(placement => slicePlacement(placement, axis, axis + 1))
    .filter(Boolean);
  const source = placements
    .map(placement => slicePlacement(placement, 0, axis))
    .filter(Boolean);

  const mirrored = source.map(placement => ({
    brick: { ...placement.brick, id: `${placement.brick.id}_mirror_col` },
    col: 2 * axis + 1 - (placement.col + placement.units),
    units: placement.units
  }));

  return rowFromPlacements([...source, ...axisColumn, ...mirrored], maxUnits, `v${axis}_left`);
}

function mirrorRowsAroundRow(rows, axisRow, maxUnits) {
  const axis = Math.max(0, Math.round(axisRow));
  const source = rows.map((row, rowIdx) => ({ row, rowIdx })).filter(item => item.rowIdx < axis);
  const nextRows = [];
  const mirroredByRow = new Map();

  if (rows[axis]) {
    nextRows[axis] = rows[axis].map(brick => ({ ...brick, id: `${brick.id}_haxis_${axis}` }));
  }

  source.forEach(({ row, rowIdx }) => {
    const clone = row.map(brick => ({ ...brick, id: `${brick.id}_hsrc_${rowIdx}` }));
    nextRows[rowIdx] = clone;

    getRowPlacements(row).forEach(placement => {
      const brick = placement.brick;
      const targetRowIdx = brick.isVertical
        ? 2 * axis - (rowIdx + brick.verticalUnits - 1)
        : 2 * axis - rowIdx;
      if (targetRowIdx < 0) return;

      if (!mirroredByRow.has(targetRowIdx)) mirroredByRow.set(targetRowIdx, []);
      mirroredByRow.get(targetRowIdx).push({
        brick: { ...brick, id: `${brick.id}_hmirror_${targetRowIdx}` },
        col: placement.col,
        units: placement.units
      });
    });
  });

  mirroredByRow.forEach((placements, rowIdx) => {
    nextRows[rowIdx] = rowFromPlacements(placements, maxUnits, `hmirror_${rowIdx}`);
  });

  return nextRows.map(row => row || []);
}

export default function Home() {
  const { state: rows, setState: setRows, undo, redo, canUndo, canRedo } = useUndoRedo([]);
  const { modules, saveModule, deleteModule } = useModuleLibrary();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [symV, setSymV] = useState(false); // vertical axis → mirror left↔right
  const [symH, setSymH] = useState(false); // horizontal axis → mirror top↔bottom
  const [symVAxisCol, setSymVAxisCol] = useState(0);
  const [symHAxisRow, setSymHAxisRow] = useState(0);
  const [scale, setScale] = useState(16);
  const [showGrid, setShowGrid] = useState(true);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [altColor, setAltColor] = useState(DEFAULT_ALT);
  const [mortarColor, setMortarColor] = useState('#44403c');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selColor, setSelColor] = useState('#e8803a');
  const [insertAt, setInsertAt] = useState(null);
  const [effect, setEffect] = useState('none');
  const [mortarWidth, setMortarWidth] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenFallback, setIsFullscreenFallback] = useState(false);

  const [bgImageEl, setBgImageEl] = useState(null);
  const [bgOpacity, setBgOpacity] = useState(0.35);
  const [bgScale, setBgScale] = useState(1);
  const [bgRotation, setBgRotation] = useState(0);

  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const canvasViewportRef = useRef(null);
  const altKeyRef = useRef(false);
  const insertAtRef = useRef(null);

  // ── Layout geometry (computed early so maxUnits is available everywhere) ──
  // These mirror the values computed again in the render section below.
  // Keeping them in sync: rowStep = scale + mortarWidth.
  const _rowStep = scale + mortarWidth;
  const _colStep = scale + mortarWidth;
  const _canvasW = Math.max(_colStep, size.w);
  const maxUnits = getMaxUnits(_canvasW, scale, mortarWidth);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      const canvasIsFullscreen = fullscreenElement === canvasViewportRef.current;
      setIsFullscreen(canvasIsFullscreen || isFullscreenFallback);
      if (canvasIsFullscreen) setIsFullscreenFallback(false);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, [isFullscreenFallback]);

  useEffect(() => {
    setIsFullscreen(isFullscreenFallback || document.fullscreenElement === canvasViewportRef.current || document.webkitFullscreenElement === canvasViewportRef.current);
    document.body.style.overflow = isFullscreenFallback ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreenFallback]);

  useEffect(() => {
    const measure = () => {
      const el = canvasViewportRef.current;
      setSize({
        w: Math.max(1, Math.floor(el?.clientWidth || window.innerWidth)),
        h: Math.max(1, Math.floor(el?.clientHeight || window.innerHeight))
      });
    };

    measure();
    window.addEventListener('resize', measure);

    let observer;
    if (window.ResizeObserver && canvasViewportRef.current) {
      observer = new ResizeObserver(measure);
      observer.observe(canvasViewportRef.current);
    }

    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const nextScale = Math.max(4, Math.round((size.w + mortarWidth) / TARGET_VISIBLE_GRID_COLUMNS - mortarWidth));
    setScale(prev => prev === nextScale ? prev : nextScale);
  }, [size.w, mortarWidth]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.key === 'a') { altKeyRef.current = true; return; }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }

      if (e.key === 'Backspace') {
        e.preventDefault();
        setRows(prev => removeLastBrick(prev));
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        const ia = insertAtRef.current;
        const b = makeBrick(1, true, false, 1, 'transparent');
        setRows(prev => {
          const next = addBrick(prev, b, maxUnits, ia);
          if (next && ia) {
            const nextCol = ia.col + 1;
            const nxt = nextCol >= maxUnits
              ? { rowIdx: ia.rowIdx + 1, col: 0 }
              : { ...ia, col: nextCol };
            insertAtRef.current = nxt;
            setInsertAt(nxt);
          }
          return next || prev;
        });
        return;
      }

      const useAlt = altKeyRef.current;
      const hMap = { '1': 1, '2': 2, '3': 3 };
      if (hMap[e.key] !== undefined) {
        const ia = insertAtRef.current;
        const role = useAlt ? 'alt' : 'primary';
        const color = useAlt ? altColor : primaryColor;
        const b = makeBrick(hMap[e.key], false, false, 1, color, role);
        setRows(prev => {
          const next = addHorizontalSplit(prev, b, maxUnits, ia);
          if (next && ia) {
            // Advance cursor past all placed units (including skipped voids)
            const newRow = next[ia.rowIdx] || [];
            const newCol = newRow.reduce((s, bk) => s + bk.units, 0);
            const nxt = newCol >= maxUnits
              ? { rowIdx: ia.rowIdx + 1, col: 0 }
              : { rowIdx: ia.rowIdx, col: newCol };
            insertAtRef.current = nxt;
            setInsertAt(nxt);
          }
          return next || prev;
        });
        return;
      }

      const vMap = { '4': 1, '5': 2, '6': 3 };
      if (vMap[e.key] !== undefined) {
        const ia = insertAtRef.current;
        const b = makeBrick(1, false, true, vMap[e.key], altColor, 'alt');
        setRows(prev => {
          const next = addBrick(prev, b, maxUnits, ia);
          if (next && ia) {
            const nextCol = ia.col + 1;
            const nxt = nextCol >= maxUnits
              ? { rowIdx: ia.rowIdx + 1, col: 0 }
              : { ...ia, col: nextCol };
            insertAtRef.current = nxt;
            setInsertAt(nxt);
          }
          return next || prev;
        });
      }
    };

    const onKeyUp = (e) => { if (e.key === 'a') altKeyRef.current = false; };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [primaryColor, altColor, maxUnits, undo, redo]);

  const handleBrickClick = useCallback((id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleVoidClick = useCallback((rowIdx, col) => {
    const pos = { rowIdx, col };
    insertAtRef.current = pos;
    setInsertAt(pos);
    setSelectedIds(new Set());
  }, []);

  const applySelectionColor = () => {
    setRows(prev => prev.map(row => row.map(b => selectedIds.has(b.id) ? { ...b, color: selColor, colorRole: 'custom' } : b)));
  };

  const deleteSelected = () => {
    setRows(prev => prev.map(row => row.map(b =>
      selectedIds.has(b.id) ? { ...b, isVoid: true, color: 'transparent' } : b
    )));
    setSelectedIds(new Set());
  };

  const handleSave = () => {
    const data = JSON.stringify({ version: 1, rows, primaryColor, altColor, scale, mortarColor, mortarWidth }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'brick-design.brickwall';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = JSON.parse(ev.target.result);
      if (data.rows) setRows(data.rows);
      if (data.primaryColor) setPrimaryColor(data.primaryColor);
      if (data.altColor) setAltColor(data.altColor);
      if (data.scale) setScale(data.scale);
      if (data.mortarColor) setMortarColor(data.mortarColor);
      if (data.mortarWidth) setMortarWidth(data.mortarWidth);
      setSelectedIds(new Set());
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = () => setPrintOpen(true);

  const handleToggleFullscreen = async () => {
    const el = canvasViewportRef.current;
    if (!el) return;

    try {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
      const exitFullscreen = document.exitFullscreen?.bind(document) || document.webkitExitFullscreen?.bind(document);
      const requestFullscreen = el.requestFullscreen?.bind(el) || el.webkitRequestFullscreen?.bind(el);

      if (fullscreenElement) {
        await exitFullscreen?.();
      } else if (isFullscreenFallback) {
        setIsFullscreenFallback(false);
      } else if (requestFullscreen) {
        await requestFullscreen();
      } else {
        setIsFullscreenFallback(true);
      }
    } catch (error) {
      console.error('Unable to toggle fullscreen mode', error);
      setIsFullscreenFallback(v => !v);
    }
  };

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.renderForPrint({ width: size.w, height: size.h });
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'brick-pattern.png';
    a.click();
  };

  const handleExportSVG = () => {
    const M = mortarWidth;
    const svgW = size.w;
    const svgH = size.h;
    const resolveColor = (brick) =>
      brick.colorRole === 'primary' ? primaryColor :
      brick.colorRole === 'alt' ? altColor :
      brick.color;
    let rects = '';
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
            by = svgH - (rowIdx + vu) * (scale + M);
          } else {
            bh = scale;
            by = svgH - (rowIdx + 1) * (scale + M);
          }
          rects += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${resolveColor(brick)}"/>`;
        }
        col += brick.units;
      });
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}"><rect width="${svgW}" height="${svgH}" fill="${mortarColor}"/>${rects}</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'brick-pattern.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleBgImageLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setBgImageEl(img);
    img.src = url;
    e.target.value = '';
  };

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    const imgData = canvasRef.current.renderForPrint({ width: size.w, height: size.h });
    if (!imgData) return;
    const { jsPDF } = await import('jspdf');
    const pxPerMm = 96 / 25.4;
    const screenW = Math.max(1, size.w / pxPerMm);
    const screenH = Math.max(1, size.h / pxPerMm);
    const orientation = screenW >= screenH ? 'landscape' : 'portrait';
    const pageW = orientation === 'landscape' ? Math.max(screenW, screenH) : Math.min(screenW, screenH);
    const pageH = orientation === 'landscape' ? Math.min(screenW, screenH) : Math.max(screenW, screenH);
    const pdf = new jsPDF({ orientation, unit: 'mm', format: [pageW, pageH] });
    const tmpImg = new Image();
    tmpImg.src = imgData;
    await new Promise(res => { tmpImg.onload = res; });
    const ratio = tmpImg.width / tmpImg.height;
    const imgW = Math.min(pageW, pageH * ratio);
    const imgH = imgW / ratio;
    pdf.addImage(imgData, 'PNG', pageW - imgW, pageH - imgH, imgW, imgH);
    pdf.save('brick-pattern.pdf');
  };

  const touchStartRef = useRef(null);
  const lastDeleteRef = useRef(0);
  const swipeDirectionRef = useRef(null);
  const [swipePreview, setSwipePreview] = useState(null);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (!swipeDirectionRef.current && (absDx > 15 || absDy > 15)) {
      swipeDirectionRef.current = absDx > absDy ? 'horizontal' : 'vertical';
    }

    if (swipeDirectionRef.current === 'horizontal' && dx < -30) {
      const now = Date.now();
      if (now - lastDeleteRef.current > 220) {
        lastDeleteRef.current = now;
        setRows(prev => removeLastBrick(prev));
      }
      setSwipePreview({ type: 'delete' });
    } else if (swipeDirectionRef.current === 'horizontal' && dx > 30) {
      const units = absDx < 60 ? 1 : absDx < 120 ? 2 : 3;
      setSwipePreview({ type: 'h', units });
    } else if (swipeDirectionRef.current === 'vertical' && dy < -30) {
      const vUnits = absDy < 60 ? 1 : absDy < 120 ? 2 : 3;
      setSwipePreview({ type: 'v', units: vUnits });
    } else {
      setSwipePreview(null);
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const dir = swipeDirectionRef.current;
    touchStartRef.current = null;
    swipeDirectionRef.current = null;
    setSwipePreview(null);

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 30 && absDy < 30) return;
    if (dir === 'horizontal' && dx < 0) return; // already handled by touchMove

    const ia = insertAtRef.current;

    if (dir === 'horizontal' && dx > 0) {
      // Swipe right → horizontal brick
      const units = absDx < 60 ? 1 : absDx < 120 ? 2 : 3;
      const b = makeBrick(units, false, false, 1, primaryColor, 'primary');
      setRows(prev => {
        const next = addHorizontalSplit(prev, b, maxUnits, ia);
        if (next && ia) {
          const newRow = next[ia.rowIdx] || [];
          const newCol = newRow.reduce((s, bk) => s + bk.units, 0);
          const nxt = newCol >= maxUnits
            ? { rowIdx: ia.rowIdx + 1, col: 0 }
            : { rowIdx: ia.rowIdx, col: newCol };
          insertAtRef.current = nxt;
          setInsertAt(nxt);
        }
        return next || prev;
      });
    } else if (dir === 'vertical' && dy < 0) {
      // Swipe up → vertical brick
      const vUnits = absDy < 60 ? 1 : absDy < 120 ? 2 : 3;
      const b = makeBrick(1, false, true, vUnits, altColor, 'alt');
      setRows(prev => {
        const next = addBrick(prev, b, maxUnits, ia);
        if (next && ia) {
          const nextCol = ia.col + 1;
          const nxt = nextCol >= maxUnits
            ? { rowIdx: ia.rowIdx + 1, col: 0 }
            : { ...ia, col: nextCol };
          insertAtRef.current = nxt;
          setInsertAt(nxt);
        }
        return next || prev;
      });
    }
  };

  const viewportH = Math.max(_rowStep, size.h);
  const visibleRowCount = Math.max(1, Math.ceil(viewportH / _rowStep));

  // Re-use pre-computed canvasW
  const canvasW = _canvasW;

  const totalRowsH = (rows ? rows.length : 0) * _rowStep + mortarWidth;
  const canvasH = Math.max(viewportH, totalRowsH);

  useEffect(() => {
    const maxCol = Math.max(0, maxUnits - 1);
    setSymVAxisCol(prev => prev > 0 ? Math.min(prev, maxCol) : Math.floor(maxCol / 2));
  }, [maxUnits]);

  useEffect(() => {
    const maxRow = Math.max(0, Math.ceil(canvasH / _rowStep) - 1);
    setSymHAxisRow(prev => prev > 0 ? Math.min(prev, maxRow) : Math.floor(Math.max(0, visibleRowCount - 1) / 2));
  }, [canvasH, _rowStep, visibleRowCount]);
  // Auto-scroll to bottom when rows grow
  useEffect(() => {
    if (!rows) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    scrollEl.scrollTop = maxScroll;
  }, [rows, canvasH]);

  const handleRepeatPattern = () => {
    if (!rows || rows.length === 0) return;
    // How many rows fit in the visible viewport
    const targetRowCount = Math.ceil(viewportH / (scale + mortarWidth)) + 2;
    if (rows.length >= targetRowCount) return;

    const pattern = rows;
    const newRows = [];
    for (let i = 0; i < targetRowCount; i++) {
      // Clone each row, giving bricks fresh ids to avoid key collisions
      const src = pattern[i % pattern.length];
      newRows.push(src.map(b => ({ ...b, id: uid() })));
    }
    setRows(newRows);
    setSelectedIds(new Set());
    setInsertAt(null);
    insertAtRef.current = null;
  };

  const handleRepeatRow = () => {
    if (!rows || rows.length === 0) return;

    const targetRowIdx = insertAtRef.current?.rowIdx ?? rows.length - 1;
    if (targetRowIdx < 0 || targetRowIdx >= rows.length) return;

    setRows(prev => repeatRowToEnd(prev, maxUnits, targetRowIdx) || prev);

    const nextPos = { rowIdx: targetRowIdx + 1, col: 0 };
    insertAtRef.current = nextPos;
    setInsertAt(nextPos);
    setSelectedIds(new Set());
  };

  const handleAppendModule = (mod) => {
    // Clone module rows with fresh IDs and append to the canvas
    const cloned = mod.rows.map(row => row.map(b => ({ ...b, id: uid() })));
    setRows(prev => [...prev, ...cloned]);
    setInsertAt(null);
    insertAtRef.current = null;
    setSelectedIds(new Set());
  };

  // ── Symmetry mirroring ────────────────────────────────────────────────────
  // Apply symmetry on a read-only derived copy for rendering only.
  // The actual `rows` state is never mutated by symmetry.
  const displayRows = (() => {
    if (!symV && !symH) return rows;

    let r = rows.map(row => [...row]);

    if (symV) {
      r = r.map(row => mirrorRowAroundColumn(row, maxUnits, symVAxisCol));
    }

    if (symH) {
      r = mirrorRowsAroundRow(r, symHAxisRow, maxUnits);
    }

    return r;
  })();

  const curRowUnits = getCurrentRowUnits(rows, maxUnits);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <Toolbar
        primaryColor={primaryColor} altColor={altColor}
        onPrimaryChange={setPrimaryColor} onAltChange={setAltColor}
        mortarColor={mortarColor} onMortarChange={setMortarColor}
        mortarWidth={mortarWidth} onMortarWidthChange={setMortarWidth}
        scale={scale} onScaleChange={(newScale) => setScale(Math.max(4, newScale))}
        showGrid={showGrid} onGridToggle={() => setShowGrid(v => !v)}
        effect={effect} onEffectChange={setEffect}
        maxUnits={maxUnits}
        onPrint={handlePrint} onExportPDF={handleExportPDF} onExportPNG={handleExportPNG} onExportSVG={handleExportSVG}
        onClear={() => { setRows([]); setSelectedIds(new Set()); }}
        onLoadTemplate={(rows) => { setRows(rows); setSelectedIds(new Set()); }}
        onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
        onSave={handleSave} onLoad={handleLoad}
        onBgImageLoad={handleBgImageLoad}
        onFullscreen={handleToggleFullscreen}
      />
      <ColorPalette
        primaryColor={primaryColor} altColor={altColor}
        onPrimaryChange={setPrimaryColor} onAltChange={setAltColor}
      />
      <div className="flex items-center gap-2 px-3 py-1 bg-card border-b border-border flex-shrink-0">
        <span className="text-xs text-muted-foreground/60 mr-1">Symmetry:</span>
        <SymmetryControls
          symV={symV} symH={symH}
          onToggleV={() => setSymV(v => !v)}
          onToggleH={() => setSymH(v => !v)}
          maxUnits={maxUnits}
          maxRows={Math.max(0, Math.ceil(canvasH / _rowStep) - 1)}
          symVAxisCol={symVAxisCol}
          symHAxisRow={symHAxisRow}
          onVAxisChange={setSymVAxisCol}
          onHAxisChange={setSymHAxisRow}
        />
      </div>
      <ModuleLibrary
        rows={rows}
        primaryColor={primaryColor} altColor={altColor} mortarColor={mortarColor}
        modules={modules}
        onSaveModule={saveModule}
        onDeleteModule={deleteModule}
        onAppendModule={handleAppendModule}
        open={libraryOpen}
        onToggle={() => setLibraryOpen(v => !v)}
      />
      <BgImageControls
        bgImage={bgImageEl}
        onRemove={() => setBgImageEl(null)}
        opacity={bgOpacity} onOpacityChange={setBgOpacity}
        scale={bgScale} onScaleChange={setBgScale}
        rotation={bgRotation} onRotationChange={setBgRotation}
      />

      {selectedIds.size > 0 && (
        <SelectionBar
          count={selectedIds.size} color={selColor} onColorChange={setSelColor}
          onApply={applySelectionColor} onDelete={deleteSelected}
          onDeselect={() => setSelectedIds(new Set())}
        />
      )}

      <div
        ref={canvasViewportRef}
        className={`overflow-hidden bg-background ${
          isFullscreenFallback
            ? 'fixed inset-0 z-[100] h-[100dvh] w-screen flex-none'
            : 'flex-1 min-h-0 w-full'
        }`}
      >
        {isFullscreen && (
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="absolute right-3 top-3 z-[60] rounded bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
            title="Exit fullscreen"
          >
            Exit
          </button>
        )}
        <div
          ref={scrollRef}
          style={{ height: '100%', width: '100%', overflowX: 'hidden' }}
          className="overflow-y-auto relative"
          onClick={() => { setSelectedIds(new Set()); insertAtRef.current = null; setInsertAt(null); }}
          onDoubleClick={isFullscreen ? handleToggleFullscreen : undefined}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
        {swipePreview && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              {swipePreview.type === 'delete' ? (
                <div className="bg-red-500/80 rounded-lg px-6 py-4 text-white text-lg font-bold shadow-2xl">
                  ⌫ Delete
                </div>
              ) : swipePreview.type === 'h' ? (
                <>
                  <div className="flex gap-1">
                    {Array.from({ length: swipePreview.units }).map((_, i) => (
                      <div key={i} style={{ backgroundColor: primaryColor, width: 52, height: 28, opacity: 0.9 }}
                        className="rounded shadow-lg border-2 border-white/40" />
                    ))}
                  </div>
                  <div className="bg-black/60 rounded-full px-4 py-1 text-white text-sm font-semibold">
                    {swipePreview.units} unit{swipePreview.units > 1 ? 's' : ''} horizontal
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1 items-center">
                    {Array.from({ length: swipePreview.units }).map((_, i) => (
                      <div key={i} style={{ backgroundColor: altColor, width: 28, height: 32, opacity: 0.9 }}
                        className="rounded shadow-lg border-2 border-white/40" />
                    ))}
                  </div>
                  <div className="bg-black/60 rounded-full px-4 py-1 text-white text-sm font-semibold">
                    {swipePreview.units} unit{swipePreview.units > 1 ? 's' : ''} vertical
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <BrickCanvas
          ref={canvasRef}
          rows={displayRows} scale={scale} showGrid={showGrid}
          selectedIds={selectedIds}
          primaryColor={primaryColor} altColor={altColor}
          mortarColor={mortarColor}
          mortarWidth={mortarWidth}
          effect={effect}
          insertAt={insertAt}
          screenWidth={canvasW} screenHeight={canvasH}
          onBrickClick={handleBrickClick}
          onVoidClick={handleVoidClick}
          bgImage={bgImageEl}
          bgOpacity={bgOpacity}
          bgScale={bgScale}
          bgRotation={bgRotation}
          symV={symV}
          symH={symH}
          symVAxisCol={symVAxisCol}
          symHAxisRow={symHAxisRow}
        />
        </div>
      </div>

      <Footer
        brickCount={rows.flat().filter(b => !b.isVoid).length}
        currentRowUnits={curRowUnits}
        maxUnits={maxUnits}
        onRepeatPattern={handleRepeatPattern}
        onRepeatRow={handleRepeatRow}
      />

      <PrintDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        getImageData={() => canvasRef.current?.renderForPrint({ width: size.w, height: size.h }) ?? null}
        pageSize={{ w: size.w, h: size.h }}
      />
    </div>
  );
}

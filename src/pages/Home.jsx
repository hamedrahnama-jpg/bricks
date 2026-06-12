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

export default function Home() {
  const { state: rows, setState: setRows, undo, redo, canUndo, canRedo } = useUndoRedo([]);
  const { modules, saveModule, deleteModule } = useModuleLibrary();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [symV, setSymV] = useState(false); // vertical axis → mirror left↔right
  const [symH, setSymH] = useState(false); // horizontal axis → mirror top↔bottom
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
      setIsFullscreen(document.fullscreenElement === canvasViewportRef.current);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

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
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch (error) {
      console.error('Unable to toggle fullscreen mode', error);
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

  // Re-use pre-computed canvasW
  const canvasW = _canvasW;

  const totalRowsH = (rows ? rows.length : 0) * _rowStep + mortarWidth;
  const canvasH = Math.max(viewportH, totalRowsH);
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

    // Vertical symmetry: mirror each row left ↔ right around the canvas centre.
    // We keep the left half of each row and produce a flipped copy for the right half.
    if (symV) {
      r = r.map(row => {
        const halfUnits = Math.floor(maxUnits / 2);
        // Collect bricks that fall within the left half
        const leftBricks = [];
        let filled = 0;
        for (const brick of row) {
          if (filled >= halfUnits) break;
          const take = Math.min(brick.units, halfUnits - filled);
          leftBricks.push(take < brick.units ? { ...brick, units: take } : brick);
          filled += take;
        }
        // Mirror: reverse, flipping the column order
        const mirrored = [...leftBricks].reverse().map(b => ({ ...b, id: b.id + '_mv' }));
        // Pad if needed
        const leftTotal = leftBricks.reduce((s, b) => s + b.units, 0);
        const mirrorTotal = mirrored.reduce((s, b) => s + b.units, 0);
        const gap = maxUnits - leftTotal - mirrorTotal;
        const pad = gap > 0 ? [makeBrick(gap, true, false, 1, 'transparent')] : [];
        return [...leftBricks, ...pad, ...mirrored];
      });
    }

    // Horizontal symmetry: mirror rows top ↔ bottom.
    // Keep the bottom half of the rows and mirror upward.
    if (symH) {
      const halfRows = Math.floor(r.length / 2);
      const bottom = r.slice(0, halfRows);
      const top = [...bottom].reverse().map(row =>
        row.map(b => ({ ...b, id: b.id + '_mh' }))
      );
      r = [...bottom, ...top];
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

      <div ref={canvasViewportRef} className="flex-1 min-h-0 w-full overflow-hidden bg-background">
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

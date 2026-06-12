import { useRef, useState } from 'react';
import { Grid, Printer, Download, Trash2, Plus, Minus, Save, FolderOpen, ChevronDown, Sparkles, Menu, X, ImagePlus, Undo2, Redo2, Maximize2, BookMarked, Palette, Sun, RotateCw, ZoomIn, ZoomOut, MoveHorizontal, MoveVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import TemplateMenu from './TemplateMenu';

const EFFECTS = [
  { id: 'none',       label: 'None' },
  { id: 'rough',      label: 'Rough Edges' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'sketch',     label: 'Sketch' },
  { id: 'hatched',    label: 'Hatched' },
];

const PALETTE_KEY = 'brickwall_palette';

function loadPalette() {
  try { return JSON.parse(localStorage.getItem(PALETTE_KEY)) || []; }
  catch { return []; }
}

function savePalette(colors) {
  localStorage.setItem(PALETTE_KEY, JSON.stringify(colors));
}

export default function Toolbar({
  primaryColor, altColor, onPrimaryChange, onAltChange,
  mortarColor, onMortarChange,
  mortarWidth, onMortarWidthChange,
  scale, onScaleChange, showGrid, onGridToggle, maxUnits,
  effect, onEffectChange,
  onPrint, onExportPDF, onExportPNG, onExportSVG, onClear, onLoadTemplate, onSave, onLoad,
  onBgImageLoad,
  onFullscreen,
  onUndo, onRedo, canUndo, canRedo,
  rows,
  modules = [],
  onSaveModule,
  onDeleteModule,
  onAppendModule,
  bgImage, onBgRemove,
  bgOpacity, onBgOpacityChange,
  bgScale, onBgScaleChange,
  bgRotation, onBgRotationChange,
  bgOffsetX, onBgOffsetXChange,
  bgOffsetY, onBgOffsetYChange
}) {
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(loadPalette);
  const [moduleName, setModuleName] = useState('');

  const compactButton = "h-7 min-w-7 flex items-center justify-center gap-1.5 rounded px-2 text-xs text-muted-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const activeButton = "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/25";

  const addPaletteColor = (color) => {
    if (palette.includes(color)) return;
    const next = [...palette, color].slice(-18);
    setPalette(next);
    savePalette(next);
  };

  const removePaletteColor = (color) => {
    const next = palette.filter(c => c !== color);
    setPalette(next);
    savePalette(next);
  };

  const handleSaveModule = () => {
    const name = moduleName.trim() || `Module ${modules.length + 1}`;
    onSaveModule?.(name, rows);
    setModuleName('');
  };

  const ColorPickers = () => (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-muted-foreground">Primary</label>
      <input type="color" value={primaryColor} onChange={e => onPrimaryChange(e.target.value)}
        title="Primary brick color"
        className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
      <label className="text-xs text-muted-foreground">Alt</label>
      <input type="color" value={altColor} onChange={e => onAltChange(e.target.value)}
        title="Alternate color"
        className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
      <label className="text-xs text-muted-foreground">Grout</label>
      <input type="color" value={mortarColor} onChange={e => onMortarChange(e.target.value)}
        title="Mortar / grout color"
        className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
      <label className="text-xs text-muted-foreground ml-1">Width</label>
      <input type="range" min="1" max="10" value={mortarWidth} onChange={e => onMortarWidthChange(Number(e.target.value))}
        title="Mortar width"
        className="w-20 accent-primary" />
      <span className="text-xs text-muted-foreground tabular-nums w-5">{mortarWidth}</span>
    </div>
  );

  const RibbonGroup = ({ title, children, className = "" }) => (
    <div className={`flex h-full min-w-fit flex-col justify-center gap-1 border-r border-border/80 px-3 ${className}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">{title}</div>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".brickwall,.json" onChange={onLoad} className="hidden" />
      <input ref={bgInputRef} type="file" accept="image/*" onChange={onBgImageLoad} className="hidden" />

      {/* Desktop ribbon */}
      <div className="hidden md:flex h-[76px] bg-card border-b border-border items-stretch flex-shrink-0 overflow-x-auto">
        <RibbonGroup title="Colors" className="pl-3">
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          <ColorPickers />
          <div className="flex max-w-[180px] items-center gap-1 overflow-hidden">
            {palette.map(color => (
              <div key={color} className="group relative h-5 w-5 flex-shrink-0">
                <button
                  style={{ backgroundColor: color }}
                  className="h-5 w-5 rounded border border-border shadow-sm"
                  title={`${color}: click primary, right-click alt`}
                  onClick={() => onPrimaryChange(color)}
                  onContextMenu={e => { e.preventDefault(); onAltChange(color); }}
                />
                <button
                  onClick={() => removePaletteColor(color)}
                  className="absolute -right-1 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-destructive text-white group-hover:flex"
                  title="Remove swatch"
                >
                  <X className="h-2 w-2" />
                </button>
              </div>
            ))}
            <button onClick={() => addPaletteColor(primaryColor)} title="Save primary color" className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-dashed border-border hover:border-primary">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: primaryColor }} />
            </button>
            <button onClick={() => addPaletteColor(altColor)} title="Save alternate color" className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-dashed border-border hover:border-primary">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: altColor }} />
            </button>
          </div>
        </RibbonGroup>

        <RibbonGroup title="Build">
          <button onClick={() => onScaleChange(Math.max(4, scale - 2))} className={compactButton} title="Zoom out">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center text-xs text-muted-foreground tabular-nums">{scale}px</span>
          <button onClick={() => onScaleChange(Math.min(96, scale + 2))} className={compactButton} title="Zoom in">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="whitespace-nowrap text-xs text-muted-foreground">{maxUnits}u/row</span>
          <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className={compactButton}>
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className={compactButton}>
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </RibbonGroup>

        <RibbonGroup title="Templates">
          <TemplateMenu primaryColor={primaryColor} altColor={altColor} maxUnits={maxUnits} onLoad={onLoadTemplate} />
        </RibbonGroup>

        <RibbonGroup title="Modules">
          <BookMarked className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={moduleName}
            onChange={e => setModuleName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveModule()}
            placeholder="Module name"
            className="h-7 w-28 rounded border border-border bg-background/60 px-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button onClick={handleSaveModule} disabled={!rows?.length} title="Save current rows as module" className={`${compactButton} ${activeButton}`}>
            <Plus className="h-3.5 w-3.5" />Save
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={compactButton}>
                Modules ({modules.length}) <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {modules.length === 0 ? (
                <DropdownMenuItem disabled>No modules saved</DropdownMenuItem>
              ) : modules.map(mod => (
                <DropdownMenuItem key={mod.id} onSelect={e => e.preventDefault()} className="gap-2">
                  <button onClick={() => onAppendModule?.(mod)} className="min-w-0 flex-1 truncate text-left text-xs">{mod.name}</button>
                  <button onClick={() => onDeleteModule?.(mod.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete module">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </RibbonGroup>

        <RibbonGroup title="View">
          <button onClick={onGridToggle} className={`${compactButton} ${showGrid ? activeButton : ''}`}>
            <Grid className="w-3.5 h-3.5" />Grid
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`${compactButton} ${effect !== 'none' ? activeButton : ''}`}>
                <Sparkles className="w-3.5 h-3.5" />
                {EFFECTS.find(e => e.id === effect)?.label ?? 'Effect'}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {EFFECTS.map(ef => (
                <DropdownMenuItem key={ef.id} onClick={() => onEffectChange(ef.id)}
                  className={effect === ef.id ? 'bg-accent font-medium' : ''}>
                  {ef.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={onFullscreen} className={compactButton} title="Fullscreen canvas">
            <Maximize2 className="w-3.5 h-3.5" />Fullscreen
          </button>
        </RibbonGroup>

        <RibbonGroup title="Background">
          <button onClick={() => bgInputRef.current?.click()} className={compactButton} title="Upload background image">
            <ImagePlus className="w-3.5 h-3.5" />Photo
          </button>
          {bgImage && (
            <>
              <Sun className="h-3.5 w-3.5 text-muted-foreground" />
              <input type="range" min="0" max="1" step="0.05" value={bgOpacity} onChange={e => onBgOpacityChange(parseFloat(e.target.value))} className="w-16 accent-primary" title="Background opacity" />
              <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
              <input type="range" min="0.1" max="3" step="0.05" value={bgScale} onChange={e => onBgScaleChange(parseFloat(e.target.value))} className="w-16 accent-primary" title="Background scale" />
              <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
              <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
              <input type="range" min="-180" max="180" step="1" value={bgRotation} onChange={e => onBgRotationChange(parseInt(e.target.value))} className="w-16 accent-primary" title="Background rotation" />
              <MoveHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <input type="range" min="-800" max="800" step="5" value={bgOffsetX} onChange={e => onBgOffsetXChange(parseInt(e.target.value))} className="w-16 accent-primary" title="Move background horizontally" />
              <MoveVertical className="h-3.5 w-3.5 text-muted-foreground" />
              <input type="range" min="-800" max="800" step="5" value={bgOffsetY} onChange={e => onBgOffsetYChange(parseInt(e.target.value))} className="w-16 accent-primary" title="Move background vertically" />
              <button onClick={onBgRemove} className={`${compactButton} text-destructive hover:bg-destructive/10`} title="Remove background image">
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </RibbonGroup>

        <div className="ml-auto flex h-full min-w-fit flex-col justify-center gap-1 px-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">File</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={compactButton}>
                File <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onSave}><Save className="w-3.5 h-3.5 mr-2" /> Save</DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><FolderOpen className="w-3.5 h-3.5 mr-2" /> Open</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onPrint}><Printer className="w-3.5 h-3.5 mr-2" /> Print</DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPDF}><Download className="w-3.5 h-3.5 mr-2" /> Export PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPNG}><Download className="w-3.5 h-3.5 mr-2" /> Export PNG</DropdownMenuItem>
              <DropdownMenuItem onClick={onExportSVG}><Download className="w-3.5 h-3.5 mr-2" /> Export SVG</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClear} className="text-destructive focus:text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* ── Mobile toolbar ── */}
      <div className="flex md:hidden h-12 bg-card border-b border-border items-center px-3 gap-2 flex-shrink-0">
        <span className="text-xs font-semibold text-foreground/70 flex-1">Brick Pattern Drawer</span>

        {/* Quick scale */}
        <div className="flex items-center gap-1">
          <button onClick={() => onScaleChange(Math.max(4, scale - 2))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-foreground/70">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">{scale}px</span>
          <button onClick={() => onScaleChange(Math.min(96, scale + 2))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-foreground/70">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button onClick={onUndo} disabled={!canUndo} title="Undo"
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-foreground/70 disabled:opacity-30 disabled:cursor-not-allowed">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo"
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-foreground/70 disabled:opacity-30 disabled:cursor-not-allowed">
          <Redo2 className="w-4 h-4" />
        </button>

        <button onClick={onFullscreen} title="Fullscreen canvas"
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-foreground/70">
          <Maximize2 className="w-4 h-4" />
        </button>

        <button onClick={() => setMobileOpen(v => !v)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-foreground/70">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Mobile slide-down menu ── */}
      {mobileOpen && (
        <div className="flex md:hidden flex-col gap-4 bg-card border-b border-border px-4 py-4 flex-shrink-0 z-50">
          {/* Colors */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Colors</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">Primary</label>
                <input type="color" value={primaryColor} onChange={e => onPrimaryChange(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border border-border bg-transparent" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">Alt</label>
                <input type="color" value={altColor} onChange={e => onAltChange(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border border-border bg-transparent" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">Grout</label>
                <input type="color" value={mortarColor} onChange={e => onMortarChange(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border border-border bg-transparent" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs text-muted-foreground">Grout Width</label>
              <input type="range" min="1" max="10" value={mortarWidth} onChange={e => onMortarWidthChange(Number(e.target.value))}
                className="flex-1 accent-primary" />
              <span className="text-xs text-muted-foreground tabular-nums w-5">{mortarWidth}</span>
            </div>
          </div>

          {/* Effect */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Effect</p>
            <div className="flex flex-wrap gap-2">
              {EFFECTS.map(ef => (
                <button key={ef.id} onClick={() => onEffectChange(ef.id)}
                  className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                    effect === ef.id ? 'bg-primary/20 text-primary border-primary/40' : 'border-border text-muted-foreground hover:bg-accent'
                  }`}>
                  {ef.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options row */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onGridToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${
                showGrid ? 'bg-primary/20 text-primary border-primary/40' : 'border-border text-muted-foreground hover:bg-accent'
              }`}>
              <Grid className="w-3.5 h-3.5" /> Grid
            </button>
            <TemplateMenu primaryColor={primaryColor} altColor={altColor} maxUnits={maxUnits} onLoad={(rows) => { onLoadTemplate(rows); setMobileOpen(false); }} />
          </div>

          {/* File actions */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">File</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => bgInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-border text-muted-foreground hover:bg-accent">
                <ImagePlus className="w-3.5 h-3.5" /> BG Photo
              </button>
              <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-border text-muted-foreground hover:bg-accent">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-border text-muted-foreground hover:bg-accent">
                <FolderOpen className="w-3.5 h-3.5" /> Open
              </button>
              <button onClick={onPrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-border text-muted-foreground hover:bg-accent">
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button onClick={onExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-border text-muted-foreground hover:bg-accent">
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
              <button onClick={onExportPNG} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-border text-muted-foreground hover:bg-accent">
                <Download className="w-3.5 h-3.5" /> Export PNG
              </button>
              <button onClick={onExportSVG} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-border text-muted-foreground hover:bg-accent">
                <Download className="w-3.5 h-3.5" /> Export SVG
              </button>
              <button onClick={() => { onClear(); setMobileOpen(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-destructive/40 text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          </div>

          {/* Swipe hints */}
          <p className="text-xs text-muted-foreground/60 text-center">
            Swipe right → horizontal brick &nbsp;|&nbsp; Swipe up ↑ vertical brick &nbsp;|&nbsp; Swipe left ← delete
          </p>
        </div>
      )}
    </>
  );
}

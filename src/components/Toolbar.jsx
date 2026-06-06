import { useRef, useState } from 'react';
import { Grid, Printer, Download, Trash2, Plus, Minus, Save, FolderOpen, ChevronDown, Sparkles, Menu, X, ImagePlus, Undo2, Redo2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import TemplateMenu from './TemplateMenu';

const EFFECTS = [
  { id: 'none',       label: 'None' },
  { id: 'rough',      label: 'Rough Edges' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'sketch',     label: 'Sketch' },
  { id: 'hatched',    label: 'Hatched' },
];

export default function Toolbar({
  primaryColor, altColor, onPrimaryChange, onAltChange,
  mortarColor, onMortarChange,
  mortarWidth, onMortarWidthChange,
  scale, onScaleChange, showGrid, onGridToggle, maxUnits,
  effect, onEffectChange,
  onPrint, onExportPDF, onExportPNG, onExportSVG, onClear, onLoadTemplate, onSave, onLoad,
  onBgImageLoad,
  onUndo, onRedo, canUndo, canRedo
}) {
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".brickwall,.json" onChange={onLoad} className="hidden" />
      <input ref={bgInputRef} type="file" accept="image/*" onChange={onBgImageLoad} className="hidden" />

      {/* ── Desktop toolbar ── */}
      <div className="hidden md:flex h-14 bg-card border-b border-border items-center px-3 gap-3 flex-shrink-0 overflow-x-auto">
        <ColorPickers />

        <div className="w-px h-6 bg-border flex-shrink-0" />

        {/* Scale controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onScaleChange(Math.max(16, scale - 2))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-foreground/70 transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">{scale}px</span>
          <button onClick={() => onScaleChange(Math.min(64, scale + 2))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-foreground/70 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{maxUnits}u/row</span>
        </div>

        <div className="w-px h-6 bg-border flex-shrink-0" />

        {/* Undo / Redo */}
        <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-foreground/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-foreground/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-6 bg-border flex-shrink-0" />
        <TemplateMenu primaryColor={primaryColor} altColor={altColor} maxUnits={maxUnits} onLoad={onLoadTemplate} />
        <div className="w-px h-6 bg-border flex-shrink-0" />

        <button onClick={onGridToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors flex-shrink-0 ${
            showGrid ? 'bg-primary/20 text-primary border border-primary/40' : 'hover:bg-accent text-muted-foreground'
          }`}>
          <Grid className="w-3.5 h-3.5" />Grid
        </button>

        <div className="w-px h-6 bg-border flex-shrink-0" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors flex-shrink-0 ${
              effect !== 'none' ? 'bg-primary/20 text-primary border border-primary/40' : 'hover:bg-accent text-muted-foreground'
            }`}>
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

        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => bgInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-accent text-muted-foreground transition-colors flex-shrink-0"
            title="Upload background image"
          >
            <ImagePlus className="w-3.5 h-3.5" /> BG Photo
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-accent text-muted-foreground transition-colors">
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
          <button onClick={() => onScaleChange(Math.max(16, scale - 2))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-foreground/70">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">{scale}px</span>
          <button onClick={() => onScaleChange(Math.min(64, scale + 2))}
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
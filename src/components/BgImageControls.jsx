import { MoveHorizontal, MoveVertical, RotateCw, ZoomIn, ZoomOut, Sun, X } from 'lucide-react';

export default function BgImageControls({
  bgImage,
  onRemove,
  opacity,
  onOpacityChange,
  scale,
  onScaleChange,
  rotation,
  onRotationChange,
  offsetX,
  onOffsetXChange,
  offsetY,
  onOffsetYChange
}) {
  if (!bgImage) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 bg-card border-b border-border px-4 py-2 flex-shrink-0 z-40">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Background</span>

      {/* Opacity */}
      <div className="flex items-center gap-1.5">
        <Sun className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="range" min="0" max="1" step="0.05"
          value={opacity}
          onChange={e => onOpacityChange(parseFloat(e.target.value))}
          className="w-20 accent-primary"
          title="Opacity"
        />
        <span className="text-xs text-muted-foreground tabular-nums w-8">{Math.round(opacity * 100)}%</span>
      </div>

      {/* Scale */}
      <div className="flex items-center gap-1">
        <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="range" min="0.1" max="3" step="0.05"
          value={scale}
          onChange={e => onScaleChange(parseFloat(e.target.value))}
          className="w-24 accent-primary"
          title="Scale"
        />
        <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground tabular-nums w-10">{Math.round(scale * 100)}%</span>
      </div>

      {/* Rotation */}
      <div className="flex items-center gap-1.5">
        <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="range" min="-180" max="180" step="1"
          value={rotation}
          onChange={e => onRotationChange(parseInt(e.target.value))}
          className="w-24 accent-primary"
          title="Rotation"
        />
        <span className="text-xs text-muted-foreground tabular-nums w-10">{rotation}°</span>
      </div>

      <div className="flex items-center gap-1.5">
        <MoveHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="range" min="-800" max="800" step="5"
          value={offsetX}
          onChange={e => onOffsetXChange(parseInt(e.target.value))}
          className="w-24 accent-primary"
          title="Move horizontally"
        />
        <span className="text-xs text-muted-foreground tabular-nums w-12">{offsetX}px</span>
      </div>

      <div className="flex items-center gap-1.5">
        <MoveVertical className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="range" min="-800" max="800" step="5"
          value={offsetY}
          onChange={e => onOffsetYChange(parseInt(e.target.value))}
          className="w-24 accent-primary"
          title="Move vertically"
        />
        <span className="text-xs text-muted-foreground tabular-nums w-12">{offsetY}px</span>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
      >
        <X className="w-3.5 h-3.5" /> Remove
      </button>
    </div>
  );
}

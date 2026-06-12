import { FlipHorizontal2, FlipVertical2, Repeat2 } from 'lucide-react';

const Key = ({ children }) => (
  <kbd className="font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border text-[10px]">
    {children}
  </kbd>
);

export default function Footer({
  brickCount,
  currentRowUnits,
  maxUnits,
  onRepeatPattern,
  onRepeatRow,
  symV,
  symH,
  onToggleSymV,
  onToggleSymH,
  symVAxisCol,
  symHAxisRow,
  onVAxisChange,
  onHAxisChange,
  maxRows
}) {
  const maxCol = Math.max(0, maxUnits - 1);
  const clampNumber = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const symmetryButton = "flex items-center gap-1 px-2 py-1 rounded border transition-colors text-xs font-medium";
  const activeSymmetry = "bg-violet-500/20 text-violet-400 border-violet-500/40";
  const inactiveSymmetry = "bg-secondary text-secondary-foreground border-border hover:bg-accent";

  return (
    <div className="min-h-11 bg-card border-t border-border flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 flex-shrink-0">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">{brickCount} bricks</span>
        <span className="tabular-nums">Row: {currentRowUnits} / {maxUnits} units</span>
        <button
          onClick={onRepeatPattern}
          className="flex items-center gap-1 px-2 py-1 rounded bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors text-xs font-medium"
          title="Repeat the current rows as a tiling pattern to fill the wall"
        >
          <Repeat2 className="w-3.5 h-3.5" /> Repeat Pattern
        </button>
        <button
          onClick={onRepeatRow}
          className="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-secondary-foreground border border-border hover:bg-accent transition-colors text-xs font-medium"
          title="Repeat the current row sequence to the end of the row"
        >
          <Repeat2 className="w-3.5 h-3.5" /> Repeat Row
        </button>
        <div className="flex items-center gap-1.5 border-l border-border pl-3">
          <span className="text-xs text-muted-foreground/70">Symmetry</span>
          <button
            onClick={onToggleSymV}
            className={`${symmetryButton} ${symV ? activeSymmetry : inactiveSymmetry}`}
            title="Vertical symmetry"
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" /> V
          </button>
          {symV && (
            <input
              type="number"
              min="0"
              max={maxCol}
              value={symVAxisCol}
              onChange={e => onVAxisChange(clampNumber(e.target.value, 0, maxCol))}
              className="h-7 w-12 rounded border border-border bg-background px-2 text-xs tabular-nums"
              title="Vertical mirror column"
            />
          )}
          <button
            onClick={onToggleSymH}
            className={`${symmetryButton} ${symH ? activeSymmetry : inactiveSymmetry}`}
            title="Horizontal symmetry"
          >
            <FlipVertical2 className="w-3.5 h-3.5" /> H
          </button>
          {symH && (
            <input
              type="number"
              min="0"
              max={maxRows}
              value={symHAxisRow}
              onChange={e => onHAxisChange(clampNumber(e.target.value, 0, maxRows))}
              className="h-7 w-12 rounded border border-border bg-background px-2 text-xs tabular-nums"
              title="Horizontal mirror row"
            />
          )}
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground/60">
        <span><Key>1</Key><Key>2</Key><Key>3</Key> Horizontal</span>
        <span><Key>4</Key><Key>5</Key><Key>6</Key> Vertical</span>
        <span><Key>A</Key>+key Alt color</span>
        <span><Key>Space</Key> Gap</span>
        <span><Key>⌫</Key> Undo</span>
        <span>Click to select</span>
      </div>
    </div>
  );
}

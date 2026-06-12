import { Repeat2 } from 'lucide-react';

const Key = ({ children }) => (
  <kbd className="font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border text-[10px]">
    {children}
  </kbd>
);

export default function Footer({ brickCount, currentRowUnits, maxUnits, onRepeatPattern, onRepeatRow }) {
  return (
    <div className="h-11 bg-card border-t border-border flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

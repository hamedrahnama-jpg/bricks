import { FlipHorizontal2, FlipVertical2 } from 'lucide-react';

export default function SymmetryControls({
  symV,
  symH,
  onToggleV,
  onToggleH,
  maxUnits,
  maxRows,
  symVAxisCol,
  symHAxisRow,
  onVAxisChange,
  onHAxisChange
}) {
  const maxCol = Math.max(0, maxUnits - 1);
  const btn = (active, onClick, Icon, label) => (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors flex-shrink-0 ${
        active
          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
          : 'hover:bg-accent text-muted-foreground'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  const clampNumber = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {btn(symV, onToggleV, FlipHorizontal2, 'Sym V')}
      {symV && (
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Col</label>
          <input
            type="number"
            min="0"
            max={maxCol}
            value={symVAxisCol}
            onChange={e => onVAxisChange(clampNumber(e.target.value, 0, maxCol))}
            className="h-7 w-14 rounded border border-border bg-background px-2 text-xs tabular-nums"
            title="Vertical mirror column"
          />
        </div>
      )}

      {btn(symH, onToggleH, FlipVertical2, 'Sym H')}
      {symH && (
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Row</label>
          <input
            type="number"
            min="0"
            max={maxRows}
            value={symHAxisRow}
            onChange={e => onHAxisChange(clampNumber(e.target.value, 0, maxRows))}
            className="h-7 w-14 rounded border border-border bg-background px-2 text-xs tabular-nums"
            title="Horizontal mirror row"
          />
        </div>
      )}
    </div>
  );
}

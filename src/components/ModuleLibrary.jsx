import { useState } from 'react';
import { BookMarked, Plus, Trash2, GripVertical, X, ChevronDown, ChevronUp } from 'lucide-react';

// Mini canvas preview of a module's rows
function ModulePreview({ rows, primaryColor, altColor, mortarColor }) {
  const scale = 6;
  const M = 1;
  const maxUnits = Math.max(...rows.map(r => r.reduce((s, b) => s + b.units, 0)), 1);
  const W = maxUnits * (scale + M) + M;
  const H = rows.length * (scale + M) + M;

  const resolveColor = (b) =>
    b.colorRole === 'primary' ? primaryColor :
    b.colorRole === 'alt' ? altColor :
    b.color;

  return (
    <svg width={W} height={H} style={{ display: 'block', flexShrink: 0 }}>
      <rect width={W} height={H} fill={mortarColor || '#444'} />
      {rows.map((row, rowIdx) => {
        let col = 0;
        return row.map(brick => {
          const bx = col * (scale + M) + M;
          const bw = brick.units * scale + (brick.units - 1) * M;
          const by = H - (rowIdx + 1) * (scale + M);
          col += brick.units;
          if (brick.isVoid) return null;
          return (
            <rect key={brick.id} x={bx} y={by} width={bw} height={scale}
              fill={resolveColor(brick)} />
          );
        });
      })}
    </svg>
  );
}

export default function ModuleLibrary({
  rows, primaryColor, altColor, mortarColor,
  modules, onSaveModule, onDeleteModule, onAppendModule,
  open, onToggle
}) {
  const [nameInput, setNameInput] = useState('');
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleSave = () => {
    const name = nameInput.trim() || `Module ${modules.length + 1}`;
    onSaveModule(name, rows);
    setNameInput('');
  };

  const handleDragStart = (e, mod) => {
    e.dataTransfer.setData('moduleId', String(mod.id));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex-shrink-0 bg-card border-b border-border">
      {/* Header toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <BookMarked className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-medium">Module Library</span>
        <span className="ml-1 text-muted-foreground/60">({modules.length})</span>
        <span className="ml-auto">{open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</span>
      </button>

      {open && (
        <div className="border-t border-border">
          {/* Save current rows as module */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Module name…"
              className="flex-1 bg-background/60 border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              onClick={handleSave}
              disabled={rows.length === 0}
              title="Save current canvas rows as a module"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" /> Save rows
            </button>
          </div>

          {/* Module list */}
          {modules.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 text-center py-3">No modules saved yet.</p>
          ) : (
            <div className="flex gap-2 px-3 py-2 overflow-x-auto">
              {modules.map((mod, idx) => (
                <div
                  key={mod.id}
                  draggable
                  onDragStart={e => handleDragStart(e, mod)}
                  onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={e => { e.preventDefault(); setDragOverIdx(null); onAppendModule(mod); }}
                  className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none
                    ${dragOverIdx === idx
                      ? 'border-primary bg-primary/10 scale-105'
                      : 'border-border bg-background/40 hover:border-primary/40 hover:bg-accent/30'}`}
                  style={{ minWidth: 80, maxWidth: 120 }}
                >
                  <div className="flex items-center gap-1 w-full justify-between">
                    <GripVertical className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    <button
                      onClick={() => onDeleteModule(mod.id)}
                      className="w-4 h-4 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground/40 hover:text-destructive transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="overflow-hidden rounded" style={{ maxWidth: 80, maxHeight: 48 }}>
                    <ModulePreview
                      rows={mod.rows}
                      primaryColor={primaryColor}
                      altColor={altColor}
                      mortarColor={mortarColor}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full text-center">
                    {mod.name}
                  </span>
                  <button
                    onClick={() => onAppendModule(mod)}
                    className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors w-full text-center"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
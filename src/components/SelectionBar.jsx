import { Check, Trash2, X } from 'lucide-react';

export default function SelectionBar({ count, color, onColorChange, onApply, onDelete, onDeselect }) {
  return (
    <div className="h-10 bg-yellow-950/40 border-b border-yellow-600/30 flex items-center px-4 gap-3 flex-shrink-0">
      <span className="text-xs text-yellow-400 font-medium">{count} selected</span>
      <div className="flex items-center gap-2">
        <label className="text-xs text-yellow-500/70">Color</label>
        <input type="color" value={color} onChange={e => onColorChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-yellow-600/40 bg-transparent" />
        <button onClick={onApply}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 transition-colors border border-yellow-600/30">
          <Check className="w-3 h-3" />
          Apply
        </button>
      </div>
      <div className="w-px h-4 bg-yellow-700/40" />
      <button onClick={onDelete}
        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs hover:bg-red-500/20 text-red-400 transition-colors">
        <Trash2 className="w-3 h-3" />
        Delete
      </button>
      <button onClick={onDeselect}
        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs hover:bg-accent text-muted-foreground transition-colors ml-auto">
        <X className="w-3 h-3" />
        Deselect
      </button>
    </div>
  );
}
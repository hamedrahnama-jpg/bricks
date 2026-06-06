import { FlipHorizontal2, FlipVertical2 } from 'lucide-react';

export default function SymmetryControls({ symV, symH, onToggleV, onToggleH }) {
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

  return (
    <>
      {btn(symV, onToggleV, FlipHorizontal2, 'Sym V')}
      {btn(symH, onToggleH, FlipVertical2,   'Sym H')}
    </>
  );
}
import { useState } from 'react';
import { Plus, X } from 'lucide-react';

const STORAGE_KEY = 'brickwall_palette';

function loadPalette() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function savePalette(colors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

export default function ColorPalette({ primaryColor, altColor, onPrimaryChange, onAltChange }) {
  const [palette, setPalette] = useState(loadPalette);

  const addColor = (color) => {
    if (palette.includes(color)) return;
    const next = [...palette, color].slice(-24); // max 24 swatches
    setPalette(next);
    savePalette(next);
  };

  const removeColor = (color) => {
    const next = palette.filter(c => c !== color);
    setPalette(next);
    savePalette(next);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-2 bg-card border-b border-border flex-shrink-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Palette</span>

      {/* Saved swatches */}
      {palette.map(color => (
        <div key={color} className="relative group">
          <button
            style={{ backgroundColor: color }}
            className="w-6 h-6 rounded border border-border shadow-sm hover:scale-110 transition-transform"
            title={color}
            onClick={() => onPrimaryChange(color)}
            onContextMenu={e => { e.preventDefault(); onAltChange(color); }}
          />
          <button
            onClick={() => removeColor(color)}
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-destructive text-white rounded-full items-center justify-center hidden group-hover:flex"
          >
            <X className="w-2 h-2" />
          </button>
        </div>
      ))}

      {/* Add current primary */}
      <button
        onClick={() => addColor(primaryColor)}
        className="w-6 h-6 rounded border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
        title={`Save primary color (${primaryColor})`}
      >
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: primaryColor }} />
      </button>

      {/* Add current alt */}
      <button
        onClick={() => addColor(altColor)}
        className="w-6 h-6 rounded border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
        title={`Save alt color (${altColor})`}
      >
        <div className="w-3 h-3 rounded-sm border border-white/30" style={{ backgroundColor: altColor }} />
      </button>

      <span className="text-xs text-muted-foreground/50 ml-1 hidden sm:inline">
        Click = primary · Right-click = alt · Hover to delete
      </span>
    </div>
  );
}
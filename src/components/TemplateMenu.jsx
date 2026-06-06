import { useState } from 'react';
import { LayoutTemplate, ChevronDown } from 'lucide-react';

let _tid = 9000;
const tid = () => String(_tid++);

const TEMPLATES = [
  { id: 'running', name: 'Running Bond', desc: 'Classic half-brick offset per row' },
  { id: 'stack', name: 'Stack Bond', desc: 'Bricks aligned in straight columns' },
  { id: 'third', name: 'Third Bond', desc: 'One-third offset each row' },
  { id: 'flemish', name: 'Flemish Bond', desc: 'Alternating long and short bricks' },
];

function generateRows(type, maxUnits, primaryColor, altColor) {
  const rows = [];
  const numRows = 8;

  for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
    const row = [];
    let col = 0;
    let offset = 0;

    if (type === 'running') offset = (rowIdx % 2 === 0) ? 0 : 1;
    if (type === 'third') offset = (rowIdx % 3) * Math.floor(maxUnits / 3);
    if (type === 'stack') offset = 0;

    if (offset > 0) {
      row.push({ id: tid(), units: offset, isVoid: false, isVertical: false, verticalUnits: 1, color: primaryColor, colorRole: 'primary' });
      col += offset;
    }

    while (col < maxUnits) {
      if (type === 'flemish') {
        const isEvenRow = rowIdx % 2 === 0;
        const isEvenBrick = row.length % 2 === 0;
        const useAlt = isEvenRow ? isEvenBrick : !isEvenBrick;
        const units = useAlt ? 1 : 2;
        if (col + units > maxUnits) break;
        const role = useAlt ? 'alt' : 'primary';
        row.push({ id: tid(), units, isVoid: false, isVertical: false, verticalUnits: 1, color: useAlt ? altColor : primaryColor, colorRole: role });
        col += units;
      } else {
        const remaining = maxUnits - col;
        const units = Math.min(2, remaining);
        const isAlt = (type === 'stack' || type === 'third') && row.length % 2 !== 0;
        const color = isAlt ? altColor : primaryColor;
        row.push({ id: tid(), units, isVoid: false, isVertical: false, verticalUnits: 1, color, colorRole: isAlt ? 'alt' : 'primary' });
        col += units;
      }
    }

    rows.push(row);
  }

  return rows;
}

export default function TemplateMenu({ primaryColor, altColor, maxUnits, onLoad }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs hover:bg-accent text-muted-foreground transition-colors"
      >
        <LayoutTemplate className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Templates</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-xl w-52 py-1 overflow-hidden">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  const rows = generateRows(t.id, maxUnits, primaryColor, altColor);
                  onLoad(rows);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors"
              >
                <div className="text-xs font-medium text-foreground">{t.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
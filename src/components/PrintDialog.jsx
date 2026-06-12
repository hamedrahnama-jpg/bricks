import { useState, useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';

const PAPER_SIZES = {
  A4:     { w: 210, h: 297, label: 'A4 (210 × 297 mm)' },
  A3:     { w: 297, h: 420, label: 'A3 (297 × 420 mm)' },
  Letter: { w: 215.9, h: 279.4, label: 'Letter (8.5 × 11 in)' },
  Legal:  { w: 215.9, h: 355.6, label: 'Legal (8.5 × 14 in)' },
  Tabloid:{ w: 279.4, h: 431.8, label: 'Tabloid (11 × 17 in)' },
};

const SCALE_MODES = [
  { id: 'fit',    label: 'Fit to page' },
  { id: 'fill',   label: 'Fill page' },
  { id: 'actual', label: 'Actual size (crop if needed)' },
];

// 96 dpi → mm conversion
const PX_PER_MM = 96 / 25.4;

export default function PrintDialog({ open, onClose, getImageData, pageSize }) {
  const customW = Math.max(1, (pageSize?.w || 1) / PX_PER_MM);
  const customH = Math.max(1, (pageSize?.h || 1) / PX_PER_MM);
  const customPortrait = {
    w: Math.min(customW, customH),
    h: Math.max(customW, customH),
    label: `Screen (${Math.round(customW)} × ${Math.round(customH)} mm)`
  };
  const paperSizes = { Screen: customPortrait, ...PAPER_SIZES };

  const [paper, setPaper] = useState('Screen');
  const [orientation, setOrientation] = useState('portrait');
  const [scaleMode, setScaleMode] = useState('fit');
  const [printing, setPrinting] = useState(false);
  const previewRef = useRef(null);

  // Effective page dims in mm
  const base = paperSizes[paper];
  const pageW_mm = orientation === 'portrait' ? base.w : base.h;
  const pageH_mm = orientation === 'portrait' ? base.h : base.w;

  // Preview container sizing — show a proportional thumbnail
  const PREVIEW_MAX_W = 260; // px
  const PREVIEW_MAX_H = 340; // px
  const aspect = pageW_mm / pageH_mm;
  const previewW = Math.min(PREVIEW_MAX_W, PREVIEW_MAX_H * aspect);
  const previewH = previewW / aspect;

  const [imgSrc, setImgSrc] = useState(null);
  const [imgNaturalW, setImgNaturalW] = useState(1);
  const [imgNaturalH, setImgNaturalH] = useState(1);

  useEffect(() => {
    if (!open) return;
    setPaper('Screen');
    setOrientation((pageSize?.w || 0) >= (pageSize?.h || 0) ? 'landscape' : 'portrait');
    const data = getImageData();
    if (!data) return;
    setImgSrc(data);
    const tmp = new Image();
    tmp.onload = () => { setImgNaturalW(tmp.width); setImgNaturalH(tmp.height); };
    tmp.src = data;
  }, [open, getImageData, pageSize?.w, pageSize?.h]);

  // Compute rendered image rect inside the preview box (in preview-px)
  const getImgRect = (pW, pH) => {
    const imgAspect = imgNaturalW / imgNaturalH;
    if (scaleMode === 'fit') {
      if (imgAspect > pW / pH) return { w: pW, h: pW / imgAspect, x: 0, y: pH - pW / imgAspect };
      return { w: pH * imgAspect, h: pH, x: 0, y: 0 };
    }
    if (scaleMode === 'fill') {
      if (imgAspect > pW / pH) return { w: pH * imgAspect, h: pH, x: (pW - pH * imgAspect) / 2, y: 0 };
      return { w: pW, h: pW / imgAspect, x: 0, y: (pH - pW / imgAspect) / 2 };
    }
    // actual — 1 canvas px = 1 screen px, shown at preview scale
    return { w: imgNaturalW * (pW / (pageW_mm * PX_PER_MM)), h: imgNaturalH * (pW / (pageW_mm * PX_PER_MM)), x: 0, y: pH - imgNaturalH * (pW / (pageW_mm * PX_PER_MM)) };
  };

  const rect = getImgRect(previewW, previewH);

  const handlePrint = () => {
    if (!imgSrc) return;
    setPrinting(true);

    const pageW = pageW_mm;
    const pageH = pageH_mm;

    let css = '';
    if (scaleMode === 'fit') {
      css = `img { max-width:${pageW}mm; max-height:${pageH}mm; width:auto; height:auto; display:block; position:absolute; bottom:0; left:0; }`;
    } else if (scaleMode === 'fill') {
      css = `img { width:${pageW}mm; height:${pageH}mm; object-fit:cover; display:block; }`;
    } else {
      css = `img { width:auto; height:auto; display:block; position:absolute; bottom:0; left:0; }`;
    }

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><style>
      @page { size: ${pageW}mm ${pageH}mm; margin: 0; }
      html, body { margin: 0; padding: 0; width: ${pageW}mm; height: ${pageH}mm; overflow: hidden; background: white; position: relative; }
      ${css}
      @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    </style></head><body>
      <img src="${imgSrc}" />
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
    </body></html>`);
    win.document.close();
    setPrinting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Print Preview</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row gap-6 p-5">
          {/* Controls */}
          <div className="flex flex-col gap-4 min-w-[180px]">
            {/* Paper size */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Paper Size</label>
              <div className="flex flex-col gap-1">
                {Object.entries(paperSizes).map(([key, val]) => (
                  <button key={key} onClick={() => setPaper(key)}
                    className={`text-left px-3 py-1.5 rounded text-xs border transition-colors ${paper === key ? 'bg-primary/20 text-primary border-primary/40' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Orientation</label>
              <div className="flex gap-2">
                {['portrait', 'landscape'].map(o => (
                  <button key={o} onClick={() => setOrientation(o)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs border transition-colors capitalize ${orientation === o ? 'bg-primary/20 text-primary border-primary/40' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Scale mode */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Scale</label>
              <div className="flex flex-col gap-1">
                {SCALE_MODES.map(m => (
                  <button key={m.id} onClick={() => setScaleMode(m.id)}
                    className={`text-left px-3 py-1.5 rounded text-xs border transition-colors ${scaleMode === m.id ? 'bg-primary/20 text-primary border-primary/40' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <span className="text-xs text-muted-foreground">Preview</span>
            <div
              style={{ width: previewW, height: previewH, position: 'relative', flexShrink: 0 }}
              className="border-2 border-border rounded bg-white shadow-lg overflow-hidden"
            >
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt="Print preview"
                  style={{
                    position: 'absolute',
                    left: rect.x,
                    top: rect.y,
                    width: rect.w,
                    height: rect.h,
                    display: 'block',
                  }}
                />
              )}
            </div>
            <span className="text-[11px] text-muted-foreground/60">
              {pageW_mm}mm × {pageH_mm}mm
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button onClick={onClose} className="px-4 py-1.5 rounded text-xs border border-border text-muted-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={!imgSrc || printing}
            className="flex items-center gap-2 px-4 py-1.5 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            {printing ? 'Opening...' : 'Print'}
          </button>
        </div>
      </div>
    </div>
  );
}

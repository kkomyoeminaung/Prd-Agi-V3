import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Info, Zap } from 'lucide-react';

interface PatthanaHeatmapProps {
  dominantPaccayaIndex: number;
  confidence: number;
}

const MATRIX_WEIGHTS = [
  [1.0, 0.1, 0.8], // K -> K, K -> Ak, K -> Ab
  [0.9, 0.2, 0.7], // Ak -> K, Ak -> Ak, Ak -> Ab
  [0.8, 0.3, 1.0]  // Ab -> K, Ab -> Ak, Ab -> Ab
];

const LABELS = ['K', 'Ak', 'Ab'];
const FULL_LABELS = {
  K: 'Kusala (Wholesome)',
  Ak: 'Akusala (Unwholesome)',
  Ab: 'Abyakata (Neutral)'
};

export const PatthanaHeatmap: React.FC<PatthanaHeatmapProps> = ({ dominantPaccayaIndex, confidence }) => {
  // Map 24 Paccayas to 9 transition cells
  const activeCellIndex = dominantPaccayaIndex % 9;
  const activeRow = Math.floor(activeCellIndex / 3);
  const activeCol = activeCellIndex % 3;

  const getCellColor = (weight: number, isActive: boolean) => {
    // Green (high) to Red (low)
    // weight 1.0 -> green, 0.0 -> red
    const r = Math.floor(255 * (1 - weight));
    const g = Math.floor(255 * weight);
    const b = 100;
    return `rgba(${r}, ${g}, ${b}, ${isActive ? 0.8 : 0.3})`;
  };

  const kappaEth = useMemo(() => {
    const w = MATRIX_WEIGHTS[activeRow][activeCol];
    return Math.sqrt(1 - w * confidence);
  }, [activeRow, activeCol, confidence]);

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Paṭṭhāna Transition Heatmap
        </h3>
        <div className="group relative">
          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
          <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-[#111827] border border-[#192033] rounded-lg text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
            <p className="font-bold text-primary mb-1">Causal Transition Matrix</p>
            <p>Visualizes the flow between Wholesome (K), Unwholesome (Ak), and Neutral (Ab) states based on dominant causal conditions.</p>
            <p className="mt-2 font-mono">κ_eth = √(1 - W_ij × C)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-around text-[10px] font-mono text-muted-foreground py-4">
          {LABELS.map(l => <div key={l} className="text-right pr-2">{l}</div>)}
        </div>

        {/* Matrix */}
        <div className="col-span-3 grid grid-cols-3 gap-2">
          {MATRIX_WEIGHTS.map((row, i) => (
            row.map((weight, j) => {
              const isActive = i === activeRow && j === activeCol;
              return (
                <motion.div
                  key={`${i}-${j}`}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    borderColor: isActive ? '#3b82f6' : '#192033',
                    boxShadow: isActive ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                  className="aspect-square rounded-lg border flex flex-col items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: getCellColor(weight, isActive) }}
                >
                  <span className="text-[10px] font-mono font-bold text-white/80">{weight.toFixed(1)}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="active-glow"
                      className="absolute inset-0 bg-primary/20 animate-pulse"
                    />
                  )}
                </motion.div>
              );
            })
          ))}
        </div>

        {/* X-axis labels */}
        <div />
        <div className="col-span-3 flex justify-around text-[10px] font-mono text-muted-foreground">
          {LABELS.map(l => <div key={l}>{l}</div>)}
        </div>
      </div>

      <div className="pt-4 border-t border-[#192033] grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Active Transition</p>
          <p className="text-sm font-bold text-primary">
            {LABELS[activeRow]} → {LABELS[activeCol]}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Ethical Curvature (κ_eth)</p>
          <p className="text-sm font-mono font-bold text-white">
            {kappaEth.toFixed(4)}
          </p>
        </div>
      </div>
      
      <div className="text-[9px] text-muted-foreground italic leading-tight">
        * K: Kusala, Ak: Akusala, Ab: Abyakata. Transitions are mapped from the 24 Paccaya conditions.
      </div>
    </div>
  );
};

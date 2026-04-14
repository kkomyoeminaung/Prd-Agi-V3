import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Zap, Info, Waves, Sliders, AlertCircle } from 'lucide-react';

interface QuantumInterferenceProps {
  initialStatement1?: string;
  initialStatement2?: string;
}

export const QuantumInterference: React.FC<QuantumInterferenceProps> = ({
  initialStatement1 = "Trend is Bullish",
  initialStatement2 = "Trend is Bearish"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [s1, setS1] = useState(initialStatement1);
  const [s2, setS2] = useState(initialStatement2);
  const [amp1, setAmp1] = useState(0.5);
  const [amp2, setAmp2] = useState(0.5);
  const [phase, setPhase] = useState(Math.PI); // Default to conflict (destructive)

  const metrics = useMemo(() => {
    // κ_q = √((1 - cos(φ))/2)
    const kq = Math.sqrt((1 - Math.cos(phase)) / 2);
    const isConstructive = Math.cos(phase) > 0;
    const interferenceType = isConstructive ? "Constructive" : "Destructive";
    const confidenceShift = Math.cos(phase) * ((amp1 + amp2) / 2);
    
    return { kq, interferenceType, confidenceShift, isConstructive };
  }, [phase, amp1, amp2]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const midY = height / 2;
      const scale = 40;
      const freq = 0.05;

      // Draw Wave 1 (Statement A)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)'; // Blue
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x++) {
        const y = midY + Math.sin(x * freq - time) * amp1 * scale - 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Wave 2 (Statement B)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.4)'; // Red
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x++) {
        const y = midY + Math.sin(x * freq - time + phase) * amp2 * scale + 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Interference Pattern (Superposition)
      ctx.beginPath();
      ctx.strokeStyle = metrics.isConstructive ? '#10b981' : '#f59e0b'; // Green or Orange
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      for (let x = 0; x < width; x++) {
        const w1 = Math.sin(x * freq - time) * amp1;
        const w2 = Math.sin(x * freq - time + phase) * amp2;
        const y = midY + (w1 + w2) * scale;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [amp1, amp2, phase, metrics.isConstructive]);

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Waves className="w-5 h-5 text-primary" />
          Quantum Causal Interference
        </h3>
        <div className="group relative">
          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
          <div className="absolute right-0 bottom-full mb-2 w-72 p-3 bg-[#111827] border border-[#192033] rounded-lg text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
            <p className="font-bold text-primary mb-1">Superposition Analysis</p>
            <p>Visualizes logical conflict as wave interference. Destructive interference (out of phase) indicates high causal tension.</p>
            <p className="mt-2 font-mono">κ_q = √((1 - Re⟨ψ|U|ψ⟩)/2)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Tensor Statement A</label>
            <input 
              type="text" 
              value={s1} 
              onChange={(e) => setS1(e.target.value)}
              className="w-full bg-[#111827] border border-[#192033] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <input 
              type="range" min="0" max="1" step="0.01" value={amp1} 
              onChange={(e) => setAmp1(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#192033] rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Tensor Statement B</label>
            <input 
              type="text" 
              value={s2} 
              onChange={(e) => setS2(e.target.value)}
              className="w-full bg-[#111827] border border-[#192033] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <input 
              type="range" min="0" max="1" step="0.01" value={amp2} 
              onChange={(e) => setAmp2(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#192033] rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Phase Shift (φ)</label>
              <span className="text-[10px] font-mono text-primary">{(phase / Math.PI).toFixed(2)}π</span>
            </div>
            <input 
              type="range" min="0" max={Math.PI * 2} step="0.01" value={phase} 
              onChange={(e) => setPhase(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#192033] rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        <div className="relative bg-[#07090f] rounded-lg border border-[#192033] overflow-hidden flex flex-col">
          <canvas 
            ref={canvasRef} 
            width={400} 
            height={200} 
            className="w-full h-[180px]"
          />
          <div className="p-3 bg-[#111827]/50 border-t border-[#192033] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                metrics.isConstructive ? "bg-green-400 animate-pulse" : "bg-orange-400"
              )} />
              <span className="text-[10px] font-mono uppercase tracking-tighter">
                {metrics.interferenceType} Interference
              </span>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-mono text-muted-foreground uppercase">Quantum Curvature (κ_q)</p>
              <p className="text-sm font-mono font-bold text-primary">{metrics.kq.toFixed(4)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 rounded-lg bg-[#111827] border border-[#192033]">
          <p className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Confidence Delta</p>
          <p className={cn(
            "text-lg font-bold",
            metrics.confidenceShift >= 0 ? "text-green-400" : "text-red-400"
          )}>
            {metrics.confidenceShift >= 0 ? '+' : ''}{(metrics.confidenceShift * 100).toFixed(1)}%
          </p>
        </div>
        <div className="p-3 rounded-lg bg-[#111827] border border-[#192033]">
          <p className="text-[9px] font-mono text-muted-foreground uppercase mb-1">State Coherence</p>
          <p className="text-lg font-bold text-blue-400">
            {((1 - metrics.kq) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="p-3 rounded-lg bg-[#111827] border border-[#192033] flex items-center gap-3">
          <AlertCircle className={cn(
            "w-5 h-5",
            metrics.kq > 0.5 ? "text-red-400 animate-bounce" : "text-muted-foreground"
          )} />
          <div>
            <p className="text-[9px] font-mono text-muted-foreground uppercase">Tension Alert</p>
            <p className="text-xs font-medium">
              {metrics.kq > 0.7 ? "Critical Conflict" : metrics.kq > 0.4 ? "Moderate Dissonance" : "Stable Superposition"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

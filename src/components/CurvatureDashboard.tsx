import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Zap, Activity, Brain } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CurvatureDashboardProps {
  currentKappa: number;
  awareness: number;
  dominantPaccaya: { name: string; weight: number } | undefined;
}

export const CurvatureDashboard: React.FC<CurvatureDashboardProps> = ({ 
  currentKappa, 
  awareness, 
  dominantPaccaya 
}) => {
  const [history, setHistory] = useState<number[]>(() => {
    const saved = localStorage.getItem('prd_kappa_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (currentKappa !== undefined) {
      setHistory(prev => {
        const newHistory = [...prev, currentKappa].slice(-20);
        localStorage.setItem('prd_kappa_history', JSON.stringify(newHistory));
        return newHistory;
      });
    }
  }, [currentKappa]);

  const data = {
    labels: history.map((_, i) => i + 1),
    datasets: [
      {
        label: 'Causal Curvature (κ)',
        data: history,
        borderColor: (context: any) => {
          const val = context.raw;
          if (val < 0.2) return '#4ade80'; // Green
          if (val < 0.5) return '#facc15'; // Yellow
          return '#f87171'; // Red
        },
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: (context: any) => {
          const val = context.raw;
          if (val < 0.2) return '#4ade80';
          if (val < 0.5) return '#facc15';
          return '#f87171';
        }
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#0c0f1a',
        titleColor: '#dce6f0',
        bodyColor: '#dce6f0',
        borderColor: '#192033',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        min: 0,
        max: 1,
        grid: {
          color: '#192033'
        },
        ticks: {
          color: '#94a3b8'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          display: false
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[#192033] bg-[#0c0f1a]">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Curvature (κ)</p>
          <p className={`text-2xl font-bold ${currentKappa < 0.2 ? 'text-green-400' : currentKappa < 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
            {currentKappa.toFixed(4)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {currentKappa < 0.2 ? 'Coherent State' : currentKappa < 0.5 ? 'Transitioning' : 'High Tension'}
          </p>
        </div>
        
        <div className="p-4 rounded-xl border border-[#192033] bg-[#0c0f1a]">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Awareness (ρ)</p>
          <p className="text-2xl font-bold text-primary">
            {(awareness * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Density of Intelligence</p>
        </div>

        <div className="p-4 rounded-xl border border-[#192033] bg-[#0c0f1a]">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Dominant Paccaya</p>
          <p className="text-lg font-bold text-blue-400 truncate">
            {dominantPaccaya?.name || 'None'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Weight: {(dominantPaccaya?.weight || 0).toFixed(4)}</p>
        </div>
      </div>

      <div className="h-64 p-4 rounded-xl border border-[#192033] bg-[#0c0f1a]">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Real-time Curvature Manifold
          </h4>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /> Coherent</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Tense</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> Critical</span>
          </div>
        </div>
        <div className="h-48">
          <Line data={data} options={options} />
        </div>
      </div>
    </div>
  );
};

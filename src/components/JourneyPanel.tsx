import React from 'react';
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
import { persistence } from '../lib/persistence';
import { TrendingDown, Zap, History } from 'lucide-react';

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

export const JourneyPanel: React.FC = () => {
  const trend = persistence.loadKappaTrend();
  const optSteps = persistence.loadOptSteps();
  const keywords = persistence.loadKeywords();
  
  const sortedKeywords = Object.entries(keywords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const data = {
    labels: trend.map(t => new Date(t.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Causal Curvature (κ)',
        data: trend.map(t => t.kappa),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0c0f1a',
        titleColor: '#94a3b8',
        bodyColor: '#dce6f0',
        borderColor: '#192033',
        borderWidth: 1,
      }
    },
    scales: {
      x: { display: false },
      y: {
        min: 0,
        max: 1,
        grid: { color: 'rgba(25, 32, 51, 0.5)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Your PRD Journey
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
            Law 4 Optimization: {optSteps} Steps
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 h-[200px]">
          <Line data={data} options={options} />
        </div>
        
        <div className="space-y-4">
          <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Top Causal Nodes</h4>
          <div className="space-y-2">
            {sortedKeywords.length > 0 ? sortedKeywords.map(([word, count]) => (
              <div key={word} className="flex items-center justify-between p-2 bg-[#111827] rounded border border-[#192033]">
                <span className="text-sm font-medium text-[#dce6f0] capitalize">{word}</span>
                <span className="text-xs font-mono text-primary">{count}x</span>
              </div>
            )) : (
              <div className="text-xs text-muted-foreground italic">No data yet...</div>
            )}
          </div>
          
          <div className="pt-4 border-t border-[#192033]">
            <div className="flex items-center gap-2 text-green-400">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-bold">Entropy Reduction Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

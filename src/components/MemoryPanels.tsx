import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Brain, Database, Moon, Search, Clock, Trash2, ExternalLink, RefreshCw, Zap, Shield, Activity, MessageCircle, CheckCircle, Download, Upload, LineChart, Settings2 } from 'lucide-react';
import { prdDB, Conversation, KnowledgeChunk, DreamLog } from '../lib/db';
import { DreamAgent } from '../services/dreamAgent';
import { coreEngine } from '../services/coreEngine';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const MemoryBank: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    const data = searchTerm 
      ? await prdDB.searchConversations(searchTerm)
      : await prdDB.getRecentConversations(10);
    setConversations(data);
  };

  useEffect(() => { load(); }, [searchTerm]);

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Memory Bank
        </h3>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search memories..."
            className="bg-[#111827] border border-[#192033] rounded-md pl-7 pr-2 py-1 text-[10px] outline-none focus:border-primary/50 w-32"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {conversations.map((c, i) => (
          <div key={i} className="p-3 rounded-lg bg-[#111827] border border-[#192033] hover:border-primary/30 transition-all group">
            <div className="flex justify-between items-start mb-1">
              <p className="text-[10px] font-bold text-primary truncate max-w-[150px]">{c.query}</p>
              <span className="text-[8px] text-muted-foreground font-mono">{new Date(c.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-2 group-hover:line-clamp-none transition-all">{c.response}</p>
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">No memories found.</p>
        )}
      </div>
    </div>
  );
};

export const KnowledgeBase: React.FC = () => {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = async () => {
    setIsRefreshing(true);
    const db = await prdDB.getDB();
    const data = await db.getAll('knowledge');
    setChunks(data.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20));
    setIsRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Knowledge Base
        </h3>
        <button onClick={load} className={isRefreshing ? "animate-spin" : ""}>
          <RefreshCw className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
        </button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {chunks.map((k, i) => (
          <div key={i} className="p-3 rounded-lg bg-[#111827] border border-[#192033]">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[8px] font-mono text-primary uppercase tracking-widest truncate max-w-[120px]">{k.source}</span>
              <span className="text-[8px] text-muted-foreground">{new Date(k.timestamp).toLocaleDateString()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-3">{k.content}</p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {k.keywords.slice(0, 3).map(kw => (
                <span key={kw} className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">#{kw}</span>
              ))}
            </div>
          </div>
        ))}
        {chunks.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">Knowledge base is empty.</p>
        )}
      </div>
    </div>
  );
};

export const DreamLogPanel: React.FC = () => {
  const [logs, setLogs] = useState<DreamLog[]>([]);

  const load = async () => {
    const data = await prdDB.getDreamLogs(20);
    setLogs(data);
  };

  useEffect(() => {
    load();
    DreamAgent.init(() => load());
  }, []);

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Moon className="w-5 h-5 text-primary" />
          Dream Log
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-green-400 animate-pulse uppercase tracking-widest">Researching...</span>
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {logs.map((l, i) => (
          <div key={i} className="p-3 rounded-lg bg-[#111827] border border-[#192033] relative overflow-hidden">
            <div className="absolute top-0 right-0 h-full w-1 bg-primary/20" style={{ height: `${l.relevance * 100}%` }} />
            <div className="flex justify-between items-start mb-1">
              <p className="text-[10px] font-bold text-primary">{l.topic}</p>
              <span className="text-[8px] text-muted-foreground font-mono">{new Date(l.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground italic">"{l.summary}"</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-[#192033] rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${l.relevance * 100}%` }} />
              </div>
              <span className="text-[8px] font-mono text-muted-foreground">Rel: {(l.relevance * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">No research logs yet.</p>
        )}
      </div>
    </div>
  );
};

export const CausalPlasticity: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const load = () => setStats(coreEngine.getStats());
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        Causal Plasticity
      </h3>
      <div className="space-y-4">
        {stats.topPaccayas.map((p: any, i: number) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="font-bold text-primary uppercase tracking-widest">{p.name}</span>
              <span className="font-mono text-muted-foreground">{(p.weight * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-[#111827] rounded-full overflow-hidden border border-[#192033]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${p.weight * 100}%` }}
                className="h-full bg-primary"
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground leading-relaxed italic">
        Weights evolve via gradient descent: w_a(t+1) = w_a(t) - η * (∂κ/∂w_a). Curvature (κ) drives the learning rate η.
      </p>
    </div>
  );
};

export const SystemHealth: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const load = () => setStats(coreEngine.getStats());

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const runDiagnostic = async () => {
    setIsDiagnosing(true);
    await coreEngine.runDiagnostic();
    setIsDiagnosing(false);
    load();
  };

  if (!stats) return null;

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          System Health
        </h3>
        <button 
          onClick={runDiagnostic}
          disabled={isDiagnosing}
          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
        >
          <Activity className={cn("w-3 h-3", isDiagnosing && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HealthStat label="Integrity" value={stats.integrityStatus} color={stats.integrityStatus === 'Secure' ? 'text-green-400' : 'text-red-400'} />
        <HealthStat label="Curvature (κ)" value={stats.currentKappa.toFixed(3)} color={stats.currentKappa > 0.4 ? 'text-yellow-400' : 'text-primary'} />
        <HealthStat label="Rollbacks" value={stats.rollbackCount} />
        <HealthStat label="Last Snap" value={stats.lastSnapshotTime ? new Date(stats.lastSnapshotTime).toLocaleTimeString() : 'None'} />
      </div>

      <div className="p-3 rounded-lg bg-[#111827] border border-[#192033]">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${stats.integrityStatus === 'Secure' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Core Protection Active</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed">
          Snapshots taken every 10 interactions. Automatic rollback triggered if κ {'>'} 0.6 or checksum mismatch detected.
        </p>
      </div>
    </div>
  );
};

function HealthStat({ label, value, color = "text-muted-foreground" }: { label: string, value: any, color?: string }) {
  return (
    <div className="p-2 rounded-lg bg-[#111827] border border-[#192033]">
      <p className="text-[8px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-xs font-mono font-bold", color)}>{value}</p>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export const SelfRefinementLog: React.FC = () => {
  const [refinements, setRefinements] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await prdDB.getRefinements();
      setRefinements(data);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        Self-Refinement Log
      </h3>
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {refinements.map((r, i) => (
          <div key={i} className="p-3 rounded-lg bg-[#111827] border border-[#192033] space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[8px] font-mono text-primary uppercase tracking-widest">Refinement #{refinements.length - i}</span>
              <span className="text-[8px] text-muted-foreground">{new Date(r.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground italic">Critique: {r.critique}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-[#192033] rounded-full overflow-hidden">
                <div className="h-full bg-green-400" style={{ width: `${r.improvementScore * 100}%` }} />
              </div>
              <span className="text-[8px] font-mono text-muted-foreground">Imp: {(r.improvementScore * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
        {refinements.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">No refinements logged yet.</p>
        )}
      </div>
    </div>
  );
};

export const ValidationDashboard: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const load = async () => {
    const data = await prdDB.getValidationLogs();
    setLogs(data);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const runValidation = async () => {
    setIsValidating(true);
    await coreEngine.runValidation();
    setIsValidating(false);
    load();
  };

  const latest = logs[0];

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          Validation Dashboard
        </h3>
        <button 
          onClick={runValidation}
          disabled={isValidating}
          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
        >
          <RefreshCw className={cn("w-3 h-3", isValidating && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HealthStat label="Val Score" value={latest ? `${(latest.score * 100).toFixed(1)}%` : 'N/A'} color={latest?.score < 0.7 ? 'text-red-400' : 'text-green-400'} />
        <HealthStat label="Avg κ" value={latest ? latest.kappa.toFixed(3) : 'N/A'} color={latest?.kappa > 0.3 ? 'text-yellow-400' : 'text-primary'} />
      </div>

      <div className="p-3 rounded-lg bg-[#111827] border border-[#192033]">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${latest?.status === 'Healthy' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Model Status: {latest?.status || 'Unknown'}</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed">
          Validation runs against historical "good" responses. Threshold: Score {'>'} 0.7, κ {'<'} 0.3.
        </p>
      </div>
    </div>
  );
};

export const KnowledgeTransfer: React.FC = () => {
  const [strategy, setStrategy] = useState<'replace' | 'average' | 'weighted'>('average');
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => coreEngine.exportKnowledge();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const text = await file.text();
    const success = await coreEngine.importKnowledge(text, strategy);
    setIsImporting(false);
    
    if (success) {
      alert("Knowledge imported and merged successfully.");
    } else {
      alert("Failed to import knowledge. Check file format.");
    }
  };

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Download className="w-5 h-5 text-primary" />
        Knowledge Transfer
      </h3>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
          >
            <Download className="w-3 h-3" />
            Export Core
          </button>
          <label className="flex-1 py-2 rounded-lg bg-[#192033] text-muted-foreground text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#252d45] transition-all cursor-pointer">
            <Upload className="w-3 h-3" />
            Import Core
            <input type="file" className="hidden" accept=".json" onChange={handleImport} />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Merge Strategy</p>
          <div className="grid grid-cols-3 gap-2">
            {(['replace', 'average', 'weighted'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={cn(
                  "py-1 rounded border text-[8px] font-bold uppercase tracking-tighter transition-all",
                  strategy === s ? "bg-primary/20 border-primary text-primary" : "bg-[#111827] border-[#192033] text-muted-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground leading-relaxed italic">
        Transfer Paccaya weights and memory clusters across model versions. Merging preserves accumulated wisdom.
      </p>
    </div>
  );
};

export const LearningDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const load = () => setStats(coreEngine.getStats());
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const chartData = {
    labels: stats.learningCurve.map((_: any, i: number) => i),
    datasets: [
      {
        label: 'Curvature (κ)',
        data: stats.learningCurve,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: { display: false },
      y: { 
        min: 0, 
        max: 1,
        grid: { color: '#192033' },
        ticks: { color: '#6b7280', font: { size: 8 } }
      },
    },
  };

  const avgKappa = stats.learningCurve.length > 0 
    ? stats.learningCurve.reduce((a: number, b: number) => a + b, 0) / stats.learningCurve.length 
    : 0;

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <LineChart className="w-5 h-5 text-primary" />
        Continuous Learning
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        <HealthStat label="Learning Rate" value={stats.metaParams.eta0.toFixed(3)} />
        <HealthStat label="Avg Curvature" value={avgKappa.toFixed(3)} color={avgKappa > 0.4 ? 'text-yellow-400' : 'text-green-400'} />
        <HealthStat label="Updates" value={stats.interactionCount} />
        <HealthStat label="Samples" value={stats.learningCurve.length} />
      </div>

      <div className="h-32 w-full bg-[#111827] rounded-lg border border-[#192033] p-2">
        <Line data={chartData} options={chartOptions} />
      </div>

      <p className="text-[9px] text-muted-foreground leading-relaxed">
        Online learning updates weights after every interaction. Learning rate η scales with awareness density.
      </p>
    </div>
  );
};

export const MetaLearningProgress: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const load = () => setStats(coreEngine.getStats());
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const runMeta = async () => {
    setIsOptimizing(true);
    await coreEngine.runMetaOptimization();
    setIsOptimizing(false);
  };

  if (!stats) return null;

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Meta-Learning
        </h3>
        <button 
          onClick={runMeta}
          disabled={isOptimizing}
          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
        >
          <RefreshCw className={cn("w-3 h-3", isOptimizing && "animate-spin")} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <MetaParam label="Base η₀" value={stats.metaParams.eta0} />
          <MetaParam label="θ pos" value={stats.metaParams.theta_pos} />
          <MetaParam label="θ neg" value={stats.metaParams.theta_neg} />
          <MetaParam label="Retention" value={stats.metaParams.memoryRetention} />
        </div>

        <div className="p-3 rounded-lg bg-[#111827] border border-[#192033]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Hyperparameter Tuning</span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            Meta-Learning optimizes learning parameters by back-testing on recent history every 20 interactions.
          </p>
        </div>
      </div>
    </div>
  );
};

function MetaParam({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex justify-between items-center p-2 rounded bg-[#111827] border border-[#192033]">
      <span className="text-[8px] text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className="text-[10px] font-mono font-bold text-primary">{value}</span>
    </div>
  );
}

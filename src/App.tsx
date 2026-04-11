import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Shield, Scale, TrendingUp, BookOpen, Heart, 
  Search, MessageSquare, Mic, Send, Trash2, Info, 
  AlertTriangle, CheckCircle2, ChevronRight, BarChart3,
  Cpu, Zap, Brain, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { engine, MasterResponse, QueryResult } from './lib/master-engine';
import { explainResults, chatWithAI } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DOMAIN_CONFIG = {
  medical: { icon: Heart, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Medical' },
  legal: { icon: Scale, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Legal' },
  financial: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Financial' },
  education: { icon: BookOpen, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Education' },
  security: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Security' },
  mental: { icon: Activity, color: 'text-pink-400', bg: 'bg-pink-400/10', label: 'Mental Health' },
};

const SEV_MARK = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'chat' | 'monitor'>('dashboard');
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('auto');
  const [analysisResult, setAnalysisResult] = useState<MasterResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>(() => {
    const saved = localStorage.getItem('prd_agi_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string, mimeType: string, data: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('prd_agi_chat_history', JSON.stringify(chatHistory));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          mimeType: file.type,
          data: base64
        }]);
      };
      
      if (file.type.startsWith('image/') || file.type === 'text/plain' || file.type === 'application/pdf') {
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setIsAnalyzing(true);
    setExplanation('');
    
    // Simulate some latency for "causal processing"
    await new Promise(r => setTimeout(r, 800));
    
    const inputs = query.split('\n').map(s => s.trim()).filter(Boolean);
    const result = engine.query(inputs, selectedDomain);
    setAnalysisResult(result);
    setIsAnalyzing(false);
    setActiveTab('analysis');
  };

  const handleExplain = async () => {
    if (!analysisResult) return;
    setIsExplaining(true);
    const text = await explainResults(analysisResult);
    setExplanation(text);
    setIsExplaining(false);
  };

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() && attachments.length === 0) return;
    const msg = chatInput;
    const currentAttachments = [...attachments];
    setChatInput('');
    setAttachments([]);
    
    setChatHistory(prev => [...prev, { 
      role: 'user', 
      content: msg + (currentAttachments.length > 0 ? `\n\n[Attached: ${currentAttachments.map(a => a.name).join(', ')}]` : '') 
    }]);
    setIsChatting(true);
    
    const response = await chatWithAI(msg, chatHistory, currentAttachments);
    setChatHistory(prev => [...prev, { role: 'ai', content: response }]);
    setIsChatting(false);
  };

  return (
    <div className="flex h-screen bg-[#07090f] text-[#dce6f0] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#192033] bg-[#0c0f1a] flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-[#192033]">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">PRD-AGI <span className="text-primary">v3</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem 
            icon={Activity} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={Search} 
            label="KB Analysis" 
            active={activeTab === 'analysis'} 
            onClick={() => setActiveTab('analysis')} 
          />
          <SidebarItem 
            icon={MessageSquare} 
            label="Neural Chat" 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
          />
          <SidebarItem 
            icon={BarChart3} 
            label="System Monitor" 
            active={activeTab === 'monitor'} 
            onClick={() => setActiveTab('monitor')} 
          />
        </nav>
        
        <div className="p-4 border-t border-[#192033]">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#111827] border border-[#192033]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Engine Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-[#192033] bg-[#07090f]/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              {activeTab === 'dashboard' && 'Central Command'}
              {activeTab === 'analysis' && 'Causal Analysis'}
              {activeTab === 'chat' && 'Neural Interface'}
              {activeTab === 'monitor' && 'Resource Metrics'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-[#192033] transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Total Tensors" value="1,138" sub="+682 v3" icon={Cpu} />
                  <StatCard label="Active Domains" value="6" sub="Unified" icon={Brain} />
                  <StatCard label="Neural Memory" value="Active" sub="Long-term" icon={MessageSquare} />
                  <StatCard label="Self-Learning" value="Enabled" sub="Causal Evolution" icon={Zap} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a]">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" />
                        Quick Analysis
                      </h3>
                      <div className="space-y-4">
                        <textarea 
                          className="w-full h-32 bg-[#111827] border border-[#192033] rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                          placeholder="Enter symptoms, legal clauses, or indicators... (one per line)"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        <div className="flex items-center justify-between">
                          <select 
                            className="bg-[#111827] border border-[#192033] rounded-lg px-4 py-2 text-sm outline-none"
                            value={selectedDomain}
                            onChange={(e) => setSelectedDomain(e.target.value)}
                          >
                            <option value="auto">Auto-Route Domain</option>
                            <option value="medical">Medical</option>
                            <option value="legal">Legal</option>
                            <option value="financial">Financial</option>
                            <option value="education">Education</option>
                            <option value="security">Security</option>
                            <option value="mental">Mental Health</option>
                          </select>
                          <button 
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !query.trim()}
                            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                          >
                            {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
                            Analyze Tensors
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(DOMAIN_CONFIG).map(([key, config]) => (
                        <DomainCard key={key} domain={key} {...config} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a]">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-primary" />
                        System Status
                      </h3>
                      <div className="space-y-4">
                        <StatusItem label="Neural Core" status="Active" />
                        <StatusItem label="Knowledge Graph" status="Synchronized" />
                        <StatusItem label="Causal Engine" status="Optimized" />
                        <StatusItem label="LLM Fallback" status="Ready" />
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border border-[#192033] bg-primary/5 border-primary/20">
                      <h3 className="text-lg font-semibold mb-2 text-primary">PRD-AGI v3</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Powered by Relational Tensors [C,W,L,T,U,D]. This system analyzes complex relationships across 6 critical domains with high precision.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analysis' && (
              <motion.div 
                key="analysis"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                {!analysisResult ? (
                  <div className="text-center py-20">
                    <Search className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-muted-foreground">No analysis performed yet</h3>
                    <button 
                      onClick={() => setActiveTab('dashboard')}
                      className="mt-4 text-primary hover:underline"
                    >
                      Return to dashboard to start
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                          {DOMAIN_CONFIG[analysisResult.domain as keyof typeof DOMAIN_CONFIG]?.icon && (
                            <div className={cn("p-2 rounded-lg", DOMAIN_CONFIG[analysisResult.domain as keyof typeof DOMAIN_CONFIG].bg)}>
                              {React.createElement(DOMAIN_CONFIG[analysisResult.domain as keyof typeof DOMAIN_CONFIG].icon, { className: cn("w-6 h-6", DOMAIN_CONFIG[analysisResult.domain as keyof typeof DOMAIN_CONFIG].color) })}
                            </div>
                          )}
                          {analysisResult.label}
                        </h3>
                        <p className="text-muted-foreground mt-1">
                          Based on {analysisResult.count} inputs · Domain: <span className="capitalize">{analysisResult.domain}</span>
                        </p>
                      </div>
                      <button 
                        onClick={handleExplain}
                        disabled={isExplaining}
                        className="bg-[#111827] border border-[#192033] hover:border-primary text-primary px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                      >
                        {isExplaining ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Brain className="w-4 h-4" />}
                        Explain with AI
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        {analysisResult.results.map((res, idx) => (
                          <ResultCard key={idx} result={res} />
                        ))}
                      </div>

                      <div className="space-y-6">
                        {explanation && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 rounded-xl border border-primary/30 bg-primary/5"
                          >
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Brain className="w-5 h-5 text-primary" />
                              AI Explanation
                            </h4>
                            <div className="prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown>{explanation}</ReactMarkdown>
                            </div>
                          </motion.div>
                        )}

                        <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a]">
                          <h4 className="text-lg font-semibold mb-4">Analysis Summary</h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Overall Severity</span>
                              <span className={cn("font-bold uppercase", `sev-${analysisResult.summary.overall}`)}>
                                {analysisResult.summary.overall}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Critical Findings</span>
                              <span className="font-mono text-red-400">{analysisResult.summary.critical}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">High Risk Items</span>
                              <span className="font-mono text-orange-400">{analysisResult.summary.high}</span>
                            </div>
                            <div className="pt-4 border-t border-[#192033]">
                              <p className="text-xs text-muted-foreground italic leading-relaxed">
                                {analysisResult.disclaimer}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col border border-[#192033] rounded-2xl bg-[#0c0f1a] overflow-hidden"
              >
                <div className="p-4 border-b border-[#192033] bg-[#111827] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                      <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">PRD-AGI Neural Chat</h3>
                      <p className="text-xs text-muted-foreground">Causal reasoning enabled</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setChatHistory([])}
                    className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
                  {chatHistory.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                      <MessageSquare className="w-12 h-12 mb-4" />
                      <p>Start a conversation with the PRD-AGI engine.</p>
                      <p className="text-sm">Ask about symptoms, legal risks, or market trends.</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={msg.role === 'user' ? 'chat-user' : 'chat-ai'}>
                      {msg.role === 'ai' ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  ))}
                  {isChatting && (
                    <div className="chat-ai flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-[#192033] bg-[#111827]">
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1 bg-[#192033] border border-primary/30 rounded-full text-xs">
                          <span className="truncate max-w-[100px]">{att.name}</span>
                          <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*,text/plain,application/pdf"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-xl bg-[#192033] hover:bg-[#252d45] text-muted-foreground transition-all"
                      title="Upload Files (Images, Text, PDF)"
                    >
                      <Zap className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={toggleListening}
                      className={cn(
                        "p-3 rounded-xl transition-all duration-200",
                        isListening ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/50" : "bg-[#192033] hover:bg-[#252d45] text-muted-foreground"
                      )}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <input 
                      type="text" 
                      className="flex-1 bg-[#07090f] border border-[#192033] rounded-xl px-4 py-2 outline-none focus:border-primary transition-all"
                      placeholder="Type your message or upload files..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                    />
                    <button 
                      onClick={handleChat}
                      disabled={isChatting || (!chatInput.trim() && attachments.length === 0)}
                      className="p-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                      <Send className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'monitor' && (
              <motion.div 
                key="monitor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a]">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Knowledge Base Stats
                    </h3>
                    <div className="space-y-6">
                      {Object.entries(engine.stats()).map(([domain, stats]: [string, any]) => (
                        <div key={domain} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{domain}</span>
                            <span className="font-mono">{stats.total} Tensors</span>
                          </div>
                          <div className="h-2 bg-[#111827] rounded-full overflow-hidden border border-[#192033]">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${(stats.total / 10) * 100}%` }} 
                            />
                          </div>
                          <div className="flex gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
                            <span>Avg C: {stats.avg_C}</span>
                            <span>Avg U: {stats.avg_U}</span>
                            <span>Law: {stats.law}</span>
                            <span>Fuzzy: {stats.fuzzy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a]">
                      <h3 className="text-lg font-semibold mb-4">Neural Engine Load</h3>
                      <div className="flex items-center justify-center py-10">
                        <div className="relative w-40 h-40">
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle 
                              cx="50" cy="50" r="45" 
                              fill="none" stroke="#111827" strokeWidth="8" 
                            />
                            <circle 
                              cx="50" cy="50" r="45" 
                              fill="none" stroke="var(--primary)" strokeWidth="8" 
                              strokeDasharray="283" strokeDashoffset="70"
                              strokeLinecap="round"
                              className="animate-pulse"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold">75%</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Optimized</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a]">
                      <h3 className="text-lg font-semibold mb-4">Active Processes</h3>
                      <div className="space-y-3">
                        <ProcessItem label="Causal Inference" status="Running" />
                        <ProcessItem label="Tensor Mapping" status="Idle" />
                        <ProcessItem label="Semantic Routing" status="Running" />
                        <ProcessItem label="LLM Contextualizer" status="Running" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-primary text-white shadow-lg shadow-primary/20" 
          : "text-muted-foreground hover:bg-[#192033] hover:text-[#dce6f0]"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-white" : "group-hover:text-primary")} />
      <span className="font-medium">{label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );
}

function StatCard({ label, value, sub, icon: Icon }: { label: string, value: string, sub: string, icon: any }) {
  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-24 h-24" />
      </div>
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-tighter">{value}</p>
      <p className="text-xs text-primary mt-2 flex items-center gap-1">
        <Zap className="w-3 h-3" /> {sub}
      </p>
    </div>
  );
}

function DomainCard({ domain, icon: Icon, color, bg, label }: { domain: string, icon: any, color: string, bg: string, label: string }) {
  const stats = engine.stats()[domain as keyof ReturnType<typeof engine.stats>];
  return (
    <div className="p-5 rounded-xl border border-[#192033] bg-[#0c0f1a] hover:border-primary/30 transition-all cursor-pointer group">
      <div className="flex items-center gap-4 mb-4">
        <div className={cn("p-2 rounded-lg", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <h4 className="font-semibold">{label}</h4>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase">
          <span>Tensors</span>
          <span className="text-foreground">{stats?.total || 0}</span>
        </div>
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase">
          <span>Reliability</span>
          <span className="text-foreground">{((stats?.avg_C || 0) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: QueryResult }) {
  return (
    <div className="p-5 rounded-xl border border-[#192033] bg-[#0c0f1a] hover:border-primary/40 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-lg flex items-center gap-2">
            {SEV_MARK[result.severity as keyof typeof SEV_MARK]} {result.display}
          </h4>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            Category: {result.category} · Domain: {result.domain}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-tighter text-primary">
            {(result.confidence * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Confidence</div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricBox label="Causality C" value={result.tensor.C} />
        <MetricBox label="Uncertainty U" value={result.tensor.U} />
        <MetricBox label="Weight W" value={result.tensor.W} />
      </div>

      <div className="flex flex-wrap gap-2">
        {result.sources.map((s, i) => (
          <span key={i} className="px-2 py-1 rounded bg-[#111827] border border-[#192033] text-[10px] font-mono text-muted-foreground">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-[#111827] border border-[#192033] rounded-lg p-2 text-center">
      <div className="text-[9px] text-muted-foreground uppercase tracking-tighter mb-0.5">{label}</div>
      <div className="text-xs font-mono font-bold">{value.toFixed(3)}</div>
    </div>
  );
}

function StatusItem({ label, status }: { label: string, status: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-green-400">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        {status}
      </span>
    </div>
  );
}

function ProcessItem({ label, status }: { label: string, status: string }) {
  return (
    <div className="flex items-center justify-between text-sm p-2 rounded bg-[#111827]/50">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "text-[10px] font-mono uppercase px-2 py-0.5 rounded",
        status === 'Running' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {status}
      </span>
    </div>
  );
}


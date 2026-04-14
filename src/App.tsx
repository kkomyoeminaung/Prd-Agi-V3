import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Shield, Scale, TrendingUp, BookOpen, Heart, 
  Search, MessageSquare, Mic, Send, Trash2, Info, 
  AlertTriangle, CheckCircle2, ChevronRight, BarChart3, FileText,
  Cpu, Zap, Brain, Settings, Volume2, Download, UserCheck,
  Stethoscope, ShieldCheck, Plus, Paperclip, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import { engine, MasterResponse, QueryResult, FusionResponse } from './lib/master-engine';
import { CurvatureDashboard } from './components/CurvatureDashboard';
import { CausalFlowDiagram } from './components/CausalFlowDiagram';
import { JourneyPanel } from './components/JourneyPanel';
import { PatthanaHeatmap } from './components/PatthanaHeatmap';
import { QuantumInterference } from './data/QuantumInterference';
import { DocumentAnalysis } from './lib/DocumentAnalysis';
import { CausalGraph } from './components/CausalGraph';
import { MemoryBank, KnowledgeBase, DreamLogPanel, CausalPlasticity, SystemHealth, SelfRefinementLog, ValidationDashboard, KnowledgeTransfer, LearningDashboard, MetaLearningProgress } from './components/MemoryPanels';
import { persistence } from './lib/persistence';
import { prdDB } from './lib/db';
import { DreamAgent } from './services/dreamAgent';
import { coreEngine } from './data/coreEngine';
import { explainResults, chatWithAI, searchWithAI, analyzeDocument, refineResponse, councilConsensus } from './services/gemini';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'chat' | 'monitor' | 'documents' | 'memory'>('dashboard');
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('auto');
  const [analysisResult, setAnalysisResult] = useState<MasterResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [docAnalysisResults, setDocAnalysisResults] = useState<any[]>([]);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [isFusionMode, setIsFusionMode] = useState(false);
  const [fusionResult, setFusionResult] = useState<FusionResponse | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [showSessionMessage, setShowSessionMessage] = useState(false);
  
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>(() => {
    return persistence.loadChat().map(m => ({ role: m.role, content: m.content }));
  });
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isLongResponseMode, setIsLongResponseMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<'en' | 'my'>('en');
  const [currentPersona, setCurrentPersona] = useState('general');
  const [attachments, setAttachments] = useState<{ name: string, mimeType: string, data: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    const lastKappa = persistence.getLastSessionKappa();
    const trend = persistence.loadKappaTrend();
    const currentKappa = trend.length > 0 ? trend[trend.length - 1].kappa : 0.45;
    
    if (trend.length > 0) {
      setSessionMessage(`PRD remembers your last session: κ improved from ${lastKappa.toFixed(2)} to ${currentKappa.toFixed(2)}`);
      setShowSessionMessage(true);
      setTimeout(() => setShowSessionMessage(false), 8000);
    }

    // Initialize Dream Agent
    DreamAgent.init();
    coreEngine.init();
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'my' ? 'my-MM' : 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'my' ? 'my' : 'en-US';
    synth.speak(utterance);
  };

  const exportChat = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("PRD-AGI Neural Chat Export", 10, 10);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleString()}`, 10, 18);
      
      let y = 30;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const maxLineWidth = pageWidth - margin * 2;

      chatHistory.forEach((h, i) => {
        const role = h.role === 'user' ? 'USER' : 'AI';
        const text = `${role}: ${h.content}`;
        const lines = doc.splitTextToSize(text, maxLineWidth);
        
        if (y + (lines.length * 7) > 280) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(lines, margin, y);
        y += (lines.length * 7) + 5;
      });
      
      doc.save(`prd-agi-chat-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (error) {
      console.error("PDF Export failed, falling back to TXT:", error);
      const content = chatHistory.map(h => `${h.role === 'user' ? 'USER' : 'AI'}: ${h.content}`).join('\n\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prd-agi-chat-${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const personas = [
    { id: 'general', label: 'General', icon: Brain },
    { id: 'medical', label: 'Medical', icon: Stethoscope },
    { id: 'legal', label: 'Legal', icon: Scale },
    { id: 'financial', label: 'Financial', icon: TrendingUp },
    { id: 'security', label: 'Security', icon: ShieldCheck },
  ];

  const suggestedPrompts = [
    "Explain the causality of current market trends.",
    "Analyze the neural mapping of medical diagnostics.",
    "What are the legal implications of AI autonomy?",
    "Check system security vulnerabilities.",
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If it's for document analysis (PDF/TXT)
    if (file.type === "application/pdf" || file.type === "text/plain") {
      setIsAnalyzingDoc(true);
      setActiveTab('documents');

      try {
        let text = "";
        if (file.type === "application/pdf") {
          const arrayBuffer = await file.arrayBuffer();
          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            fullText += strings.join(" ") + "\n";
          }
          text = fullText;
        } else {
          text = await file.text();
        }

        const results = await analyzeDocument(text, language);
        if (results) {
          setDocAnalysisResults(results);
        }
      } catch (error) {
        console.error("Document Analysis Error:", error);
      } finally {
        setIsAnalyzingDoc(false);
      }
      return;
    }

    // Default attachment logic for images
    for (const file of Array.from(e.target.files || [])) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          mimeType: file.type,
          data: base64
        }]);
      };
      
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setIsAnalyzing(true);
    setExplanation('');
    setFusionResult(null);
    
    try {
      const inputs = query.split('\n').map(s => s.trim()).filter(Boolean);
      
      if (isFusionMode) {
        const result = await engine.fusionQuery(query);
        setFusionResult(result);
        setAnalysisResult(result);
        persistence.trackKappa(result.kappa);
        persistence.trackKeywords(query);
        persistence.incrementOptSteps(4);
        persistence.saveSessionEnd(result.kappa);
      } else {
        // Simulate some latency for "causal processing"
        await new Promise(r => setTimeout(r, 800));
        const result = engine.query(inputs, selectedDomain);
        setAnalysisResult(result);
        persistence.trackKappa(result.kappa);
        persistence.trackKeywords(query);
        persistence.incrementOptSteps(1);
        persistence.saveSessionEnd(result.kappa);
      }
      
      setActiveTab('analysis');
    } catch (error) {
      console.error("Analysis Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExplain = async () => {
    if (!analysisResult) return;
    try {
      setIsExplaining(true);
      const text = await explainResults(analysisResult, "", language);
      setExplanation(text);
      setIsExplaining(false);
    } catch (error) {
      console.error("Explain Error:", error);
      setIsExplaining(false);
      setExplanation("⚠️ Analysis explanation failed. Please try again.");
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() && attachments.length === 0) return;
    try {
      const msg = chatInput;
      const currentAttachments = [...attachments];
      setChatInput('');
      setAttachments([]);
      
      const userMsg = { 
        role: 'user' as const, 
        content: msg + (currentAttachments.length > 0 ? `\n\n[Attached: ${currentAttachments.map(a => a.name).join(', ')}]` : ''),
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, { role: userMsg.role, content: userMsg.content }]);
      persistence.saveChat(userMsg);
      persistence.trackKeywords(msg);
      setIsChatting(true);
      
      let response;
      let kappa = 0.15;
      const maxTokens = isLongResponseMode ? 4096 : 1536;

      if (isSearchMode) {
        response = await searchWithAI(msg, chatHistory, language, maxTokens);
      } else {
        // Feature 12: Multi-Agent Council Consensus for complex queries
        if (msg.length > 50 || msg.includes('?') || msg.includes('explain')) {
          const context = await prdDB.searchKnowledge(msg);
          const council = await councilConsensus(msg, context.map(k => k.topic).join(', '), language, maxTokens);
          if (council) {
            response = council.consensus;
            kappa = council.kappa;
          } else {
            response = await chatWithAI(msg, chatHistory, currentAttachments, currentPersona, language, maxTokens);
          }
        } else {
          response = await chatWithAI(msg, chatHistory, currentAttachments, currentPersona, language, maxTokens);
        }
      }
      
      // Feature 6: Self-Refinement
      const refinement = await refineResponse(msg, response, language);
      let finalResponse = response;
      if (refinement && refinement.improvementScore > 0.2) {
        finalResponse = refinement.refinedResponse;
        kappa = refinement.curvature;
        await prdDB.saveRefinement({
          query: msg,
          original: response,
          critique: refinement.critique,
          refined: refinement.refinedResponse,
          improvementScore: refinement.improvementScore
        });
      }

      const aiMsg = { role: 'ai' as const, content: finalResponse, timestamp: Date.now() };
      setChatHistory(prev => [...prev, { role: aiMsg.role, content: aiMsg.content }]);
      persistence.saveChat(aiMsg);

      // Save to IndexedDB for Feature 1 (Memory)
      await prdDB.saveConversation({
        query: msg,
        response: finalResponse,
        timestamp: Date.now(),
        kappa: kappa
      });

      // Feature 4 & 9: Online Learning (Update Weights)
      await coreEngine.updateWeights('auto', kappa);

      // Feature 7: Periodic Validation
      if (chatHistory.length % 10 === 0) {
        await coreEngine.runValidation();
      }

      setIsChatting(false);
    } catch (error) {
      console.error("Chat Error:", error);
      setIsChatting(false);
      setChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ Neural connection interrupted. Please try again." }]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#07090f] text-[#dce6f0] overflow-hidden font-sans">
      {/* Top Navigation Header */}
      <header className="h-16 border-b border-[#192033] bg-[#0c0f1a]/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden md:block">PRD-AGI <span className="text-primary">v3</span></h1>
          </div>
          
          <nav className="flex items-center gap-1">
            <NavItem 
              icon={Activity} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <NavItem 
              icon={FileText} 
              label="Documents" 
              active={activeTab === 'documents'} 
              onClick={() => setActiveTab('documents')} 
            />
            <NavItem 
              icon={Brain} 
              label="Memory" 
              active={activeTab === 'memory'} 
              onClick={() => setActiveTab('memory')} 
            />
            <NavItem 
              icon={Search} 
              label="KB Analysis" 
              active={activeTab === 'analysis'} 
              onClick={() => setActiveTab('analysis')} 
            />
            <NavItem 
              icon={MessageSquare} 
              label="Neural Chat" 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')} 
            />
            <NavItem 
              icon={BarChart3} 
              label="System Monitor" 
              active={activeTab === 'monitor'} 
              onClick={() => setActiveTab('monitor')} 
            />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111827] border border-[#192033]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Engine Online</span>
          </div>
          <button className="p-2 rounded-full hover:bg-[#192033] transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Sub-header for context */}
        <div className="h-10 border-b border-[#192033]/50 bg-[#07090f] flex items-center px-8">
          <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em]">
            {activeTab === 'dashboard' && 'Central Command'}
            {activeTab === 'analysis' && 'Causal Analysis'}
            {activeTab === 'chat' && 'Neural Interface'}
            {activeTab === 'monitor' && 'Resource Metrics'}
          </h2>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                <AnimatePresence>
                  {showSessionMessage && sessionMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3 overflow-hidden"
                    >
                      <Info className="w-5 h-5 text-primary shrink-0" />
                      <p className="text-sm font-medium text-primary">{sessionMessage}</p>
                      <button onClick={() => setShowSessionMessage(false)} className="ml-auto">
                        <X className="w-4 h-4 text-primary/60 hover:text-primary" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                          <div className="flex items-center gap-4">
                            <select 
                              className="bg-[#111827] border border-[#192033] rounded-lg px-4 py-2 text-sm outline-none"
                              value={selectedDomain}
                              onChange={(e) => setSelectedDomain(e.target.value)}
                              disabled={isFusionMode}
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
                              onClick={() => setIsFusionMode(!isFusionMode)}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                                isFusionMode 
                                  ? "bg-primary/20 border-primary text-primary" 
                                  : "bg-[#111827] border-[#192033] text-muted-foreground hover:border-primary/50"
                              )}
                            >
                              <Zap className={cn("w-4 h-4", isFusionMode && "animate-pulse")} />
                              Fusion Mode
                            </button>
                          </div>

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

                    <JourneyPanel />
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

                    {fusionResult && fusionResult.links.length > 0 && (
                      <div className="mb-8">
                        <CausalFlowDiagram links={fusionResult.links} />
                      </div>
                    )}

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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a]">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Zap className="w-5 h-5 text-primary" />
                              Causal Plasticity
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Dominant Paccaya</span>
                                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                                  {analysisResult.dominantPaccaya?.name}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Condition Weight</span>
                                <span className="font-mono text-blue-400">
                                  {(analysisResult.dominantPaccaya?.weight || 0).toFixed(4)}
                                </span>
                              </div>
                              <div className="pt-2">
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                  The Neural Core has shifted its causal weighting towards <b>{analysisResult.dominantPaccaya?.name}</b> based on the current query manifold.
                                </p>
                              </div>
                            </div>
                          </div>

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
                className="max-w-6xl mx-auto h-[calc(100vh-10rem)] flex flex-col border border-[#192033] rounded-2xl bg-[#0c0f1a] overflow-hidden shadow-2xl shadow-black/50"
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
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={exportChat}
                      className="p-2 text-muted-foreground hover:text-blue-400 transition-colors"
                      title="Export Chat History"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <div className="flex bg-[#192033] p-1 rounded-xl border border-white/5 mx-2">
                      <button 
                        onClick={() => setLanguage(l => l === 'en' ? 'my' : 'en')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                          language === 'my' ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
                        )}
                      >
                        {language === 'en' ? '🇺🇸 EN' : '🇲🇲 MY'}
                      </button>
                    </div>
                    <div className="flex bg-[#192033] p-1 rounded-xl border border-white/5 mx-2">
                      {personas.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setCurrentPersona(p.id)}
                          className={cn(
                            "p-2 rounded-lg transition-all flex items-center gap-2",
                            currentPersona === p.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white"
                          )}
                          title={p.label}
                        >
                          <p.icon className="w-4 h-4" />
                          {currentPersona === p.id && <span className="text-[10px] font-bold hidden md:block">{p.label}</span>}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setChatHistory([])}
                      className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Clear Chat"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
                  {chatHistory.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                        <Brain className="w-8 h-8 text-primary animate-pulse" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Neural Core Ready</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mb-6">
                        Initiate a causal inquiry or upload data for deep tensor analysis.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-md">
                        {suggestedPrompts.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => setChatInput(p)}
                            className="p-3 text-xs text-left rounded-xl bg-[#192033] hover:bg-[#252d45] border border-white/5 text-muted-foreground hover:text-white transition-all"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={cn(
                      msg.role === 'user' ? 'chat-user' : 'chat-ai',
                      "relative group"
                    )}>
                      {msg.role === 'ai' ? (
                        <>
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          <button 
                            onClick={() => speak(msg.content)}
                            className="absolute -right-8 top-0 p-1 text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Speak"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </>
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
                    <div className="flex items-center gap-2">
                      {isListening && <VoiceWaveform />}
                      <button 
                        onClick={startListening}
                        className={cn(
                          "p-3 rounded-xl transition-all duration-200",
                          isListening ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse" : "bg-[#192033] hover:bg-[#252d45] text-muted-foreground"
                        )}
                        title="Voice Input"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    </div>
                    <button 
                      onClick={() => setIsSearchMode(!isSearchMode)}
                      className={cn(
                        "p-3 rounded-xl transition-all duration-200 flex items-center gap-2",
                        isSearchMode ? "bg-blue-500/20 text-blue-400 border border-blue-500/50" : "bg-[#192033] hover:bg-[#252d45] text-muted-foreground"
                      )}
                      title="Toggle Web Search"
                    >
                      <Search className="w-5 h-5" />
                      {isSearchMode && <span className="text-[10px] font-bold uppercase tracking-widest">Search On</span>}
                    </button>
                    <button 
                      onClick={() => setIsLongResponseMode(!isLongResponseMode)}
                      className={cn(
                        "p-3 rounded-xl transition-all duration-200 flex items-center gap-2",
                        isLongResponseMode ? "bg-purple-500/20 text-purple-400 border border-purple-500/50" : "bg-[#192033] hover:bg-[#252d45] text-muted-foreground"
                      )}
                      title="Toggle Long Response Mode"
                    >
                      <Zap className="w-5 h-5" />
                      {isLongResponseMode && <span className="text-[10px] font-bold uppercase tracking-widest">Long Mode</span>}
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-xl bg-[#192033] hover:bg-[#252d45] text-muted-foreground transition-all"
                      title="Upload Files (Images, Text, PDF)"
                    >
                      <Paperclip className="w-5 h-5" />
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
                    <CurvatureDashboard 
                      currentKappa={analysisResult?.kappa || 0.1}
                      awareness={analysisResult?.awareness || 0.85}
                      dominantPaccaya={analysisResult?.dominantPaccaya}
                    />

                    <PatthanaHeatmap 
                      dominantPaccayaIndex={analysisResult?.dominantPaccaya?.index || 0}
                      confidence={analysisResult?.results[0]?.confidence || 0.5}
                    />

                    <QuantumInterference />

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

            {activeTab === 'documents' && (
              <motion.div 
                key="documents"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-6xl mx-auto"
              >
                <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-8">
                  <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#192033] rounded-2xl hover:border-primary/50 transition-all cursor-pointer group"
                       onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Upload Document for Tensor Analysis</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Drag and drop your PDF or TXT files here, or click to browse. PRD-AGI will extract causal claims and project them into the tensor manifold.
                    </p>
                  </div>

                  <DocumentAnalysis results={docAnalysisResults} isLoading={isAnalyzingDoc} />
                </div>
              </motion.div>
            )}

            {activeTab === 'memory' && (
              <motion.div 
                key="memory"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-7xl mx-auto"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-6">
                    <MemoryBank />
                    <CausalPlasticity />
                    <SelfRefinementLog />
                    <LearningDashboard />
                  </div>
                  <div className="space-y-6">
                    <KnowledgeBase />
                    <SystemHealth />
                    <ValidationDashboard />
                    <MetaLearningProgress />
                  </div>
                  <div className="space-y-6">
                    <CausalGraph />
                    <DreamLogPanel />
                    <KnowledgeTransfer />
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

function VoiceWaveform() {
  return (
    <div className="flex items-center gap-1 h-4 px-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          animate={{ height: [4, 16, 4] }}
          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
          className="w-1 bg-primary rounded-full"
        />
      ))}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 group relative",
        active 
          ? "text-primary" 
          : "text-muted-foreground hover:text-[#dce6f0]"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-primary" : "group-hover:text-primary")} />
      <span className="font-medium text-sm hidden sm:block">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute bottom-[-18px] left-0 right-0 h-0.5 bg-primary"
        />
      )}
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
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <MetricBox label="Causality C" value={result.tensor.C} />
        <MetricBox label="Uncertainty U" value={result.tensor.U} />
        <MetricBox label="Weight W" value={result.tensor.W} />
        <MetricBox label="Curvature K" value={result.tensor.K} />
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


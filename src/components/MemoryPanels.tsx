import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Brain, Database, Moon, Search, Clock, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { prdDB, Conversation, KnowledgeChunk, DreamLog } from '../lib/db';
import { DreamAgent } from '../services/dreamAgent';

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

import React from 'react';
import { motion } from 'motion/react';
import { FileText, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface AnalysisItem {
  claim: string;
  domain: string;
  c: number;
  u: number;
  risk: string;
  implication: string;
  tensor: string;
}

interface DocumentAnalysisProps {
  results: AnalysisItem[];
  isLoading: boolean;
}

export const DocumentAnalysis: React.FC<DocumentAnalysisProps> = ({ results, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-4 bg-[#0c0f1a] rounded-xl border border-[#192033]">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-mono text-primary animate-pulse">Extracting Causal Tensors...</p>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Document Tensor Report
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {results.length} Claims Extracted
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#192033] bg-[#0c0f1a]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#111827] border-b border-[#192033]">
              <th className="p-4 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Claim</th>
              <th className="p-4 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Domain</th>
              <th className="p-4 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">C / U</th>
              <th className="p-4 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Risk</th>
              <th className="p-4 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Tensor Projection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#192033]">
            {results.map((item, i) => (
              <motion.tr 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="hover:bg-[#111827]/50 transition-colors"
              >
                <td className="p-4">
                  <p className="text-sm font-medium text-[#dce6f0] max-w-xs">{item.claim}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 italic">{item.implication}</p>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">
                    {item.domain}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">C:</span>
                      <div className="w-16 h-1 bg-[#192033] rounded-full overflow-hidden">
                        <div className="h-full bg-green-400" style={{ width: `${item.c * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">U:</span>
                      <div className="w-16 h-1 bg-[#192033] rounded-full overflow-hidden">
                        <div className="h-full bg-red-400" style={{ width: `${item.u * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      item.risk === 'Critical' ? 'bg-red-500 animate-pulse' :
                      item.risk === 'High' ? 'bg-orange-500' :
                      item.risk === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-xs font-medium">{item.risk}</span>
                  </div>
                </td>
                <td className="p-4">
                  <code className="text-[10px] font-mono text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10 whitespace-nowrap">
                    {item.tensor}
                  </code>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          The <span className="text-primary font-bold">Tensor Projection</span> represents the multi-dimensional mapping of the claim's causal weight (W), logical tension (L), temporal decay (T), and uncertainty (U) within the PRD-AGI manifold.
        </p>
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CausalLink } from '../lib/master-engine';

interface CausalFlowDiagramProps {
  links: CausalLink[];
}

export const CausalFlowDiagram: React.FC<CausalFlowDiagramProps> = ({ links }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || links.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = 200;
    
    // Extract unique nodes
    const nodeSet = new Set<string>();
    links.forEach(l => {
      nodeSet.add(l.source);
      nodeSet.add(l.target);
    });
    
    const nodes = Array.from(nodeSet).map((id, i) => ({
      id,
      x: (i + 1) * (width / (nodeSet.size + 1)),
      y: height / 2,
      domain: links.find(l => l.source === id)?.sourceDomain || links.find(l => l.target === id)?.targetDomain || 'general'
    }));

    const domainColors: Record<string, string> = {
      medical: '#ef4444',
      legal: '#3b82f6',
      financial: '#10b981',
      education: '#f59e0b',
      security: '#6366f1',
      mental: '#ec4899',
      general: '#94a3b8'
    };

    // Define arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#475569");

    // Draw links
    svg.selectAll(".link")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d => {
        const sourceNode = nodes.find(n => n.id === d.source)!;
        const targetNode = nodes.find(n => n.id === d.target)!;
        return `M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`;
      })
      .attr("stroke", "#475569")
      .attr("stroke-width", d => d.strength * 3)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrow)")
      .attr("stroke-dasharray", "5,5")
      .append("title")
      .text(d => `Strength: ${d.strength.toFixed(2)}`);

    // Draw nodes
    const nodeGroup = svg.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodeGroup.append("circle")
      .attr("r", 12)
      .attr("fill", "#0c0f1a")
      .attr("stroke", d => domainColors[d.domain])
      .attr("stroke-width", 2);

    nodeGroup.append("text")
      .attr("dy", 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#dce6f0")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .text(d => d.id);

    nodeGroup.append("text")
      .attr("dy", -20)
      .attr("text-anchor", "middle")
      .attr("fill", d => domainColors[d.domain])
      .attr("font-size", "8px")
      .attr("text-transform", "uppercase")
      .text(d => d.domain);

  }, [links]);

  return (
    <div className="w-full bg-[#0c0f1a] rounded-xl border border-[#192033] p-4 overflow-hidden">
      <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Cross-Domain Causal Flow</h4>
      <svg ref={svgRef} className="w-full h-[200px]" />
    </div>
  );
};

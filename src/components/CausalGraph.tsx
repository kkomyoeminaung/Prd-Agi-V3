import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { prdDB } from '../lib/db';
import { Share2 } from 'lucide-react';

export const CausalGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const loadAndDraw = async () => {
      const conversations = await prdDB.getRecentConversations(30);
      const knowledge = await prdDB.getKnowledge(30);

      const nodes: any[] = [];
      const links: any[] = [];

      // Create nodes from knowledge
      knowledge.forEach((k, i) => {
        nodes.push({ id: `k-${i}`, name: k.content.slice(0, 20) + '...', type: 'knowledge', val: 10 });
      });

      // Create nodes from conversations
      conversations.forEach((c, i) => {
        nodes.push({ id: `c-${i}`, name: c.query.slice(0, 20) + '...', type: 'memory', val: 5 });
      });

      // Create links based on keyword overlap (simple heuristic)
      nodes.forEach((nodeA, i) => {
        nodes.forEach((nodeB, j) => {
          if (i >= j) return;
          const wordsA = nodeA.name.toLowerCase().split(/\s+/);
          const wordsB = nodeB.name.toLowerCase().split(/\s+/);
          const common = wordsA.filter(w => w.length > 3 && wordsB.includes(w));
          if (common.length > 0) {
            links.push({ source: nodeA.id, target: nodeB.id, value: common.length });
          }
        });
      });

      if (!svgRef.current) return;

      const width = svgRef.current.clientWidth;
      const height = 400;

      const svg = d3.select(svgRef.current)
        .attr('viewBox', [0, 0, width, height]);

      svg.selectAll('*').remove();

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id((d: any) => d.id))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('center', d3.forceCenter(width / 2, height / 2));

      const link = svg.append('g')
        .attr('stroke', '#192033')
        .attr('stroke-opacity', 0.6)
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke-width', (d: any) => Math.sqrt(d.value));

      const node = svg.append('g')
        .attr('stroke', '#0c0f1a')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', (d: any) => d.val)
        .attr('fill', (d: any) => d.type === 'knowledge' ? '#3b82f6' : '#6b7280')
        .call(drag(simulation) as any);

      node.append('title')
        .text((d: any) => d.name);

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y);
      });

      function drag(simulation: any) {
        function dragstarted(event: any) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        }

        function dragged(event: any) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        }

        function dragended(event: any) {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }

        return d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended);
      }
    };

    loadAndDraw();
    const interval = setInterval(loadAndDraw, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 rounded-xl border border-[#192033] bg-[#0c0f1a] space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Share2 className="w-5 h-5 text-primary" />
        Causal Neural Map
      </h3>
      <div className="w-full h-[400px] bg-[#080a12] rounded-lg border border-[#192033] overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
      <p className="text-[9px] text-muted-foreground leading-relaxed italic">
        Real-time visualization of Paccaya relationships between memories (grey) and knowledge (blue).
      </p>
    </div>
  );
};

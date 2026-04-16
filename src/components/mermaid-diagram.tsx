import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, GitBranch, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
  /** Called with the rendered SVG string when the user wants to expand/zoom the diagram. */
  onExpand?: (svgContent: string) => void;
}

let mermaidIdCounter = 0;

export function MermaidDiagram({ chart, className, onExpand }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${Date.now()}-${mermaidIdCounter++}`);

  const renderDiagram = useCallback(async (isDark: boolean) => {
    try {
      const mermaid = (await import('mermaid')).default;

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          padding: 16,
          nodeSpacing: 50,
          rankSpacing: 60,
          useMaxWidth: false,
        },
        sequence: {
          actorMargin: 80,
          messageMargin: 40,
          mirrorActors: true,
          bottomMarginAdj: 10,
          useMaxWidth: false,
        },
        er: { useMaxWidth: false },
        journey: { useMaxWidth: false },
        gantt: { useMaxWidth: false },
        pie: { useMaxWidth: false },
        themeVariables: isDark
          ? {
              primaryColor: '#6366f1',
              primaryTextColor: '#e2e8f0',
              primaryBorderColor: '#4f46e5',
              secondaryColor: '#1e293b',
              secondaryTextColor: '#cbd5e1',
              secondaryBorderColor: '#334155',
              tertiaryColor: '#0f172a',
              tertiaryTextColor: '#94a3b8',
              tertiaryBorderColor: '#1e293b',
              lineColor: '#64748b',
              textColor: '#e2e8f0',
              mainBkg: '#1e293b',
              nodeBorder: '#4f46e5',
              clusterBkg: '#0f172a',
              clusterBorder: '#334155',
              titleColor: '#e2e8f0',
              edgeLabelBackground: '#1e293b',
              nodeTextColor: '#e2e8f0',
            }
          : {
              primaryColor: '#6366f1',
              primaryTextColor: '#1e293b',
              primaryBorderColor: '#4f46e5',
              secondaryColor: '#e0e7ff',
              secondaryTextColor: '#334155',
              secondaryBorderColor: '#a5b4fc',
              tertiaryColor: '#f1f5f9',
              tertiaryTextColor: '#475569',
              tertiaryBorderColor: '#cbd5e1',
              lineColor: '#94a3b8',
              textColor: '#334155',
              mainBkg: '#eef2ff',
              nodeBorder: '#4f46e5',
              clusterBkg: '#f8fafc',
              clusterBorder: '#c7d2fe',
              titleColor: '#1e293b',
              edgeLabelBackground: '#ffffff',
              nodeTextColor: '#1e293b',
            },
      });

      // Mermaid requires a unique id each time we re-render
      const uniqueId = `mermaid-${Date.now()}-${mermaidIdCounter++}`;
      const { svg: renderedSvg } = await mermaid.render(uniqueId, chart.trim());

      setSvg(renderedSvg);
      setError(null);
    } catch (err: any) {
      // Mermaid creates a temporary element on error that we should clean up
      const errorEl = document.getElementById(`d${idRef.current}`);
      if (errorEl) errorEl.remove();

      setError(err?.message || err?.str || 'Failed to render diagram');
      setSvg('');
    } finally {
      setLoading(false);
    }
  }, [chart]);

  // Initial render and theme change observer
  useEffect(() => {
    let cancelled = false;
    const isDark = document.documentElement.classList.contains('dark');

    const doRender = async () => {
      if (cancelled) return;
      setLoading(true);
      await renderDiagram(isDark);
    };
    doRender();

    // Watch for theme changes on <html> class attribute
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const nowDark = document.documentElement.classList.contains('dark');
          setLoading(true);
          renderDiagram(nowDark);
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [renderDiagram]);

  const handleExpand = useCallback(() => {
    if (svg && onExpand) onExpand(svg);
  }, [svg, onExpand]);

  // Loading state
  if (loading) {
    return (
      <div className={cn('not-prose mermaid-container mermaid-loading', className)}>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
          <GitBranch className="w-3.5 h-3.5" />
          <span>Rendering diagram...</span>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse delay-75" />
          <div className="h-32 w-full bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse delay-150" />
          <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse delay-75" />
        </div>
      </div>
    );
  }

  // Error state: show error banner + raw source code
  if (error) {
    return (
      <div className={cn('not-prose mermaid-container mermaid-error', className)}>
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">
              Diagram rendering failed
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 leading-relaxed break-words">
              {error}
            </p>
          </div>
        </div>
        <div className="relative">
          <div className="absolute top-2.5 right-3 flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 select-none pointer-events-none">
            <GitBranch className="w-3 h-3" />
            mermaid
          </div>
          <pre className="!mt-0 bg-slate-900 rounded-xl p-4 pt-8 overflow-x-auto border border-white/5 shadow-lg">
            <code className="text-xs text-slate-300 leading-relaxed">{chart}</code>
          </pre>
        </div>
      </div>
    );
  }

  // Success: render the SVG diagram
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        ref={containerRef}
        className={cn(
          'not-prose mermaid-container mermaid-success group/diagram relative',
          onExpand && 'cursor-pointer',
          className,
        )}
        onClick={onExpand ? handleExpand : undefined}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 select-none">
            <GitBranch className="w-3 h-3" />
            diagram
          </div>
          {onExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg opacity-0 group-hover/diagram:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              aria-label="Expand diagram"
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div
          className="mermaid-svg-wrapper flex items-center justify-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {/* Click hint for discoverability */}
        {onExpand && (
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover/diagram:opacity-100 transition-opacity pointer-events-none ring-2 ring-indigo-500/20" />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

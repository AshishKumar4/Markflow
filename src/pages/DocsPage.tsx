import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import { FileText, Loader2, Plus, Calendar, Search, X, Sparkles, LayoutGrid, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api-client';
import type { MarkdownDoc } from '@shared/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
export function DocsPage() {
  const [docs, setDocs] = useState<MarkdownDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fetchDocs = useCallback(async (currentCursor: string | null = null, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const url = currentCursor ? `/api/documents?cursor=${encodeURIComponent(currentCursor)}` : '/api/documents';
      const response = await api<{ items: MarkdownDoc[], next: string | null }>(url);
      setDocs(prev => currentCursor ? [...prev, ...response.items] : response.items);
      setNextCursor(response.next);
    } catch (err) {
      console.error('Failed to fetch docs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  const stripMarkdown = useCallback((text: string) => {
    if (!text) return '';
    return text.replace(/[#*`_~]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n+/g, ' ').trim().slice(0, 140) + '...';
  }, []);
  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? docs.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)) : docs;
  }, [docs, searchQuery]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <ThemeToggle className="hidden sm:flex absolute top-12 right-8" />
      <div className="py-8 md:py-12 lg:py-16">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
              <LayoutGrid className="w-3 h-3" /> Library
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tight">Directory</h1>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full md:w-auto items-center sm:items-end">
            <div className="relative group w-full sm:w-64 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500" />
              <Input placeholder="Search docs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-11 h-12 bg-secondary/50 rounded-2xl" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5"><X className="w-4 h-4 text-muted-foreground" /></button>}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="icon" onClick={() => fetchDocs(null, true)} disabled={refreshing} className="h-12 w-12 rounded-2xl shrink-0">
                <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
              </Button>
              <ThemeToggle className="sm:hidden h-12 w-12 rounded-2xl bg-secondary/50 border" />
              <Button asChild className="btn-gradient rounded-2xl h-12 px-6 font-bold shadow-indigo-500/20 flex-1 sm:flex-none">
                <Link to="/new"><Plus className="w-5 h-5 mr-2" /> New</Link>
              </Button>
            </div>
          </div>
        </header>
        {loading && docs.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">{[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse bg-muted h-64 rounded-3xl" />)}</div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-32 bg-muted/20 rounded-[3rem] border-2 border-dashed">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-2xl font-bold">No documents found</h3>
            <Button onClick={() => setSearchQuery('')} variant="link">Clear Search</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredDocs.map((doc, idx) => (
                <motion.div key={doc.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Link to={`/d/${doc.id}`} className="block h-full">
                    <Card className="h-full flex flex-col hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 rounded-3xl border-border/50 bg-card/50 overflow-hidden group">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-3 h-3" /> Published</span>
                          <span className="text-[10px] text-muted-foreground font-bold">{Math.ceil(doc.content.length / 1024)} KB</span>
                        </div>
                        <CardTitle className="text-xl font-bold line-clamp-2 group-hover:text-indigo-600 transition-colors">{doc.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1"><p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">{stripMarkdown(doc.content)}</p></CardContent>
                      <CardFooter className="pt-2 pb-6 border-t border-border/5 bg-muted/5">
                        <div className="flex items-center text-[10px] text-muted-foreground font-black uppercase tracking-widest gap-2">
                          <Calendar className="w-3 h-3" /> {isValid(new Date(doc.createdAt)) ? format(new Date(doc.createdAt), 'MMM d, yyyy') : 'Recently'}
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
            {nextCursor && !searchQuery && (
              <div className="col-span-full flex justify-center pt-8">
                <Button onClick={() => fetchDocs(nextCursor)} variant="outline" className="rounded-full px-12 h-12 font-bold">{loading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Plus className="mr-2 w-4 h-4" />} Load More</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
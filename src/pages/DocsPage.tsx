import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import { FileText, Loader2, Plus, Calendar, ArrowRight, Search, X, Sparkles, LayoutGrid } from 'lucide-react';
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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fetchDocs = useCallback(async (currentCursor: string | null = null) => {
    setLoading(true);
    try {
      const url = currentCursor
        ? `/api/documents?cursor=${encodeURIComponent(currentCursor)}`
        : '/api/documents';
      const response = await api<{ items: MarkdownDoc[], next: string | null }>(url);
      setDocs(prev => currentCursor ? [...prev, ...response.items] : response.items);
      setNextCursor(response.next);
    } catch (err) {
      console.error('Failed to fetch docs:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);
  const handleLoadMore = () => {
    if (nextCursor && !loading) {
      fetchDocs(nextCursor);
    }
  };
  const stripMarkdown = useCallback((text: string) => {
    if (!text) return '';
    return text
      .replace(/[#*`_~]/g, '') // Basic punctuation
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/^>\s*/gm, '') // Blockquotes
      .replace(/^\s*[-+*]\s*/gm, '') // Lists
      .replace(/\n+/g, ' ') // Newlines to spaces
      .trim()
      .slice(0, 160) + (text.length > 160 ? '...' : '');
  }, []);
  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return docs;
    return docs.filter(doc =>
      doc.title.toLowerCase().includes(query) ||
      doc.content.toLowerCase().includes(query)
    );
  }, [docs, searchQuery]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-12 lg:py-16">
        <ThemeToggle />
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest">
              <LayoutGrid className="w-3 h-3" />
              <span>Library</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tight text-foreground">
              Document Directory
            </h1>
            <p className="text-muted-foreground text-lg font-medium max-w-xl">
              Discover and read public documents shared by the community.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row gap-4 w-full md:w-auto"
          >
            <div className="relative group flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
              <Input
                placeholder="Search by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-11 h-12 bg-secondary/50 border-input hover:border-indigo-500/30 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 transition-all text-base font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button asChild className="btn-gradient rounded-2xl h-12 px-8 shadow-xl shadow-indigo-500/20 font-bold shrink-0">
              <Link to="/new">
                <Plus className="w-5 h-5 mr-2" />
                New Doc
              </Link>
            </Button>
          </motion.div>
        </header>
        {loading && docs.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-muted/30 h-72 border-none rounded-3xl" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 sm:py-32 bg-muted/10 rounded-[2.5rem] border-2 border-dashed border-border/60"
          >
            <div className="w-20 h-20 bg-background rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-black/5 ring-1 ring-black/5">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-3xl font-display font-bold mb-3">
              {searchQuery ? 'No documents found' : 'The library is empty'}
            </h3>
            <p className="text-muted-foreground mb-10 max-w-sm mx-auto text-lg font-medium">
              {searchQuery 
                ? `We couldn't find anything matching "${searchQuery}". Try a different term.` 
                : 'Be the first to publish a thought, guide, or note to the community!'}
            </p>
            {searchQuery ? (
              <Button onClick={() => setSearchQuery('')} variant="outline" className="rounded-full h-12 px-8 font-bold border-2 hover:bg-secondary">
                Clear search
              </Button>
            ) : (
              <Button asChild size="lg" className="rounded-full px-12 h-14 btn-gradient font-bold shadow-2xl shadow-indigo-500/20">
                <Link to="/new">Start Writing</Link>
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-16">
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredDocs.map((doc, idx) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="group h-full flex flex-col hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 border-border/50 rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border hover:border-indigo-500/40">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">
                            <Sparkles className="w-3 h-3 mr-1" />
                            <span>Verified</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            {Math.ceil(doc.content.length / 1000)}kb
                          </span>
                        </div>
                        <CardTitle className="text-2xl font-display font-bold line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                          {doc.title}
                        </CardTitle>
                        <div className="flex items-center text-xs text-muted-foreground gap-2 pt-2 font-bold uppercase tracking-tighter">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          {doc.createdAt && isValid(new Date(doc.createdAt)) 
                            ? format(new Date(doc.createdAt), 'MMM d, yyyy') 
                            : 'Recently'}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="text-muted-foreground line-clamp-3 leading-relaxed font-medium">
                          {stripMarkdown(doc.content)}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-0 pb-8">
                        <Button variant="ghost" size="sm" asChild className="p-0 h-auto hover:bg-transparent text-indigo-600 dark:text-indigo-400 font-bold group/link">
                          <Link to={`/d/${doc.id}`} className="flex items-center gap-2">
                            Read more
                            <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1.5 transition-transform" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
            {nextCursor && !searchQuery && (
              <div className="flex justify-center pt-8">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  disabled={loading}
                  className="rounded-full px-12 h-14 text-base font-bold border-2 hover:bg-secondary transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-3" />
                  ) : (
                    <Plus className="w-5 h-5 mr-3" />
                  )}
                  {loading ? 'Fetching...' : 'Load More Documents'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
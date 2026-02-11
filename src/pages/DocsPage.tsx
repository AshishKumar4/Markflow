import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Loader2, Plus, Calendar, ArrowRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api-client';
import type { MarkdownDoc } from '@shared/types';
export function DocsPage() {
  const [docs, setDocs] = useState<MarkdownDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fetchDocs = async (currentCursor: string | null = null) => {
    setLoading(true);
    try {
      const url = currentCursor
        ? `/api/documents?cursor=${encodeURIComponent(currentCursor)}`
        : '/api/documents';
      const response = await api<{ items: MarkdownDoc[], next: string | null }>(url);
      if (currentCursor) {
        setDocs(prev => [...prev, ...response.items]);
      } else {
        setDocs(response.items);
      }
      setNextCursor(response.next);
    } catch (err) {
      console.error('Failed to fetch docs:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDocs();
  }, []);
  const handleLoadMore = () => {
    if (nextCursor) {
      fetchDocs(nextCursor);
    }
  };
  const stripMarkdown = (text: string) => {
    return text
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 150) + (text.length > 150 ? '...' : '');
  };
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const query = searchQuery.toLowerCase();
    return docs.filter(doc => 
      doc.title.toLowerCase().includes(query) || 
      doc.content.toLowerCase().includes(query)
    );
  }, [docs, searchQuery]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <ThemeToggle />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-bold tracking-tight">Document Directory</h1>
            <p className="text-muted-foreground text-lg">Explore public writings from the community.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative group flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-11 bg-secondary border-input rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button asChild className="btn-gradient rounded-xl h-11 px-6 shadow-indigo-500/20">
              <Link to="/new">
                <Plus className="w-4 h-4 mr-2" />
                New Document
              </Link>
            </Button>
          </div>
        </div>
        {loading && docs.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-muted/50 h-64 border-none rounded-2xl" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-24 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/60">
            <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {searchQuery ? 'No matches found' : 'No documents yet'}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
              {searchQuery ? `We couldn't find anything matching "${searchQuery}"` : 'Be the first one to publish a thought on MarkFlow!'}
            </p>
            {searchQuery ? (
              <Button onClick={() => setSearchQuery('')} variant="outline" className="rounded-full">
                Clear search
              </Button>
            ) : (
              <Button asChild variant="outline" className="rounded-full px-8">
                <Link to="/new">Start Writing</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="group hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 border-border/50 rounded-2xl overflow-hidden flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {doc.title}
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground gap-2 pt-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {doc.createdAt ? format(doc.createdAt, 'MMM d, yyyy') : 'Recently'}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {stripMarkdown(doc.content)}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 pb-6">
                    <Button variant="ghost" size="sm" asChild className="p-0 h-auto hover:bg-transparent text-indigo-600 dark:text-indigo-400 font-semibold">
                      <Link to={`/d/${doc.id}`} className="flex items-center gap-1 group/link">
                        Read Document
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            {nextCursor && !searchQuery && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  disabled={loading}
                  className="rounded-full px-10 h-12 text-base border-2 hover:bg-secondary transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
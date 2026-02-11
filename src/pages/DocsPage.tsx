import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Loader2, Plus, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api-client';
import type { MarkdownDoc } from '@shared/types';
export function DocsPage() {
  const [docs, setDocs] = useState<MarkdownDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
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
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .slice(0, 150) + (text.length > 150 ? '...' : '');
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <ThemeToggle />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold">Document Directory</h1>
            <p className="text-muted-foreground">Explore public writings from the community.</p>
          </div>
          <Button asChild className="btn-gradient rounded-full">
            <Link to="/new">
              <Plus className="w-4 h-4 mr-2" />
              New Document
            </Link>
          </Button>
        </div>
        {loading && docs.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-muted h-64 border-none" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-border">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-6">Be the first one to publish a thought!</p>
            <Button asChild variant="outline">
              <Link to="/new">Start Writing</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {docs.map((doc) => (
                <Card key={doc.id} className="group hover:shadow-lg transition-all duration-300 border-border/50">
                  <CardHeader>
                    <CardTitle className="line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {doc.title}
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground gap-2 pt-1">
                      <Calendar className="w-3 h-3" />
                      {doc.createdAt ? format(doc.createdAt, 'MMM d, yyyy') : 'Recently'}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {stripMarkdown(doc.content)}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" size="sm" asChild className="p-0 group-hover:text-indigo-600">
                      <Link to={`/d/${doc.id}`} className="flex items-center gap-1">
                        Read more
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            {nextCursor && (
              <div className="flex justify-center pt-8">
                <Button 
                  onClick={handleLoadMore} 
                  variant="outline" 
                  disabled={loading}
                  className="rounded-full px-8"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
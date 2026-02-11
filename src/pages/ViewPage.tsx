import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit3, ArrowLeft, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api-client';
import type { MarkdownDoc } from '@shared/types';
export function ViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<MarkdownDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api<MarkdownDoc>(`/api/documents/${id}`)
      .then(setDoc)
      .catch(() => toast.error("Document not found"))
      .finally(() => setIsLoading(false));
  }, [id]);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Document Not Found</h1>
        <Button asChild variant="outline">
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background pb-20">
      <ThemeToggle />
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="rounded-full">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Share
            </Button>
            <Button asChild variant="secondary" size="sm" className="rounded-full">
              <Link to={`/edit/${doc.id}`}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20 animate-fade-in">
        <header className="mb-12 border-b border-border pb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight leading-tight">
            {doc.title}
          </h1>
          <div className="flex items-center text-sm text-muted-foreground gap-4">
            <span>{doc.createdAt ? format(doc.createdAt, 'MMMM d, yyyy') : 'Recently'}</span>
            <span>•</span>
            <span>{Math.ceil((doc.content?.split(' ').length || 0) / 200)} min read</span>
          </div>
        </header>
        <MarkdownPreview content={doc.content} proseSize="xl" />
        <footer className="mt-20 pt-10 border-t border-border flex flex-col items-center gap-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Published with</p>
            <h2 className="text-3xl font-display font-bold tracking-tight">
              Mark<span className="text-gradient">Flow</span>
            </h2>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/new">Create your own doc</Link>
          </Button>
        </footer>
      </main>
      <div className="fixed bottom-6 right-6 sm:hidden">
        <Button asChild size="icon" className="w-14 h-14 rounded-full shadow-lg btn-gradient">
          <Link to={`/edit/${doc.id}`}>
            <Edit3 className="w-6 h-6" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
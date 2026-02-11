import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import { Save, Eye, Edit3, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { ThemeToggle } from '@/components/ThemeToggle';
import { api } from '@/lib/api-client';
import type { MarkdownDoc } from '@shared/types';
import { cn } from '@/lib/utils';
export function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);
  const [viewMode, setViewMode] = useState<'split' | 'write' | 'preview'>('split');
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      api<MarkdownDoc>(`/api/docs/${id}`)
        .then(doc => {
          setTitle(doc.title);
          setContent(doc.content);
        })
        .catch(err => {
          console.error(err);
          toast.error("Could not load document");
        })
        .finally(() => setIsLoading(false));
    }
  }, [id]);
  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Document content cannot be empty");
      return;
    }
    setIsSaving(true);
    try {
      const endpoint = id ? `/api/docs/${id}` : '/api/docs';
      const method = id ? 'PUT' : 'POST';
      const doc = await api<MarkdownDoc>(endpoint, {
        method,
        body: JSON.stringify({ title: title || 'Untitled', content }),
      });
      toast.success(id ? "Changes saved" : "Document published!");
      if (!id) navigate(`/d/${doc.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Navigation */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <input
            type="text"
            placeholder="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-lg font-semibold w-40 sm:w-64 placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-secondary rounded-lg p-1 mr-2">
            <Button 
              variant={viewMode === 'write' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('write')}
              className={cn("h-8", viewMode === 'write' && "bg-background shadow-sm")}
            >
              Write
            </Button>
            <Button 
              variant={viewMode === 'split' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('split')}
              className={cn("h-8", viewMode === 'split' && "bg-background shadow-sm")}
            >
              Split
            </Button>
            <Button 
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('preview')}
              className={cn("h-8", viewMode === 'preview' && "bg-background shadow-sm")}
            >
              Preview
            </Button>
          </div>
          <ThemeToggle className="static" />
          <Button onClick={handleSave} disabled={isSaving} className="btn-gradient rounded-full">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {id ? 'Save' : 'Publish'}
          </Button>
        </div>
      </header>
      {/* Main Workspace */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Editor Pane */}
        {(viewMode === 'write' || viewMode === 'split') && (
          <div className={cn(
            "flex-1 overflow-y-auto px-4 py-8 md:px-8 bg-background border-r border-border",
            viewMode === 'write' ? "max-w-4xl mx-auto border-r-0" : ""
          )}>
            <TextareaAutosize
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing in Markdown..."
              className="w-full min-h-full resize-none bg-transparent border-none focus:ring-0 font-mono text-base leading-relaxed placeholder:text-muted-foreground/50"
            />
          </div>
        )}
        {/* Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={cn(
            "flex-1 overflow-y-auto px-4 py-8 md:px-12 bg-card",
            viewMode === 'preview' ? "max-w-4xl mx-auto" : ""
          )}>
            <MarkdownPreview content={content} proseSize="lg" />
          </div>
        )}
      </main>
    </div>
  );
}
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommentSection } from './comment-section';
import { cn } from '@/lib/utils';
interface CommentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  selection?: { text: string; index: number } | null;
  onClearSelection?: () => void;
  activeCommentId?: string | null;
  onClearActive?: () => void;
}
export function CommentSidebar({
  isOpen,
  onClose,
  docId,
  selection,
  onClearSelection,
  activeCommentId,
  onClearActive
}: CommentSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  if (!isOpen) return null;
  return (
    <div className="w-full h-full flex flex-col bg-card border-l border-border shadow-inner z-50 overflow-hidden">
      <header className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <motion.div
            key={activeCommentId ? 'active' : 'normal'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <MessageSquare className={cn("w-4 h-4", activeCommentId ? "text-indigo-600 animate-pulse" : "text-muted-foreground")} />
            <h2 className="text-sm font-bold uppercase tracking-widest">
              {activeCommentId ? 'Focused Discussion' : 'Discussions'}
            </h2>
          </motion.div>
        </div>
        <div className="flex items-center gap-1">
          {activeCommentId && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[10px] font-black uppercase tracking-tight text-indigo-600 hover:bg-indigo-50"
              onClick={onClearActive}
            >
              <FilterX className="w-3 h-3 mr-1" /> Clear Focus
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-4" ref={containerRef}>
          <CommentSection
            docId={docId}
            sidebarMode
            selection={selection}
            onClearSelection={onClearSelection}
            activeCommentId={activeCommentId}
            onClearActive={onClearActive}
          />
        </div>
      </ScrollArea>
      <footer className="p-4 border-t border-border bg-muted/30">
        <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-tighter">
          Highlight text in the document to start a thread
        </p>
      </footer>
    </div>
  );
}
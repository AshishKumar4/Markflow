import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Filter } from 'lucide-react';
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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full h-full flex flex-col bg-card border-l border-border shadow-2xl z-50 overflow-hidden"
        >
          <header className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0 bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-widest">Discussions</h2>
            </div>
            <div className="flex items-center gap-1">
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
              Highlight text in the document to annotate
            </p>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
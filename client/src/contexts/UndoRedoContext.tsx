import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface Action {
  type: 'create' | 'update' | 'delete' | 'archive';
  taskId?: number;
  previousState?: any;
  newState?: any;
  timestamp: number;
}

interface UndoRedoContextType {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  recordAction: (action: Action) => void;
  clearHistory: () => void;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

const MAX_HISTORY_SIZE = 50;

export function UndoRedoProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Action[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  const recordAction = useCallback((action: Action) => {
    setHistory(prev => {
      // Remove any actions after current index (when recording a new action after undo)
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(action);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => {
      const newIndex = prev + 1;
      return newIndex >= MAX_HISTORY_SIZE ? MAX_HISTORY_SIZE - 1 : newIndex;
    });
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    
    const action = history[currentIndex];
    console.log('[Undo] Action:', action);
    
    // Emit custom event for Home.tsx to handle
    window.dispatchEvent(new CustomEvent('undo-action', { detail: action }));
    
    setCurrentIndex(prev => prev - 1);
  }, [canUndo, currentIndex, history]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    
    const action = history[currentIndex + 1];
    console.log('[Redo] Action:', action);
    
    // Emit custom event for Home.tsx to handle
    window.dispatchEvent(new CustomEvent('redo-action', { detail: action }));
    
    setCurrentIndex(prev => prev + 1);
  }, [canRedo, currentIndex, history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <UndoRedoContext.Provider value={{ canUndo, canRedo, undo, redo, recordAction, clearHistory }}>
      {children}
    </UndoRedoContext.Provider>
  );
}

export function useUndoRedo() {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedo must be used within UndoRedoProvider');
  }
  return context;
}

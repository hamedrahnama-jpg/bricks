import { useState, useCallback } from 'react';

const MAX_HISTORY = 60;

export default function useUndoRedo(initialState) {
  const [stack, setStack] = useState({
    history: [initialState],
    index: 0
  });

  const { history, index } = stack;
  const state = history[index] ?? initialState;

  const setState = useCallback((updater) => {
    setStack(prev => {
      const current = prev.history[prev.index];
      const next = typeof updater === 'function' ? updater(current) : updater;

      let history = prev.history.slice(0, prev.index + 1).concat([next]);
      if (history.length > MAX_HISTORY) {
        history = history.slice(history.length - MAX_HISTORY);
      }

      return {
        history,
        index: history.length - 1
      };
    });
  }, []);

  const undo = useCallback(() => {
    setStack(prev => ({
      ...prev,
      index: Math.max(0, prev.index - 1)
    }));
  }, []);

  const redo = useCallback(() => {
    setStack(prev => ({
      ...prev,
      index: Math.min(prev.index + 1, prev.history.length - 1)
    }));
  }, []);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { state, setState, undo, redo, canUndo, canRedo };
}

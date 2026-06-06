import { useState, useCallback } from 'react';

const MAX_HISTORY = 60;

export default function useUndoRedo(initialState) {
  const [history, setHistory] = useState([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = useCallback((updater) => {
    setHistory(prev => {
      const current = prev[index];
      const next = typeof updater === 'function' ? updater(current) : updater;
      // Slice off any redo history, append new state
      const newHistory = prev.slice(0, index + 1).concat([next]);
      return newHistory.length > MAX_HISTORY ? newHistory.slice(newHistory.length - MAX_HISTORY) : newHistory;
    });
    setIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [index]);

  const undo = useCallback(() => {
    setIndex(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      setIndex(i => Math.min(i + 1, prev.length - 1));
      return prev;
    });
  }, []);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { state, setState, undo, redo, canUndo, canRedo };
}
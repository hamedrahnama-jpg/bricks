import { useState, useCallback } from 'react';

const STORAGE_KEY = 'brick_module_library';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function save(modules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
}

export default function useModuleLibrary() {
  const [modules, setModules] = useState(load);

  const saveModule = useCallback((name, rows) => {
    setModules(prev => {
      const next = [...prev, { id: Date.now(), name, rows }];
      save(next);
      return next;
    });
  }, []);

  const deleteModule = useCallback((id) => {
    setModules(prev => {
      const next = prev.filter(m => m.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { modules, saveModule, deleteModule };
}
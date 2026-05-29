"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type EditModeContextValue = {
  canEdit: boolean;
  editMode: boolean;
  toggle: () => void;
  setEditMode: (next: boolean) => void;
};

const EditModeContext = createContext<EditModeContextValue>({
  canEdit: false,
  editMode: false,
  toggle: () => {},
  setEditMode: () => {},
});

const STORAGE_KEY = "gr:edit-mode";

export function EditModeProvider({
  canEdit,
  children,
}: {
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const [editMode, setEditModeState] = useState(false);

  useEffect(() => {
    if (!canEdit) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "1") setEditModeState(true);
    } catch {}
  }, [canEdit]);

  const setEditMode = useCallback((next: boolean) => {
    setEditModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setEditModeState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo<EditModeContextValue>(
    () => ({
      canEdit,
      editMode: canEdit && editMode,
      toggle,
      setEditMode,
    }),
    [canEdit, editMode, toggle, setEditMode],
  );

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

export function useEditMode() {
  return useContext(EditModeContext);
}

"use client";

import { Pencil, Eye } from "lucide-react";
import { useEditMode } from "./edit-mode-context";

export function AdminEditBar() {
  const { canEdit, editMode, toggle } = useEditMode();
  if (!canEdit) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[60] xl:bottom-6">
      <button
        type="button"
        onClick={toggle}
        className={[
          "group flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] shadow-lg ring-1 transition-all",
          editMode
            ? "bg-[var(--gr-magenta)] text-white ring-[var(--gr-magenta)] hover:bg-[var(--gr-magenta)]/90"
            : "bg-[var(--gr-bg-1)] text-[var(--gr-text)] ring-[var(--gr-border-hi)] hover:bg-[var(--gr-bg-2)]",
        ].join(" ")}
        aria-pressed={editMode}
        title={editMode ? "გათიშე რედაქტირება" : "ჩართე რედაქტირება"}
      >
        {editMode ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        {editMode ? "ვხედავ" : "რედაქტირება"}
      </button>
    </div>
  );
}

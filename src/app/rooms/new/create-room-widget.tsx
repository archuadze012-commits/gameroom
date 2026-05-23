"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { NewRoomForm } from "./new-room-form";

type Props = {
  gameSlug: string;
  hostId: string;
  mode: string;
};

export function CreateRoomWidget(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center justify-between gap-3 bg-gradient-to-r from-[var(--gr-violet)] to-[var(--gr-magenta)] px-5 py-3 font-display text-[13px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_4px_18px_rgba(139,92,246,0.35)] transition-[filter,transform] hover:brightness-110 active:scale-[0.99]"
        style={{ clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)" }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Plus className={`h-4 w-4 transition-transform ${open ? "rotate-45" : ""}`} />
          {open ? "დახურვა" : "ახალი რუმის შექმნა"}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3">
          <NewRoomForm {...props} />
        </div>
      )}
    </div>
  );
}

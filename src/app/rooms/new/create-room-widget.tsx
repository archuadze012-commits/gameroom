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
    <div className="mb-8">
      <div className="group relative rounded-[24px] p-[1.5px] bg-gradient-to-br from-white/10 to-white/5 transition-all duration-500 hover:from-[#00d0ff] hover:via-[#6366f1] hover:to-[#f43f5e] hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative flex w-full items-center justify-between gap-4 rounded-[22.5px] bg-[#0a0714] px-6 py-4 font-display text-[14px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md transition-all active:scale-[0.99]"
          aria-expanded={open}
        >
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(99,102,241,0.1),transparent_50%)] pointer-events-none rounded-[22.5px]" />
          <span className="relative z-10 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Plus className={`h-4 w-4 transition-transform ${open ? "rotate-45" : ""}`} />
            </div>
            {open ? "დახურვა" : "ახალი რუმის შექმნა"}
          </span>
          <ChevronDown
            className={`relative z-10 h-5 w-5 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="mt-4">
          <NewRoomForm {...props} />
        </div>
      )}
    </div>
  );
}

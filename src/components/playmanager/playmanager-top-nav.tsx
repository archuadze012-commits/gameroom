"use client";

import { usePathname } from "next/navigation";
import { PlayManagerSidebar } from "@/components/playmanager/playmanager-side-nav";

// Global PlayManager left rail (rendered from the layout). Hidden on routes that
// render their own shell with the sidebar baked in, to avoid a double rail.
export function PlayManagerTopNav() {
  const pathname = usePathname();

  if (pathname === "/playmanager" || pathname === "/playmanager/arena" || pathname === "/playmanager/create-team") {
    return null;
  }

  return (
    <div className="pm-top-nav">
      <PlayManagerSidebar />
    </div>
  );
}

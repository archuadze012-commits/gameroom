"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useEditMode } from "./edit-mode-context";
import { saveSiteContent } from "@/lib/site-content-client";

type Props = {
  siteKey: string;
  label: string;
  href: string;
  className?: string;
  children?: React.ReactNode;
  label_field?: string;
  href_field?: string;
};

export function EditableLink({
  siteKey,
  label,
  href,
  className,
  children,
  label_field = "label",
  href_field = "href",
}: Props) {
  const { editMode } = useEditMode();
  const [open, setOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);
  const [draftHref, setDraftHref] = useState(href);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    const res = await saveSiteContent(siteKey, {
      [label_field]: draftLabel,
      [href_field]: draftHref,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(`შენახვა ვერ მოხერხდა: ${res.error}`);
      return;
    }
    toast.success("შენახულია");
    setOpen(false);
    startTransition(() => router.refresh());
  }

  if (!editMode) {
    return (
      <Link href={href} className={className}>
        {children ?? label}
      </Link>
    );
  }

  return (
    <>
      <span
        className={[
          className ?? "",
          "relative inline-flex items-center gap-1 outline-2 outline-dashed outline-[var(--gr-violet-hi)]/40 outline-offset-2 hover:outline-[var(--gr-magenta)] cursor-pointer transition-colors",
        ].join(" ")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDraftLabel(label);
          setDraftHref(href);
          setOpen(true);
        }}
        role="button"
        title="ბმულის რედაქტირება"
      >
        {children ?? label}
        <span
          aria-hidden
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--gr-violet-hi)] text-white"
        >
          <Pencil className="h-3 w-3" />
        </span>
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ბმულის რედაქტირება</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              key: <code>{siteKey}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                წარწერა
              </label>
              <Input value={draftLabel} onChange={(e) => setDraftLabel(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ბმული (href)
              </label>
              <Input
                value={draftHref}
                onChange={(e) => setDraftHref(e.target.value)}
                placeholder="/lfg ან https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              გაუქმება
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "შენახვა"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

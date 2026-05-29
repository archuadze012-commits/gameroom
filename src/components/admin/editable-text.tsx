"use client";

import { createElement, useState, useTransition, type MouseEvent } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type AsTag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4";

type Props = {
  siteKey: string;
  field: string;
  value: string;
  multiline?: boolean;
  as?: AsTag;
  className?: string;
  label?: string;
};

export function EditableText({
  siteKey,
  field,
  value,
  multiline = false,
  as = "span",
  className,
  label,
}: Props) {
  const { editMode } = useEditMode();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    const res = await saveSiteContent(siteKey, { [field]: draft });
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
    return createElement(as, { className }, value);
  }

  const editableNode = createElement(
    as,
    {
      className: [
        className ?? "",
        "relative outline-2 outline-dashed outline-[var(--gr-violet-hi)]/40 outline-offset-2 hover:outline-[var(--gr-magenta)] cursor-pointer transition-colors",
      ].join(" "),
      onClick: (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDraft(value);
        setOpen(true);
      },
      title: "რედაქტირება",
      role: "button",
    },
    value,
    createElement(
      "span",
      {
        "aria-hidden": true,
        className:
          "ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--gr-violet-hi)] text-white align-middle",
      },
      <Pencil className="h-3 w-3" />,
    ),
  );

  return (
    <>
      {editableNode}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label ?? "ტექსტის რედაქტირება"}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              key: <code>{siteKey}</code> · field: <code>{field}</code>
            </DialogDescription>
          </DialogHeader>
          {multiline ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              autoFocus
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          )}
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

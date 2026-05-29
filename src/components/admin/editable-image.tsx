"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Loader2, Upload } from "lucide-react";
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
import { saveSiteContent, uploadSiteImage } from "@/lib/site-content-client";

type Props = {
  siteKey: string;
  field: string;
  value: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  folder?: string;
  label?: string;
};

export function EditableImage({
  siteKey,
  field,
  value,
  alt = "",
  className,
  imgClassName,
  folder = "general",
  label,
}: Props) {
  const { editMode } = useEditMode();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function handleUpload(file: File) {
    setUploading(true);
    const res = await uploadSiteImage(file, folder);
    setUploading(false);
    if (!res.ok) {
      toast.error(`ატვირთვა ვერ მოხერხდა: ${res.error}`);
      return;
    }
    setDraft(res.url);
    toast.success("სურათი ატვირთულია — დააჭირე შენახვას");
  }

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
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt={alt} className={imgClassName ?? className} />
    );
  }

  return (
    <>
      <span
        className={[
          "relative inline-block outline-2 outline-dashed outline-[var(--gr-violet-hi)]/40 outline-offset-2 hover:outline-[var(--gr-magenta)] cursor-pointer transition-colors",
          className ?? "",
        ].join(" ")}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDraft(value);
          setOpen(true);
        }}
        role="button"
        title="სურათის რედაქტირება"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt={alt} className={imgClassName ?? className} />
        <span
          aria-hidden
          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded bg-[var(--gr-violet-hi)] text-white shadow"
        >
          <Pencil className="h-3.5 w-3.5" />
        </span>
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label ?? "სურათის რედაქტირება"}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              key: <code>{siteKey}</code> · field: <code>{field}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex justify-center rounded-md border border-dashed border-[var(--gr-border)] bg-[var(--gr-bg-2)] p-3">
              {draft ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft} alt="preview" className="max-h-40 max-w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">პრევიუ აქ გამოჩნდება</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                URL
              </label>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="/logo.png ან https://..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                ფაილის ატვირთვა
              </Button>
              <span className="text-xs text-muted-foreground">max 10 MB · PNG/JPG/WEBP/GIF/SVG</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              გაუქმება
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || uploading || !draft}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "შენახვა"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

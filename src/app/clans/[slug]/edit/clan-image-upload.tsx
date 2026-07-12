"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageCropModal } from "@/components/image-crop-modal";

// Leader-only clan image uploader (avatar or banner). Crops client-side, then
// posts the result to the clan image API which writes to storage via the admin
// client (see api/clans/[slug]/image). One component, two shapes.
export function ClanImageUpload({
  slug,
  kind,
  tag,
  initialUrl,
}: {
  slug: string;
  kind: "avatar" | "banner";
  tag: string;
  initialUrl: string | null;
}) {
  const [src, setSrc] = useState<string | null>(initialUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAvatar = kind === "avatar";
  const maxMb = isAvatar ? 5 : 8;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`სურათი მაქსიმუმ ${maxMb}MB უნდა იყოს.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onCrop = async (croppedDataUrl: string) => {
    setCropSrc(null);
    setLoading(true);
    try {
      const base64 = croppedDataUrl.split(",")[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/jpeg" });

      const form = new FormData();
      form.append("kind", kind);
      form.append("file", blob, `${kind}.jpg`);

      const res = await fetch(`/api/clans/${slug}/image`, { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(res.status === 403 ? "მხოლოდ ლიდერს შეუძლია" : "ატვირთვა ვერ მოხერხდა");
        return;
      }
      setSrc(data.url);
      toast.success(isAvatar ? "ავატარი განახლდა" : "ბანერი განახლდა");
    } catch {
      toast.error("ატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={isAvatar ? 1 : 16 / 5}
          shape={isAvatar ? "round" : "rect"}
          onConfirm={onCrop}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className={`group relative block overflow-hidden border border-white/10 bg-white/[0.03] transition-colors hover:border-[var(--gr-violet-hi)]/40 disabled:opacity-60 ${
          isAvatar ? "h-20 w-20 rounded-2xl" : "h-28 w-full rounded-2xl"
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : isAvatar ? (
          <span className="grid h-full w-full place-items-center text-xl font-black text-indigo-300">{tag}</span>
        ) : (
          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#0d0a2e] via-[#1a0533] to-[#0a1a2e] text-[12px] font-bold text-white/40">
            ბანერი
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-[11px] font-black uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isAvatar ? <Camera className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
    </>
  );
}

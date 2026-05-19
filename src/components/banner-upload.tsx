"use client";

import { useRef, useState, useEffect } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { ImageCropModal } from "@/components/image-crop-modal";
import { toast } from "sonner";

const STORAGE_KEY = "gameroom_banner";

export function BannerUpload({ isOwner }: { isOwner: boolean }) {
  const [bannerSrc, setBannerSrc] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setBannerSrc(saved);
    } catch {}
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("ბანერი მაქსიმუმ 8MB უნდა იყოს."); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCropConfirm = (croppedDataUrl: string) => {
    setCropSrc(null);
    setLoading(true);
    localStorage.setItem(STORAGE_KEY, croppedDataUrl);
    setBannerSrc(croppedDataUrl);
    toast.success("ბანერი განახლდა.");
    setLoading(false);
  };

  const handleRemove = () => {
    localStorage.removeItem(STORAGE_KEY);
    setBannerSrc(null);
    toast.success("ბანერი წაიშალა.");
  };

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={16 / 4}
          shape="rect"
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <div className="relative h-40 overflow-hidden">
        {bannerSrc ? (
          <img src={bannerSrc} alt="banner" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 via-accent/20 to-transparent" />
        )}
        {isOwner && (
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              ბანერის შეცვლა
            </button>
            {bannerSrc && (
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-red-500/40"
              >
                <X className="h-4 w-4" /> წაშლა
              </button>
            )}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
      </div>
    </>
  );
}

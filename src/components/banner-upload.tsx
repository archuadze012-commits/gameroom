"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { ImageCropModal } from "@/components/image-crop-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface BannerUploadProps {
  isOwner: boolean;
  userId?: string;
  initialBannerUrl?: string | null;
}

export function BannerUpload({ isOwner, userId, initialBannerUrl }: BannerUploadProps) {
  const [bannerSrc, setBannerSrc] = useState<string | null>(initialBannerUrl ?? null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("ბანერი მაქსიმუმ 8MB უნდა იყოს."); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCropConfirm = async (croppedDataUrl: string) => {
    setCropSrc(null);
    if (!userId) return;
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const base64 = croppedDataUrl.split(",")[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/jpeg" });
      const path = `${userId}/banner.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(path);
      const cacheBusted = `${publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ banner_url: publicUrl })
        .eq("id", userId);
      if (profileError) throw profileError;

      setBannerSrc(cacheBusted);
      toast.success("ბანერი განახლდა.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "ატვირთვა ვერ მოხერხდა.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.storage.from("banners").remove([`${userId}/banner.jpg`]);
      await supabase.from("profiles").update({ banner_url: null }).eq("id", userId);
      setBannerSrc(null);
      toast.success("ბანერი წაიშალა.");
    } catch {
      toast.error("წაშლა ვერ მოხერხდა.");
    } finally {
      setLoading(false);
    }
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
          <div className="h-full w-full bg-gradient-to-br from-[#0d0a2e] via-[#1a0533] to-[#0a1a2e]" />
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
                disabled={loading}
                className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-red-500/40 disabled:cursor-not-allowed"
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

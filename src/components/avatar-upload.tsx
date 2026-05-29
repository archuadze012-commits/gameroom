"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropModal } from "@/components/image-crop-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface AvatarUploadProps {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isOwner: boolean;
}

export function AvatarUpload({ username, displayName, avatarUrl, isOwner }: AvatarUploadProps) {
  const [src, setSrc] = useState(avatarUrl ?? "/default-avatar.svg");
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = displayName.slice(0, 1).toUpperCase();

  useEffect(() => {
    setSrc(avatarUrl ?? "/default-avatar.svg");
  }, [avatarUrl]);

  useEffect(() => {
    if (!avatarUrl) return;
    try {
      const raw = localStorage.getItem("gameroom_avatars");
      const map = raw ? JSON.parse(raw) : {};
      map[username] = avatarUrl;
      localStorage.setItem("gameroom_avatars", JSON.stringify(map));
      window.dispatchEvent(new StorageEvent("storage", { key: "gameroom_avatars" }));
    } catch {}
  }, [avatarUrl, username]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("ფოტო მაქსიმუმ 5MB უნდა იყოს."); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCropConfirm = async (croppedDataUrl: string) => {
    setCropSrc(null);
    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const blob = await fetch(croppedDataUrl).then((r) => r.blob());
      const path = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (updateError) throw updateError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await supabase.auth.refreshSession();

      try {
        const raw = localStorage.getItem("gameroom_avatars");
        const map = raw ? JSON.parse(raw) : {};
        map[username] = publicUrl;
        localStorage.setItem("gameroom_avatars", JSON.stringify(map));
        window.dispatchEvent(new StorageEvent("storage", { key: "gameroom_avatars" }));
      } catch {}

      setSrc(publicUrl);
      toast.success("პროფილის ფოტო განახლდა.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "ატვირთვა ვერ მოხერხდა.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={1}
          shape="round"
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <div className="relative inline-block">
        <div
          className="h-24 w-24 border-4 border-background rounded-full overflow-hidden bg-primary/15 flex items-center justify-center"
          style={{ flexShrink: 0 }}
        >
          {src && src !== "/default-avatar.svg" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <span className="text-2xl font-bold text-primary">{initial}</span>
          )}
        </div>
        {isOwner && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100 disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
            </button>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
          </>
        )}
      </div>
    </>
  );
}

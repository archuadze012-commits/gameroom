"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send, Sparkles, X, Activity } from "lucide-react";
import { toast } from "sonner";
import { createPostAction } from "@/app/feed/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";

export type PostComposerUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type PostComposerPost = {
  id: string;
  content: string;
  media_urls?: string[] | null;
  likes_count: number;
  created_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
    role?: string | null;
  };
};

type Props = {
  currentUser: PostComposerUser;
  revalidatePath: string;
  className?: string;
  onPostCreated?: (post: PostComposerPost) => void;
};

export function PostComposer({
  currentUser,
  revalidatePath,
  className = "",
  onPostCreated,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const authorName = currentUser.displayName || currentUser.username;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (mediaUrls.length + files.length > 4) {
      toast.error("მაქსიმუმ 4 სურათი");
      return;
    }

    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          if (file.size > 8 * 1024 * 1024) {
            toast.error("მაქს 8MB სურათზე");
            return null;
          }

          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from("post_media").upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

          if (error) {
            toast.error(error.message);
            return null;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("post_media").getPublicUrl(path);

          return publicUrl;
        })
      );

      setMediaUrls((prev) => [...prev, ...uploads.filter((url): url is string => !!url)]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submitPost(formData: FormData) {
    setIsPending(true);
    try {
      const result = await createPostAction({ success: false }, formData);
      if (!result.success || !result.newPost) {
        toast.error(result.message ?? "პოსტის გამოქვეყნება ვერ მოხერხდა");
        return;
      }

      onPostCreated?.(result.newPost as PostComposerPost);
      setDraft("");
      setMediaUrls([]);
      toast.success(result.message);
      fetch("/api/badges/check", { method: "POST" }).catch(() => {});
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative p-5">
        <form
          action={(formData) => {
            void submitPost(formData);
          }}
          className="relative space-y-4"
        >
          {/* Header Row */}
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
              <AvatarImage src={currentUser.avatarUrl ?? ""} alt={authorName} />
              <AvatarFallback className="bg-violet-500/10 text-sm font-black text-violet-400">
                {authorName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display text-[16px] font-black uppercase text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                  {authorName}
                </span>
                <Pill tone="magenta" icon={<Activity className="h-3 w-3" />} pulse>
                  LIVE POST
                </Pill>
                <Pill tone="cyan" icon={<Sparkles className="h-3 w-3" />}>
                  მთავარი ფიდი
                </Pill>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
                <span>@{currentUser.username}</span>
                <span className="text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">MATCH CLIPS / UPDATES / LFG</span>
              </div>
            </div>
          </div>

          {/* Textarea Area */}
          <div className="relative mt-2">
            <Textarea
              name="content"
              maxLength={2000}
              placeholder="გააზიარე მატჩის კლიპი, აზრი, ან LFG განახლება..."
              className="min-h-[120px] w-full resize-none bg-transparent border-0 px-0 py-2 text-[16px] leading-relaxed text-white/90 placeholder:text-white/30 focus-visible:ring-0 focus-visible:outline-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Media Queue */}
          {mediaUrls.length > 0 && (
            <div className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {mediaUrls.map((url, index) => (
                  <div
                    key={url}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-white/10"
                  >
                    <Image src={url} alt="" fill sizes="120px" className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <input type="hidden" name="mediaUrls" value={url} />
                    <button
                      type="button"
                      onClick={() => setMediaUrls((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-md transition-colors hover:bg-pink-500"
                      disabled={isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input type="hidden" name="revalidatePath" value={revalidatePath} />
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={isPending}
          />

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || mediaUrls.length >= 4 || isPending}
                className="group flex h-10 items-center justify-center gap-2 rounded-full bg-white/5 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
                title="დაამატე სურათი"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-pink-400" />
                ) : (
                  <ImagePlus className="h-4 w-4 text-violet-400 group-hover:text-pink-400 transition-colors" />
                )}
                <span className="hidden sm:inline">მედია</span>
              </button>
              <span className="text-[11px] font-bold text-white/30">{draft.length}/2000</span>
            </div>

            <button
              type="submit"
              disabled={!draft.trim() || isPending || uploading}
              className="relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(90deg,#ec4899,#8b5cf6)] px-6 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isPending ? "იგზავნება..." : "გამოქვეყნება"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

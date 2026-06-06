"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send, X, Activity } from "lucide-react";
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
    <div className={`pubg-loadout-link group block ${className}`} data-variant="strike">
      <div className="pubg-loadout-card relative overflow-hidden p-5 sm:p-6">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
        <div className="relative z-[1]">
        <form
          action={(formData) => {
            void submitPost(formData);
          }}
          className="relative space-y-4"
        >
          {/* Header Row */}
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0 border border-white/10 shadow-[0_0_18px_rgba(0,230,255,0.15)]">
              <AvatarImage src={currentUser.avatarUrl ?? ""} alt={authorName} />
              <AvatarFallback className="bg-[linear-gradient(135deg,var(--gr-magenta),var(--gr-violet-hi))] text-sm font-black text-white">
                {authorName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display text-[16px] font-black uppercase tracking-[0.04em] text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.45)]">
                  {authorName}
                </span>
                <Pill tone="magenta" icon={<Activity className="h-3 w-3" />} pulse className="text-[10px]">
                  LIVE POST
                </Pill>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D0F8FF]/75 drop-shadow-[0_0_6px_rgba(0,230,255,0.3)]">
                share a moment
              </p>
            </div>
          </div>

          {/* Textarea Area */}
          <div className="relative mt-2">
            <Textarea
              name="content"
              maxLength={2000}
              placeholder="დაგვიპოსტე, რა ხდება ახალი. დღეს ვინ გაგზავნე ელექტრონულ საიქიოში"
              className="min-h-[132px] w-full resize-none rounded-[18px] border border-white/8 bg-black/35 px-4 py-4 text-[16px] leading-relaxed text-white/90 shadow-inner placeholder:text-white/28 focus-visible:ring-0 focus-visible:outline-none focus-visible:border-[var(--gr-magenta)]/25 focus-visible:bg-black/45"
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
                    className="group relative aspect-square overflow-hidden rounded-[18px] border border-white/10 bg-black/25"
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-y-3 gap-x-2 border-t border-white/10 pt-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || mediaUrls.length >= 4 || isPending}
                className="pubg-loadout-card group relative flex h-10 items-center justify-center gap-2 overflow-hidden px-4 text-[11px] font-black uppercase tracking-[0.16em] text-[#D0F8FF] transition-all hover:text-white disabled:opacity-50"
                title="დაამატე სურათი"
              >
                <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                {uploading ? (
                  <Loader2 className="relative z-[1] h-4 w-4 animate-spin text-[var(--gr-magenta)]" />
                ) : (
                  <ImagePlus className="relative z-[1] h-4 w-4 text-[var(--gr-magenta)] group-hover:text-white transition-colors" />
                )}
                <span className="relative z-[1] hidden sm:inline">მედია</span>
              </button>
              <span className="text-[11px] font-bold text-[#D0F8FF]/55">{draft.length}/2000</span>
            </div>

            <button
              type="submit"
              disabled={!draft.trim() || isPending || uploading}
              className="pubg-loadout-card group relative flex h-12 min-w-[170px] items-center justify-center overflow-hidden px-6 transition-all duration-500 disabled:pointer-events-none disabled:opacity-50"
            >
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <div className="relative z-[1] flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.18em] text-white">
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--gr-magenta)]" />
                ) : (
                  <Send className="h-4 w-4 text-[var(--gr-magenta)]" />
                )}
                {isPending ? "იგზავნება..." : "გამოქვეყნება"}
              </div>
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

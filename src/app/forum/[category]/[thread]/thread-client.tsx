"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, CornerDownRight } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CUT = "polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)";
const CUT_SM = "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%)";

type ClientPost = {
  id: string;
  author: string;
  authorId: string;
  ago: string;
  body: string;
  likes: number;
  hasLiked: boolean;
};

export function ThreadClient({
  threadId,
  initialPosts,
  currentUser,
  threadAuthorId,
}: {
  threadId: string;
  initialPosts: ClientPost[];
  currentUser: any;
  threadAuthorId: string;
}) {
  const [posts, setPosts] = useState<ClientPost[]>(initialPosts);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState<string | null>(null);

  async function handleSubmit() {
    if (!text.trim() || loading || !currentUser) return;
    setLoading(true);
    try {
      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, body: text.trim() }),
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts((prev) => [
          ...prev,
          {
            id: newPost.id,
            author: currentUser.user_metadata?.username || currentUser.email?.split("@")[0] || "You",
            authorId: currentUser.id,
            ago: "ახლახან",
            body: text.trim(),
            likes: 0,
            hasLiked: false,
          },
        ]);
        setText("");
      } else {
        const err = await res.json();
        alert(err.error || "პასუხის გამოქვეყნება ვერ მოხერხდა");
      }
    } catch (e) {
      console.error(e);
      alert("კავშირის შეცდომა");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleLike(postId: string) {
    if (!currentUser || likeLoading === postId) return;
    setLikeLoading(postId);
    const post = posts.find((p) => p.id === postId);
    if (!post) { setLikeLoading(null); return; }
    const method = post.hasLiked ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/forum/posts/${postId}/like`, { method });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, hasLiked: !p.hasLiked, likes: p.hasLiked ? p.likes - 1 : p.likes + 1 } : p
          )
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLikeLoading(null);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {posts.map((p) => (
          /* ── Post card — same border trick as post cards ── */
          <div
            key={p.id}
            className="group relative isolate transition-all duration-300 hover:[--post-border:rgba(236,72,153,0.8)]"
            style={{
              clipPath: CUT,
              background: "var(--post-border, rgba(167,139,250,0.45))",
              padding: 1,
            }}
          >
            <div
              className="relative overflow-hidden bg-[var(--gr-bg-1)]"
              style={{ clipPath: CUT }}
            >
              {/* violet top-line */}
              <span
                aria-hidden
                className="absolute left-0 top-0 z-10 h-[2px] w-full"
                style={{ background: "linear-gradient(90deg,transparent,rgba(167,139,250,0.75),transparent)" }}
              />
              {/* magenta laser on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full translate-x-[-100%] opacity-0
                           group-hover:translate-x-[100%] group-hover:opacity-100
                           group-hover:transition-transform group-hover:duration-700"
                style={{ background: "linear-gradient(90deg,transparent,rgba(236,72,153,0.9),transparent)" }}
              />
              {/* subtle glow always */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(167,139,250,0.07) 0%,transparent 65%)" }}
              />
              {/* magenta glow on hover */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(236,72,153,0.10) 0%,transparent 65%)" }}
              />

              <div className="relative z-[2] space-y-3 p-5">
                {/* author row */}
                <div className="flex items-center gap-3">
                  <UserAvatar username={p.author} size="sm" />
                  <div className="flex-1">
                    <Link href={`/profile/${p.author}`} className="text-sm font-semibold text-[var(--gr-text)] hover:text-[var(--gr-violet-hi)] transition-colors">
                      {p.author}
                    </Link>
                    <div className="text-[11px] text-[var(--gr-text-dim)]">{p.ago}</div>
                  </div>
                  {p.authorId === threadAuthorId && (
                    <span
                      className="px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]"
                      style={{
                        clipPath: CUT_SM,
                        background: "color-mix(in srgb,var(--gr-violet) 20%,transparent)",
                        color: "var(--gr-violet-hi)",
                        outline: "1px solid color-mix(in srgb,var(--gr-violet) 40%,transparent)",
                      }}
                    >
                      ავტორი
                    </span>
                  )}
                </div>

                {/* separator */}
                <div className="h-px bg-[var(--gr-border)]" />

                {/* body */}
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-[var(--gr-text)] prose-pre:bg-[var(--gr-bg-2)] prose-pre:border prose-pre:border-[var(--gr-border)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.body}</ReactMarkdown>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(p.id)}
                    disabled={!currentUser || likeLoading === p.id}
                    className={`flex h-7 items-center gap-1.5 px-2.5 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                      p.hasLiked ? "text-[var(--gr-violet-hi)]" : "text-[var(--gr-text-dim)] hover:text-[var(--gr-violet-hi)]"
                    }`}
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${p.hasLiked ? "fill-[var(--gr-violet-hi)]" : ""}`} />
                    {p.likes}
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (!currentUser) return; setText((prev) => `@${p.author} ` + prev); }}
                    disabled={!currentUser}
                    className="flex h-7 items-center gap-1 px-2.5 text-[11px] font-semibold text-[var(--gr-text-dim)] hover:text-[var(--gr-text)] transition-colors disabled:opacity-40"
                  >
                    <CornerDownRight className="h-3 w-3" /> პასუხი
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* reply box */}
      {!currentUser ? (
        <div
          className="mt-6"
          style={{ clipPath: CUT, background: "rgba(167,139,250,0.40)", padding: 1 }}
        >
          <div
            className="p-5 text-center bg-[var(--gr-bg-1)]"
            style={{ clipPath: CUT }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-0 h-[2px] w-full"
              style={{ background: "linear-gradient(90deg,transparent,rgba(167,139,250,0.7),transparent)" }}
            />
            <p className="text-sm text-[var(--gr-text-mute)]">
              დისკუსიაში მონაწილეობის მისაღებად{" "}
              <Link href="/auth/login" className="text-[var(--gr-violet-hi)] hover:underline">
                შედით სისტემაში
              </Link>
              .
            </p>
          </div>
        </div>
      ) : (
        <div
          className="mt-6 relative"
          style={{ clipPath: CUT, background: "rgba(236,72,153,0.5)", padding: 1 }}
        >
          <div
            className="relative overflow-hidden bg-[var(--gr-bg-1)]"
            style={{ clipPath: CUT }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-0 z-10 h-[2px] w-full"
              style={{ background: "linear-gradient(90deg,transparent,rgba(236,72,153,0.8),transparent)" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(236,72,153,0.08) 0%,transparent 65%)" }}
            />
            <div className="relative z-[2] space-y-3 p-5">
              <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-[var(--gr-text)]">
                პასუხის დაწერა
              </h3>
              <Textarea
                placeholder="დაწერე შენი პასუხი... (Markdown მხარდაჭერით)"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
                className="font-mono text-sm bg-[var(--gr-bg-2)] border-[var(--gr-border)] focus:border-[var(--gr-violet-hi)]"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--gr-text-dim)]">
                  მხარდაჭერილია Markdown (**სქელი**, *დახრილი*, `კოდი`)
                </span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!text.trim() || loading}
                  className="h-8 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-black transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                  style={{
                    clipPath: CUT_SM,
                    background: "linear-gradient(180deg,#f5c842 0%,#e6a800 55%,#c87f00 100%)",
                  }}
                >
                  {loading ? "ქვეყნდება..." : "გამოქვეყნება"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

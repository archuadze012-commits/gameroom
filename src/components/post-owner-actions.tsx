"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  canEdit?: boolean;
  canDelete?: boolean;
  editHref?: string;
  deleteRedirectTo?: string;
  onDeleted?: () => void;
  className?: string;
};

export function PostOwnerActions({
  postId,
  canEdit = false,
  canDelete = false,
  editHref,
  deleteRedirectTo,
  onDeleted,
  className,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!canEdit && !canDelete) return null;

  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm("ნამდვილად გინდა ამ პოსტის წაშლა?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("პოსტი წაიშალა");
      onDeleted?.();
      if (deleteRedirectTo) {
        router.replace(deleteRedirectTo);
      } else {
        router.refresh();
      }
    } catch {
      toast.error("პოსტის წაშლა ვერ მოხერხდა");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {canEdit && editHref ? (
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="relative z-10 h-8 px-2 text-[var(--gr-text-dim)] hover:bg-[rgba(34,211,238,0.08)] hover:text-[var(--gr-cyan-glow)]"
        >
          <Link
            href={editHref}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            რედაქტირება
          </Link>
        </Button>
      ) : null}

      {canDelete ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={deleting}
          onClick={handleDelete}
          className="relative z-10 h-8 px-2 text-red-300 hover:bg-red-500/10 hover:text-red-400"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          წაშლა
        </Button>
      ) : null}
    </div>
  );
}

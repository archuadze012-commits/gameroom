"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  canEdit?: boolean;
  canDelete?: boolean;
  editHref?: string;
  deleteRedirectTo?: string;
  className?: string;
};

export function ArticleOwnerActions({
  slug,
  canEdit = false,
  canDelete = false,
  editHref,
  deleteRedirectTo = "/articles",
  className,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!canEdit && !canDelete) return null;

  async function handleDelete() {
    if (!confirm("ნამდვილად გინდა ამ სტატიის წაშლა?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("სტატია წაიშალა");
      router.replace(deleteRedirectTo);
      router.refresh();
    } catch {
      toast.error("სტატიის წაშლა ვერ მოხერხდა");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {canEdit && editHref ? (
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
          <Link href={editHref}>
            <Pencil className="h-3.5 w-3.5" />
            რედაქტირება
          </Link>
        </Button>
      ) : null}
      {canDelete ? (
        <Button type="button" size="sm" variant="destructive" className="h-8 gap-1.5" disabled={deleting} onClick={handleDelete}>
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          წაშლა
        </Button>
      ) : null}
    </div>
  );
}

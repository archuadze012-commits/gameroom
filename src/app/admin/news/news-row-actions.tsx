"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteNewsAction } from "./actions";

export function NewsRowActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`ნამდვილად წავშალო "${title}"?`)) return;
    startTransition(async () => {
      const res = await deleteNewsAction(id);
      if (res.ok) {
        toast.success("სტატია წაიშალა");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <Button variant="ghost" size="icon" asChild title="რედაქტირება">
        <Link href={`/admin/news/${id}/edit`}>
          <Edit className="h-4 w-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDelete} disabled={pending} title="წაშლა">
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function NewsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

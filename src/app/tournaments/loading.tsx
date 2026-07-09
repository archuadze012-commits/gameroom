import { Skeleton } from "@/components/ui/skeleton";

export default function TournamentsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-56 rounded-lg" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

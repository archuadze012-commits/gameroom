import { Skeleton } from "@/components/ui/skeleton";

// Instant skeleton while the (dynamic) home RSC streams — shown immediately on
// navigation instead of blocking on the server with no UI.
export default function HomeLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

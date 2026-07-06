import { Skeleton } from "@/components/ui/skeleton";

export default function LfgLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-4">
      <Skeleton className="h-10 w-40 rounded-lg" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

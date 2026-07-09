import { Skeleton } from "@/components/ui/skeleton";

export default function FreePcGamesLoading() {
  return (
    <div className="container mx-auto px-4 pt-10 lg:pt-16 space-y-12">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-72 rounded-lg" />
        <Skeleton className="h-11 w-56 rounded-xl" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}

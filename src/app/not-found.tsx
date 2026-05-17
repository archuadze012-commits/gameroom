import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="text-7xl font-bold text-primary">404</div>
      <h1 className="mt-4 text-2xl font-semibold">გვერდი ვერ მოიძებნა</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        მისამართი არასწორია ან გვერდი წაშლილია. ალბათ უკან გადახვალ ან მთავარ გვერდზე.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/">მთავარი</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/lfg">LFG</Link>
        </Button>
      </div>
    </div>
  );
}

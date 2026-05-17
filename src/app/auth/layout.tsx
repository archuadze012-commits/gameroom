import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary neon-border">
              <Gamepad2 className="h-5 w-5" />
            </span>
            Game<span className="text-primary">room</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

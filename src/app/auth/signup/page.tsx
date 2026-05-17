import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "../login/login-form";

export const metadata = { title: "რეგისტრაცია" };

export default function SignupPage() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-2xl">დარეგისტრირდი</CardTitle>
        <p className="text-sm text-muted-foreground">
          შექმენი ანგარიში 30 წამში — magic link ან Google/Discord.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Suspense fallback={<div className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          უკვე გაქვს ანგარიში?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            შესვლა
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

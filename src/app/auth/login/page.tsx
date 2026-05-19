import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";

export const metadata = { title: "შესვლა" };

export default function LoginPage() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-2xl">შესვლა</CardTitle>
        <p className="text-sm text-muted-foreground">
          გამოიყენე Google ანგარიში ან magic link.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          ანგარიში არ გაქვს?{" "}
          <Link href="/auth/signup" className="text-primary hover:underline">
            დარეგისტრირდი
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

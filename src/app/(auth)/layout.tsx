import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-6">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">GiveMetry<span className="text-emerald-600 dark:text-emerald-400">AI</span><sup className="text-[0.6em] font-normal text-slate-400">™</sup></h1>
          <p className="text-sm text-muted-foreground">
            AI-Powered Advancement Intelligence
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

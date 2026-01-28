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
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <BarChart3 className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            </div>
            <h1 className="text-2xl font-bold">GiveMetry<sup className="text-[0.6em] font-normal text-slate-400">™</sup></h1>
            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-sm font-medium text-slate-700 dark:text-slate-300">AI</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-Powered Advancement Intelligence
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

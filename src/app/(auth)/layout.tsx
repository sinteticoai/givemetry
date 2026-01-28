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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <BarChart3 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </div>
            <h1 className="font-[family-name:var(--font-inter)] text-2xl font-bold tracking-tight">GiveMetry</h1>
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

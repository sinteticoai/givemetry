// T255: 404 Not Found page
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        <h1 className="mb-2 text-4xl font-bold">404</h1>
        <h2 className="mb-2 text-xl font-semibold">Page Not Found</h2>
        <p className="mb-6 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard">
            <Button variant="default">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

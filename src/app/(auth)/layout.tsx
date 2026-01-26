export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md p-6">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-primary-foreground">
            G
          </div>
          <h1 className="mt-4 text-2xl font-bold">GiveMetry</h1>
          <p className="text-sm text-muted-foreground">
            AI-Powered Advancement Intelligence
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

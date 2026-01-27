// T031: Admin Layout with Session Check
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { AdminLayoutClient } from "@/components/admin/layout/AdminLayoutClient";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if this is the login page - skip auth check
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") || "";

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Get admin session
  const cookieStore = await cookies();

  try {
    const token = await getToken({
      req: {
        cookies: {
          get: (name: string) => cookieStore.get(name),
        },
        headers: headerStore,
      } as Parameters<typeof getToken>[0]["req"],
      secret: process.env.ADMIN_AUTH_SECRET,
      cookieName: "admin-auth.session-token",
    });

    // No valid session - redirect to login
    if (!token || !token.id) {
      redirect("/admin/login");
    }

    const session = {
      id: token.id as string,
      email: token.email as string,
      name: token.name as string,
      role: token.role as "super_admin" | "support",
    };

    return (
      <AdminLayoutClient session={session}>
        {children}
      </AdminLayoutClient>
    );
  } catch {
    // Session error - redirect to login
    redirect("/admin/login");
  }
}

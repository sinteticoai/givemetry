// T055: New Organization Page
"use client";

import { useRouter } from "next/navigation";
import { OrganizationForm } from "@/components/admin/organizations/OrganizationForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewOrganizationPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/admin/organizations")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Organization</h1>
          <p className="text-muted-foreground">
            Create a new organization on the platform
          </p>
        </div>
      </div>

      {/* Organization form */}
      <OrganizationForm />
    </div>
  );
}

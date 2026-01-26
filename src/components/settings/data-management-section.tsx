"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, AlertTriangle } from "lucide-react";
import { DeleteOrgDialog } from "./delete-org-dialog";

export function DataManagementSection() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const deleteAllDataMutation = trpc.organization.deleteAllData.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (err) => setError(err.message),
  });

  const handleDelete = async () => {
    setError(null);
    await deleteAllDataMutation.mutateAsync({ confirmPhrase: "DELETE ALL DATA" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>Download your organization&apos;s data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export functionality will be available in a future update.
          </p>
          <Button variant="outline" disabled>
            Export All Data (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Delete All Data</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete all constituents, gifts, contacts, and analysis data.
                This action cannot be undone.
              </p>
            </div>
            <DeleteOrgDialog
              onConfirm={handleDelete}
              isPending={deleteAllDataMutation.isPending}
              error={error}
              trigger={
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Data
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

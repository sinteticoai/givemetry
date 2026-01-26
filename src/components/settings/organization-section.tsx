"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function OrganizationSection() {
  const { data: organization } = trpc.organization.get.useQuery();
  const [name, setName] = useState(organization?.name || "");
  const [success, setSuccess] = useState(false);

  const updateSettingsMutation = trpc.organization.updateSettings.useMutation({
    onSuccess: () => setSuccess(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    updateSettingsMutation.mutate({ name });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>Manage your organization details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {success && (
            <Alert>
              <AlertDescription>Organization settings updated.</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={name || organization?.name || ""}
              onChange={(e) => setName(e.target.value)}
              disabled={updateSettingsMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Plan</Label>
            <div>
              <Badge variant="outline" className="capitalize">
                {organization?.plan || "trial"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 pt-4">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{organization?._count?.users || 0}</div>
              <p className="text-xs text-muted-foreground">Team Members</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{organization?._count?.constituents || 0}</div>
              <p className="text-xs text-muted-foreground">Constituents</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{organization?._count?.uploads || 0}</div>
              <p className="text-xs text-muted-foreground">Uploads</p>
            </div>
          </div>

          <Button type="submit" disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle } from "lucide-react";

export function DataManagementSection() {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deleteAllDataMutation = trpc.organization.deleteAllData.useMutation({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      router.push("/dashboard");
    },
    onError: (err) => setError(err.message),
  });

  const handleDelete = () => {
    if (confirmPhrase !== "DELETE ALL DATA") {
      setError("Please type the confirmation phrase exactly");
      return;
    }
    setError(null);
    deleteAllDataMutation.mutate({ confirmPhrase: "DELETE ALL DATA" });
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
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Delete All Organization Data
                  </DialogTitle>
                  <DialogDescription>
                    This will permanently delete:
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>All constituents and their profiles</li>
                    <li>All gift history records</li>
                    <li>All contact and interaction records</li>
                    <li>All AI predictions and analysis</li>
                    <li>All briefs and generated content</li>
                    <li>All uploaded files</li>
                  </ul>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="confirmDelete">
                      Type <strong>DELETE ALL DATA</strong> to confirm
                    </Label>
                    <Input
                      id="confirmDelete"
                      value={confirmPhrase}
                      onChange={(e) => setConfirmPhrase(e.target.value)}
                      placeholder="DELETE ALL DATA"
                      className="font-mono"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteAllDataMutation.isPending || confirmPhrase !== "DELETE ALL DATA"}
                  >
                    {deleteAllDataMutation.isPending ? "Deleting..." : "Delete Everything"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// T168: Generate brief button component
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GenerateBriefButtonProps {
  constituentId: string;
  constituentName: string;
  onGenerated?: (briefId: string) => void;
  variant?: "default" | "outline" | "secondary";
}

export function GenerateBriefButton({
  constituentId,
  constituentName,
  onGenerated,
  variant = "default",
}: GenerateBriefButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const generateMutation = trpc.ai.generateBrief.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Brief generated",
        description: `Brief for ${constituentName} is ready.`,
      });
      setShowDialog(false);
      onGenerated?.(data.id);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error.message,
      });
    },
  });

  const handleGenerate = (useFallback = false) => {
    generateMutation.mutate({
      constituentId,
      useFallback,
    });
  };

  return (
    <>
      <Button variant={variant} onClick={() => setShowDialog(true)}>
        <Sparkles className="mr-2 h-4 w-4" />
        Generate Brief
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Donor Brief
            </DialogTitle>
            <DialogDescription>
              Create an AI-generated brief for {constituentName} to prepare for your meeting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-2">What is included:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Executive summary</li>
                <li>• Giving history analysis</li>
                <li>• Relationship highlights</li>
                <li>• Conversation starters</li>
                <li>• Recommended ask (if applicable)</li>
              </ul>
            </div>

            {!process.env.NEXT_PUBLIC_AI_ENABLED && (
              <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">AI features in demo mode</p>
                  <p className="mt-1">
                    A template brief will be generated. Full AI briefs require API configuration.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleGenerate(false)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Brief
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

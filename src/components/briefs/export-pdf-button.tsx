// T172: PDF export button using @react-pdf/renderer
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dynamic from "next/dynamic";

// Dynamically import PDF components to avoid SSR issues
const BriefPdfDocument = dynamic(
  () => import("./brief-pdf-template").then((mod) => mod.BriefPdfDocument),
  { ssr: false }
);

interface BriefContent {
  summary?: { text: string };
  givingHistory?: { text: string; totalLifetime: number };
  relationshipHighlights?: { text: string };
  conversationStarters?: { items: string[] };
  recommendedAsk?: { amount: number | null; purpose: string; rationale: string };
}

interface Brief {
  id: string;
  content: BriefContent;
  createdAt: string | Date;
  constituent?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

interface ExportPdfButtonProps {
  brief: Brief;
  constituentName: string;
}

export function ExportPdfButton({ brief, constituentName }: ExportPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      // Dynamic import of pdf renderer
      const { pdf } = await import("@react-pdf/renderer");

      const doc = <BriefPdfDocument brief={brief} constituentName={constituentName} />;
      const blob = await pdf(doc).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `donor-brief-${constituentName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF exported",
        description: "The brief has been downloaded.",
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Could not generate PDF. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isGenerating}>
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </>
      )}
    </Button>
  );
}

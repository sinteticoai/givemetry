// T170: Brief section with citations
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

interface Citation {
  text: string;
  source: string;
  sourceId: string;
  date?: string;
}

interface BriefSectionProps {
  content: string;
  citations?: Citation[];
}

export function BriefSection({ content, citations }: BriefSectionProps) {
  const [showCitations, setShowCitations] = useState(false);

  const sourceLabels: Record<string, string> = {
    profile: "Profile",
    gift: "Gift Record",
    contact: "Contact",
    prediction: "AI Score",
  };

  const sourceColors: Record<string, string> = {
    profile: "bg-blue-100 text-blue-800 border-blue-200",
    gift: "bg-green-100 text-green-800 border-green-200",
    contact: "bg-purple-100 text-purple-800 border-purple-200",
    prediction: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const hasCitations = citations && citations.length > 0;

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

      {hasCitations && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCitations(!showCitations)}
          >
            <Info className="mr-1.5 h-3.5 w-3.5" />
            <span className="text-xs">
              {citations.length} source{citations.length !== 1 ? "s" : ""}
            </span>
            {showCitations ? (
              <ChevronUp className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            )}
          </Button>

          {showCitations && (
            <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
              {citations.map((citation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-xs ${sourceColors[citation.source] || ""}`}
                        >
                          {sourceLabels[citation.source] || citation.source}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Source ID: {citation.sourceId}
                          {citation.date && (
                            <>
                              <br />
                              Date: {citation.date}
                            </>
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-xs text-muted-foreground italic">
                    &quot;{citation.text}&quot;
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

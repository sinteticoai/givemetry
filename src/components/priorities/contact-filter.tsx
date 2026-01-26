// T152: Recently contacted filter toggle
"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

interface ContactFilterProps {
  excludeRecentContact: boolean;
  recentContactDays: number;
  onExcludeChange: (value: boolean) => void;
  onDaysChange: (value: number) => void;
}

export function ContactFilter({
  excludeRecentContact,
  recentContactDays,
  onExcludeChange,
  onDaysChange,
}: ContactFilterProps) {
  return (
    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="exclude-recent" className="text-sm font-normal">
          Exclude recently contacted
        </Label>
        <Switch
          id="exclude-recent"
          checked={excludeRecentContact}
          onCheckedChange={onExcludeChange}
        />
      </div>

      {excludeRecentContact && (
        <div className="flex items-center gap-2">
          <Label htmlFor="recent-days" className="text-sm font-normal whitespace-nowrap">
            within
          </Label>
          <Input
            id="recent-days"
            type="number"
            min={1}
            max={90}
            value={recentContactDays}
            onChange={(e) => onDaysChange(parseInt(e.target.value) || 7)}
            className="w-16 h-8 text-sm"
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      )}
    </div>
  );
}

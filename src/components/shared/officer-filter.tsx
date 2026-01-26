// T132: Gift officer filter dropdown
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface OfficerFilterProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function OfficerFilter({ value, onChange }: OfficerFilterProps) {
  const { data: officers, isLoading } = trpc.user.listOfficers.useQuery(
    undefined,
    {
      staleTime: 60000, // Cache for 1 minute
    }
  );

  const selectedOfficer = officers?.find((o) => o.id === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Assigned Officer</label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-48 justify-between" disabled={isLoading}>
            <span className="flex items-center gap-2 truncate">
              <Users className="h-4 w-4" />
              {selectedOfficer?.name || "All Officers"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => onChange(undefined)}>
            All Officers
          </DropdownMenuItem>
          {officers && officers.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {officers.map((officer) => (
                <DropdownMenuItem
                  key={officer.id}
                  onClick={() => onChange(officer.id)}
                >
                  {officer.name || officer.email}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

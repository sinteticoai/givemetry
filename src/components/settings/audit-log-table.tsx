"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";

function formatDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(date);
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month} ${day}, ${year} ${hours}:${minutes}`;
}

function formatActionLabel(action: string): string {
  return action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .join(" - ");
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("delete") || action.includes("remove")) return "destructive";
  if (action.includes("create") || action.includes("add")) return "default";
  if (action.includes("update") || action.includes("change")) return "secondary";
  return "outline";
}

export function AuditLogTable() {
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const { data: actionTypes } = trpc.audit.actionTypes.useQuery();
  const { data, isLoading, isFetching } = trpc.audit.list.useQuery({
    limit: 20,
    cursor,
    action: actionFilter,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate + "T23:59:59") : undefined,
  });

  const handleNextPage = () => {
    if (data?.nextCursor) {
      setCursorStack((prev) => [...prev, cursor || ""]);
      setCursor(data.nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorStack.length > 0) {
      const newStack = [...cursorStack];
      const prevCursor = newStack.pop();
      setCursorStack(newStack);
      setCursor(prevCursor || undefined);
    }
  };

  const clearFilters = () => {
    setActionFilter(undefined);
    setStartDate("");
    setEndDate("");
    setCursor(undefined);
    setCursorStack([]);
  };

  const hasFilters = actionFilter || startDate || endDate;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>
              Track all actions performed within your organization
            </CardDescription>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="actionFilter" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Action Type
            </Label>
            <select
              id="actionFilter"
              value={actionFilter || "all"}
              onChange={(e) => {
                setActionFilter(e.target.value === "all" ? undefined : e.target.value);
                setCursor(undefined);
                setCursorStack([]);
              }}
              className="w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All actions</option>
              {actionTypes?.map((action) => (
                <option key={action} value={action}>
                  {formatActionLabel(action)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCursor(undefined);
                setCursorStack([]);
              }}
              className="w-[160px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCursor(undefined);
                setCursorStack([]);
              }}
              className="w-[160px]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(new Date(log.createdAt))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {formatActionLabel(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <span className="text-sm">
                              {log.user.name || log.user.email}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.resourceType && (
                            <span className="capitalize">
                              {log.resourceType}
                              {log.resourceId && (
                                <span className="text-muted-foreground ml-1">
                                  ({log.resourceId.slice(0, 8)}...)
                                </span>
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {log.details ? JSON.stringify(log.details) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {data?.items.length || 0} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={cursorStack.length === 0 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!data?.nextCursor || isFetching}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

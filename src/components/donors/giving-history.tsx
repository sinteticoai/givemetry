// Giving history timeline component for donor detail page
"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading";
import { DollarSign, Calendar, Tag } from "lucide-react";

interface GivingHistoryProps {
  constituentId: string;
}

export function GivingHistory({ constituentId }: GivingHistoryProps) {
  const { data, isLoading } = trpc.gift.getByConstituent.useQuery({
    constituentId,
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const gifts = data?.gifts || [];
  const stats = data?.stats;

  if (gifts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No giving history</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No gifts have been recorded for this constituent.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Use stats from the API response
  const totalGiving = stats?.totalAmount ? Number(stats.totalAmount) : gifts.reduce((sum, g) => sum + Number(g.amount), 0);
  const largestGift = stats?.largestGift ? Number(stats.largestGift) : Math.max(...gifts.map((g) => Number(g.amount)));
  const averageGift = stats?.averageAmount ? Number(stats.averageAmount) : totalGiving / gifts.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalGiving)}</div>
            <p className="text-xs text-muted-foreground">Total Lifetime</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.count || gifts.length}</div>
            <p className="text-xs text-muted-foreground">Total Gifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(largestGift)}</div>
            <p className="text-xs text-muted-foreground">Largest Gift</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(averageGift)}</div>
            <p className="text-xs text-muted-foreground">Average Gift</p>
          </CardContent>
        </Card>
      </div>

      {/* Gift Timeline */}
      <div className="space-y-4">
        {gifts.map((gift, index) => (
          <Card key={gift.id} className="relative">
            {index < gifts.length - 1 && (
              <div className="absolute left-6 top-14 h-full w-0.5 bg-border" />
            )}
            <CardContent className="flex items-start gap-4 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-green-600">
                    {formatCurrency(Number(gift.amount))}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(gift.giftDate)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {gift.fundName && (
                    <Badge variant="outline">
                      <Tag className="mr-1 h-3 w-3" />
                      {gift.fundName}
                    </Badge>
                  )}
                  {gift.giftType && (
                    <Badge variant="secondary">{gift.giftType}</Badge>
                  )}
                  {gift.campaign && (
                    <Badge variant="outline" className="text-xs">
                      {gift.campaign}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

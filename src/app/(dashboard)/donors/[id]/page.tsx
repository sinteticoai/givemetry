// T167: Donor detail page with brief generation
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading";
import { GenerateBriefButton } from "@/components/briefs/generate-brief-button";
import { BriefDisplay } from "@/components/briefs/brief-display";
import { GivingHistory } from "@/components/donors/giving-history";
import { ContactHistory } from "@/components/donors/contact-history";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  TrendingUp,
} from "lucide-react";

export default function DonorDetailPage() {
  const params = useParams();
  const constituentId = params.id as string;
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);

  const { data: constituent, isLoading: isLoadingConstituent } =
    trpc.constituent.get.useQuery({ id: constituentId });

  const { data: briefs, isLoading: isLoadingBriefs } =
    trpc.ai.listBriefs.useQuery({ constituentId, limit: 5 });

  const { data: selectedBrief } = trpc.ai.getBrief.useQuery(
    { id: selectedBriefId! },
    { enabled: !!selectedBriefId }
  );

  const utils = trpc.useUtils();

  if (isLoadingConstituent) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!constituent) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Constituent not found</p>
      </div>
    );
  }

  const fullName = [constituent.prefix, constituent.firstName, constituent.lastName]
    .filter(Boolean)
    .join(" ");

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const handleBriefGenerated = (briefId: string) => {
    setSelectedBriefId(briefId);
    utils.ai.listBriefs.invalidate({ constituentId });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{fullName || "Unknown"}</h1>
          <p className="text-muted-foreground">
            {constituent.constituentType && (
              <Badge variant="secondary" className="mr-2">
                {constituent.constituentType}
              </Badge>
            )}
            {constituent.classYear && `Class of ${constituent.classYear}`}
            {constituent.schoolCollege && ` • ${constituent.schoolCollege}`}
          </p>
        </div>
        <GenerateBriefButton
          constituentId={constituentId}
          constituentName={fullName || "Unknown"}
          onGenerated={handleBriefGenerated}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile & Stats */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {constituent.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${constituent.email}`} className="text-blue-600 hover:underline">
                    {constituent.email}
                  </a>
                </div>
              )}
              {constituent.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {constituent.phone}
                </div>
              )}
              {constituent.addressLine1 && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p>{constituent.addressLine1}</p>
                    {constituent.addressLine2 && <p>{constituent.addressLine2}</p>}
                    <p>
                      {[constituent.city, constituent.state, constituent.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}
              {!constituent.email && !constituent.phone && !constituent.addressLine1 && (
                <p className="text-sm text-muted-foreground">No contact information on file</p>
              )}
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated Capacity</span>
                <span className="font-medium">
                  {formatCurrency(Number(constituent.estimatedCapacity))}
                </span>
              </div>
              {constituent.portfolioTier && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Portfolio Tier</span>
                  <Badge variant="outline">{constituent.portfolioTier}</Badge>
                </div>
              )}
              {constituent.priorityScore && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Priority Score</span>
                  <span className="font-medium">
                    {(Number(constituent.priorityScore) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              {constituent.lapseRiskScore && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Lapse Risk</span>
                  <span
                    className={`font-medium ${
                      Number(constituent.lapseRiskScore) > 0.7
                        ? "text-red-600"
                        : Number(constituent.lapseRiskScore) > 0.4
                          ? "text-yellow-600"
                          : "text-green-600"
                    }`}
                  >
                    {(Number(constituent.lapseRiskScore) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Briefs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Briefs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBriefs ? (
                <LoadingSpinner />
              ) : briefs?.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No briefs generated yet</p>
              ) : (
                <div className="space-y-2">
                  {briefs?.items.map((brief) => (
                    <Button
                      key={brief.id}
                      variant={selectedBriefId === brief.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedBriefId(brief.id)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {new Date(brief.createdAt).toLocaleDateString()}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="brief" className="w-full">
            <TabsList>
              <TabsTrigger value="brief">Brief</TabsTrigger>
              <TabsTrigger value="giving">Giving History</TabsTrigger>
              <TabsTrigger value="contacts">Contact History</TabsTrigger>
            </TabsList>

            <TabsContent value="brief" className="mt-6">
              {selectedBrief ? (
                <BriefDisplay
                  brief={{
                    id: selectedBrief.id,
                    content: selectedBrief.content as Record<string, unknown>,
                    createdAt: selectedBrief.createdAt,
                    constituent: selectedBrief.constituent,
                    modelUsed: selectedBrief.modelUsed,
                    promptTokens: selectedBrief.promptTokens,
                    completionTokens: selectedBrief.completionTokens,
                  }}
                />
              ) : briefs?.items[0] ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Select a brief</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choose a brief from the list or generate a new one
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => briefs?.items[0] && setSelectedBriefId(briefs.items[0].id)}
                  >
                    View Latest Brief
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No briefs yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Generate a brief to prepare for your meeting
                  </p>
                  <div className="mt-4">
                    <GenerateBriefButton
                      constituentId={constituentId}
                      constituentName={fullName || "Unknown"}
                      onGenerated={handleBriefGenerated}
                      variant="default"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="giving" className="mt-6">
              <GivingHistory constituentId={constituentId} />
            </TabsContent>

            <TabsContent value="contacts" className="mt-6">
              <ContactHistory constituentId={constituentId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

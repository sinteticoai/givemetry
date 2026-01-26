// Contact history timeline component for donor detail page
"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  Users,
  Calendar,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Video,
} from "lucide-react";

interface ContactHistoryProps {
  constituentId: string;
}

interface Contact {
  id: string;
  contactType: string;
  contactDate: Date;
  subject: string | null;
  notes: string | null;
  outcome: string | null;
  nextAction: string | null;
  nextActionDate: Date | null;
}

const CONTACT_TYPE_ICONS: Record<string, React.ReactNode> = {
  meeting: <MapPin className="h-5 w-5" />,
  call: <Phone className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  event: <Users className="h-5 w-5" />,
  letter: <MessageSquare className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
};

const CONTACT_TYPE_COLORS: Record<string, string> = {
  meeting: "bg-blue-100 text-blue-600",
  call: "bg-green-100 text-green-600",
  email: "bg-purple-100 text-purple-600",
  event: "bg-orange-100 text-orange-600",
  letter: "bg-gray-100 text-gray-600",
  video: "bg-pink-100 text-pink-600",
};

const OUTCOME_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
  no_response: "bg-yellow-100 text-yellow-800",
};

export function ContactHistory({ constituentId }: ContactHistoryProps) {
  const { data, isLoading } = trpc.contact.getByConstituent.useQuery({
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

  const contacts = data?.contacts || [];

  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No contact history</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No interactions have been recorded for this constituent.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group contacts by year
  const contactsByYear = contacts.reduce(
    (acc: Record<number, Contact[]>, contact: Contact) => {
      const year = new Date(contact.contactDate).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(contact);
      return acc;
    },
    {} as Record<number, Contact[]>
  );

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{contacts.length} total contacts</span>
        <span>•</span>
        <span>
          Last contact:{" "}
          {contacts[0] && new Date(contacts[0].contactDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Timeline by Year */}
      {Object.entries(contactsByYear)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, yearContacts]) => (
          <div key={year} className="space-y-4">
            <h3 className="text-lg font-semibold sticky top-0 bg-background py-2">
              {year}
            </h3>

            <div className="space-y-4 border-l-2 border-border pl-4">
              {(yearContacts || []).map((contact: Contact) => (
                <div key={contact.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[21px] flex h-8 w-8 items-center justify-center rounded-full ${
                      CONTACT_TYPE_COLORS[contact.contactType] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {CONTACT_TYPE_ICONS[contact.contactType] || (
                      <MessageSquare className="h-5 w-5" />
                    )}
                  </div>

                  <Card className="ml-4">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {contact.contactType}
                            </Badge>
                            {contact.outcome && (
                              <Badge
                                className={
                                  OUTCOME_COLORS[contact.outcome] || "bg-gray-100"
                                }
                              >
                                {contact.outcome.replace("_", " ")}
                              </Badge>
                            )}
                          </div>
                          {contact.subject && (
                            <p className="mt-2 font-medium">{contact.subject}</p>
                          )}
                          {contact.notes && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                              {contact.notes}
                            </p>
                          )}
                          {contact.nextAction && (
                            <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                              <p className="text-xs text-yellow-700 font-medium">
                                Next Action
                              </p>
                              <p className="text-sm text-yellow-800">
                                {contact.nextAction}
                                {contact.nextActionDate && (
                                  <span className="ml-2 text-yellow-600">
                                    (by {formatDate(contact.nextActionDate)})
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                          <Calendar className="h-4 w-4" />
                          {formatDate(contact.contactDate)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

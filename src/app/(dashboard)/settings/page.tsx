// T060: Settings page with tabs for profile, organization, team, data management, and audit
"use client";

import { trpc } from "@/lib/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/profile-section";
import { PasswordSection } from "@/components/settings/password-section";
import { OrganizationSection } from "@/components/settings/organization-section";
import { TeamSection } from "@/components/settings/team-section";
import { DataManagementSection } from "@/components/settings/data-management-section";
import { AuditLogTable } from "@/components/settings/audit-log-table";

export default function SettingsPage() {
  const { data: session } = trpc.auth.getSession.useQuery();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="organization">Organization</TabsTrigger>}
          {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
          {isAdmin && <TabsTrigger value="data">Data</TabsTrigger>}
          {isAdmin && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSection />
          <PasswordSection />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="organization" className="space-y-6">
            <OrganizationSection />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="team" className="space-y-6">
            <TeamSection />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="data" className="space-y-6">
            <DataManagementSection />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="audit" className="space-y-6">
            <AuditLogTable />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

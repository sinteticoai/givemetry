// T054: Organization Form Component for creating new organizations
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { adminTrpc } from "@/lib/trpc/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

// Form validation schema
const createOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug must be 100 characters or less")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only"),
  plan: z.string().optional(),
  initialAdminEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type FormData = z.infer<typeof createOrgSchema>;

interface FormErrors {
  name?: string;
  slug?: string;
  plan?: string;
  initialAdminEmail?: string;
}

const PLAN_OPTIONS = [
  { value: "trial", label: "Trial" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

export function OrganizationForm() {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    plan: "trial",
    initialAdminEmail: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Create mutation
  const createMutation = adminTrpc.organizations.create.useMutation({
    onSuccess: (data) => {
      router.push(`/admin/organizations/${data.id}`);
    },
    onError: (error) => {
      setSubmitError(error.message);
    },
  });

  // Auto-generate slug from name
  const handleNameChange = useCallback((name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      // Auto-generate slug if user hasn't manually edited it
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 100),
    }));
    setErrors((prev) => ({ ...prev, name: undefined, slug: undefined }));
    setSubmitError(null);
  }, []);

  // Handle slug change
  const handleSlugChange = useCallback((slug: string) => {
    setFormData((prev) => ({ ...prev, slug }));
    setErrors((prev) => ({ ...prev, slug: undefined }));
    setSubmitError(null);
  }, []);

  // Handle plan change
  const handlePlanChange = useCallback((plan: string) => {
    setFormData((prev) => ({ ...prev, plan }));
    setErrors((prev) => ({ ...prev, plan: undefined }));
    setSubmitError(null);
  }, []);

  // Handle email change
  const handleEmailChange = useCallback((email: string) => {
    setFormData((prev) => ({ ...prev, initialAdminEmail: email }));
    setErrors((prev) => ({ ...prev, initialAdminEmail: undefined }));
    setSubmitError(null);
  }, []);

  // Validate and submit form
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      // Validate form
      const result = createOrgSchema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: FormErrors = {};
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as keyof FormErrors;
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      // Submit the form
      createMutation.mutate({
        name: formData.name,
        slug: formData.slug,
        plan: formData.plan || undefined,
        initialAdminEmail: formData.initialAdminEmail || undefined,
      });
    },
    [formData, createMutation]
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.push("/admin/organizations");
  }, [router]);

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Create New Organization</CardTitle>
          <CardDescription>
            Create a new organization on the platform. You can optionally invite an
            initial administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Submit error alert */}
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter organization name"
              className={errors.name ? "border-red-500" : ""}
              disabled={createMutation.isPending}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Organization Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              URL Slug <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                givemetry.com/
              </span>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="organization-slug"
                className={errors.slug ? "border-red-500" : ""}
                disabled={createMutation.isPending}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Lowercase letters, numbers, and hyphens only
            </p>
            {errors.slug && (
              <p className="text-sm text-red-500">{errors.slug}</p>
            )}
          </div>

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Select
              value={formData.plan}
              onValueChange={handlePlanChange}
              disabled={createMutation.isPending}
            >
              <SelectTrigger id="plan">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.plan && (
              <p className="text-sm text-red-500">{errors.plan}</p>
            )}
          </div>

          {/* Initial Admin Email */}
          <div className="space-y-2">
            <Label htmlFor="initialAdminEmail">
              Initial Admin Email (Optional)
            </Label>
            <Input
              id="initialAdminEmail"
              type="email"
              value={formData.initialAdminEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="admin@organization.com"
              className={errors.initialAdminEmail ? "border-red-500" : ""}
              disabled={createMutation.isPending}
            />
            <p className="text-sm text-muted-foreground">
              If provided, an invitation email will be sent to this address to
              set up the first admin account
            </p>
            {errors.initialAdminEmail && (
              <p className="text-sm text-red-500">{errors.initialAdminEmail}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Organization
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

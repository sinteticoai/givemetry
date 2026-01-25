/**
 * Report Router Contract
 * GiveMetry MVP (Phase 1)
 *
 * Handles executive report generation and scheduling.
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const reportType = z.enum([
  'executive_summary',
  'portfolio_health',
  'lapse_risk',
  'priorities',
  'custom',
]);

export const reportFormat = z.enum(['pdf', 'html']);

export const reportSchedule = z.enum(['weekly', 'monthly', 'none']);

// ============================================
// Input Schemas
// ============================================

export const generateReportInput = z.object({
  type: reportType,
  format: reportFormat.default('pdf'),
  sections: z.array(z.enum([
    'portfolioHealth',
    'topOpportunities',
    'riskAlerts',
    'keyMetrics',
    'recommendedActions',
    'portfolioBalance',
  ])).optional(), // If not provided, include all sections
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
  customTitle: z.string().max(200).optional(),
  customCommentary: z.string().max(5000).optional(),
  includeLogo: z.boolean().default(true),
});

export const getReportInput = z.object({
  reportId: z.string().uuid(),
});

export const listReportsInput = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
  type: reportType.optional(),
});

export const deleteReportInput = z.object({
  reportId: z.string().uuid(),
});

export const scheduleReportInput = z.object({
  type: reportType,
  schedule: reportSchedule,
  sections: z.array(z.string()).optional(),
  recipients: z.array(z.string().email()).optional(), // Additional recipients
  dayOfWeek: z.number().int().min(0).max(6).optional(), // For weekly (0=Sunday)
  dayOfMonth: z.number().int().min(1).max(28).optional(), // For monthly
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:MM format
});

export const getScheduleInput = z.object({
  // Empty - returns schedule for current org
});

export const cancelScheduleInput = z.object({
  scheduleId: z.string().uuid(),
});

// ============================================
// Output Schemas
// ============================================

export const reportSectionOutput = z.object({
  title: z.string(),
  content: z.unknown(), // Section-specific content
  charts: z.array(z.object({
    type: z.enum(['bar', 'line', 'pie', 'table']),
    data: z.unknown(),
    title: z.string(),
  })).optional(),
});

export const reportOutput = z.object({
  id: z.string().uuid(),
  type: reportType,
  title: z.string(),
  format: reportFormat,
  status: z.enum(['generating', 'completed', 'failed']),
  downloadUrl: z.string().url().nullable(),
  expiresAt: z.string().datetime().nullable(),
  sections: z.array(z.string()),
  generatedAt: z.string().datetime(),
  generatedBy: z.string(),
  fileSize: z.number().int().nullable(),
  pageCount: z.number().int().nullable(),
  metadata: z.object({
    dateRange: z.object({
      start: z.string().datetime().nullable(),
      end: z.string().datetime().nullable(),
    }),
    organizationName: z.string(),
    generationTimeMs: z.number().int().nullable(),
  }),
});

export const reportListOutput = z.object({
  reports: z.array(z.object({
    id: z.string().uuid(),
    type: reportType,
    title: z.string(),
    format: reportFormat,
    status: z.enum(['generating', 'completed', 'failed']),
    generatedAt: z.string().datetime(),
    generatedBy: z.string(),
  })),
  nextCursor: z.string().uuid().nullable(),
  totalCount: z.number().int(),
});

export const scheduleOutput = z.object({
  id: z.string().uuid(),
  type: reportType,
  schedule: reportSchedule,
  sections: z.array(z.string()),
  recipients: z.array(z.string().email()),
  nextRunAt: z.string().datetime(),
  lastRunAt: z.string().datetime().nullable(),
  configuration: z.object({
    dayOfWeek: z.number().int().nullable(),
    dayOfMonth: z.number().int().nullable(),
    time: z.string(),
    timezone: z.string(),
  }),
  active: z.boolean(),
});

export const schedulesListOutput = z.object({
  schedules: z.array(scheduleOutput),
});

export const genericSuccessOutput = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================
// Executive Report Content Schema
// ============================================

export const executiveReportContentSchema = z.object({
  header: z.object({
    title: z.string(),
    subtitle: z.string(),
    organization: z.string(),
    generatedAt: z.string().datetime(),
    dateRange: z.string(),
    logo: z.string().url().nullable(),
  }),

  portfolioHealth: z.object({
    overallScore: z.number(),
    trend: z.enum(['up', 'down', 'stable']),
    scoreBreakdown: z.array(z.object({
      category: z.string(),
      score: z.number(),
      change: z.number(),
    })),
    keyIssues: z.array(z.object({
      issue: z.string(),
      impact: z.string(),
      recommendation: z.string(),
    })),
  }).optional(),

  topOpportunities: z.object({
    summary: z.string(),
    opportunities: z.array(z.object({
      rank: z.number(),
      name: z.string(),
      capacity: z.string(),
      priorityScore: z.number(),
      recommendedAction: z.string(),
      reason: z.string(),
    })),
    totalPipelineValue: z.number(),
  }).optional(),

  riskAlerts: z.object({
    summary: z.string(),
    highRiskCount: z.number(),
    totalAtRiskValue: z.number(),
    topRisks: z.array(z.object({
      name: z.string(),
      riskLevel: z.string(),
      lastGift: z.string(),
      lifetimeValue: z.number(),
      primaryFactor: z.string(),
    })),
  }).optional(),

  keyMetrics: z.object({
    metrics: z.array(z.object({
      name: z.string(),
      value: z.string(),
      change: z.number().nullable(),
      trend: z.enum(['up', 'down', 'stable']),
      benchmark: z.string().nullable(),
    })),
  }).optional(),

  recommendedActions: z.object({
    summary: z.string(),
    actions: z.array(z.object({
      priority: z.number(),
      action: z.string(),
      impact: z.string(),
      owner: z.string().nullable(),
      deadline: z.string().nullable(),
    })),
  }).optional(),

  portfolioBalance: z.object({
    summary: z.string(),
    officerMetrics: z.array(z.object({
      name: z.string(),
      portfolioSize: z.number(),
      totalCapacity: z.string(),
      noContactPercent: z.number(),
      status: z.enum(['healthy', 'overloaded', 'underutilized']),
    })),
    imbalanceAlerts: z.array(z.string()),
  }).optional(),

  footer: z.object({
    disclaimer: z.string(),
    generatedBy: z.string(),
    confidentiality: z.string(),
  }),
});

// ============================================
// Router Definition (tRPC-style)
// ============================================

/**
 * report.generate
 * - Generates executive report
 * - Returns immediately with status; poll for completion
 *
 * Performance: <30 seconds for PDF generation
 * Middleware: Protected (requires auth)
 * Permissions: manager, admin, viewer (read-only view)
 */
export type GenerateReportProcedure = {
  input: z.infer<typeof generateReportInput>;
  output: z.infer<typeof reportOutput>;
};

/**
 * report.get
 * - Returns report details and download URL
 *
 * Middleware: Protected (requires auth)
 */
export type GetReportProcedure = {
  input: z.infer<typeof getReportInput>;
  output: z.infer<typeof reportOutput>;
};

/**
 * report.list
 * - Lists generated reports
 * - Paginated
 *
 * Middleware: Protected (requires auth)
 */
export type ListReportsProcedure = {
  input: z.infer<typeof listReportsInput>;
  output: z.infer<typeof reportListOutput>;
};

/**
 * report.delete
 * - Deletes report and associated file
 *
 * Middleware: Protected (requires auth)
 * Permissions: admin
 */
export type DeleteReportProcedure = {
  input: z.infer<typeof deleteReportInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

/**
 * report.schedule
 * - Creates or updates report schedule
 *
 * Middleware: Protected (requires auth)
 * Permissions: admin, manager
 */
export type ScheduleReportProcedure = {
  input: z.infer<typeof scheduleReportInput>;
  output: z.infer<typeof scheduleOutput>;
};

/**
 * report.getSchedules
 * - Lists active report schedules
 *
 * Middleware: Protected (requires auth)
 */
export type GetSchedulesProcedure = {
  input: z.infer<typeof getScheduleInput>;
  output: z.infer<typeof schedulesListOutput>;
};

/**
 * report.cancelSchedule
 * - Cancels scheduled report
 *
 * Middleware: Protected (requires auth)
 * Permissions: admin, manager
 */
export type CancelScheduleProcedure = {
  input: z.infer<typeof cancelScheduleInput>;
  output: z.infer<typeof genericSuccessOutput>;
};

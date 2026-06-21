import { createServerFn } from "@tanstack/react-start";

import {
  getAnalyticsDashboardData,
  getEvaluationRunDetail,
  type AnalyticsDashboardFilters,
} from "./member4.server";

export const getAnalyticsDashboard = createServerFn({ method: "GET" })
  .validator((input: AnalyticsDashboardFilters | undefined) => input)
  .handler(async ({ data }) => {
    return getAnalyticsDashboardData(data);
  });

export const getAnalyticsRunDetail = createServerFn({ method: "GET" })
  .validator((input: { runId: string } | undefined) => input)
  .handler(async ({ data }) => {
    if (!data?.runId) return null;
    return getEvaluationRunDetail(data.runId);
  });

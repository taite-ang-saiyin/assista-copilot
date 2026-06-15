import { createServerFn } from "@tanstack/react-start";

import { getAnalyticsDashboardData } from "./member4.server";

export const getAnalyticsDashboard = createServerFn({ method: "GET" })
  .validator((input: { module?: string } | undefined) => input)
  .handler(async ({ data }) => {
    return getAnalyticsDashboardData(data?.module ?? "generation");
  });

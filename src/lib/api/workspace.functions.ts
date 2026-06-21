import { createServerFn } from "@tanstack/react-start";

import { getWorkspaceHealthSummary } from "./workspace.server";

export const getWorkspaceHealth = createServerFn({ method: "GET" })
  .validator((input: undefined) => input)
  .handler(async () => {
    return getWorkspaceHealthSummary();
  });

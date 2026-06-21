import { getServerConfig } from "../config.server";

export type WorkspaceServiceHealth = {
  key: "member1" | "member2" | "member3" | "member4";
  label: string;
  status: "healthy" | "degraded" | "unconfigured";
  detail: string;
  responseTimeMs: number | null;
};

export type WorkspaceHealthSummary = {
  overallStatus: "healthy" | "degraded" | "unconfigured";
  healthyCount: number;
  totalCount: number;
  averageResponseTimeMs: number | null;
  services: WorkspaceServiceHealth[];
  generatedAt: string;
};

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildUrl(baseUrl: string, path: string) {
  return `${trimTrailingSlash(baseUrl)}${path}`;
}

async function timedFetch(
  url: string,
  init: RequestInit,
  timeoutMs = 10_000,
): Promise<{ response: Response; responseTimeMs: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    return {
      response,
      responseTimeMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonIfPossible(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return null;

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function checkMember1(baseUrl: string | undefined): Promise<WorkspaceServiceHealth> {
  if (!baseUrl) {
    return {
      key: "member1",
      label: "Classifier",
      status: "unconfigured",
      detail: "MEMBER1_API_BASE_URL is not configured.",
      responseTimeMs: null,
    };
  }

  try {
    const { response, responseTimeMs } = await timedFetch(buildUrl(baseUrl, "/health"), {
      headers: { Accept: "application/json" },
    });
    const payload = await readJsonIfPossible(response);
    const status = String(payload?.status ?? "");
    const healthy = response.ok && (status === "healthy" || status === "ok");

    return {
      key: "member1",
      label: "Classifier",
      status: healthy ? "healthy" : "degraded",
      detail: healthy
        ? "Health check passed."
        : `Unexpected response: ${status || response.status}.`,
      responseTimeMs,
    };
  } catch (error) {
    return {
      key: "member1",
      label: "Classifier",
      status: "degraded",
      detail: error instanceof Error ? error.message : "Health check failed.",
      responseTimeMs: null,
    };
  }
}

async function checkMember2(
  baseUrl: string | undefined,
  apiKey: string | undefined,
): Promise<WorkspaceServiceHealth> {
  if (!baseUrl || !apiKey) {
    return {
      key: "member2",
      label: "Retrieval",
      status: "unconfigured",
      detail: "MEMBER2_API_BASE_URL or MEMBER2_API_KEY is not configured.",
      responseTimeMs: null,
    };
  }

  try {
    const { response, responseTimeMs } = await timedFetch(
      buildUrl(baseUrl, "/knowledge/docs?limit=1&offset=0"),
      {
        headers: {
          Accept: "application/json",
          "X-API-Key": apiKey,
        },
      },
    );

    return {
      key: "member2",
      label: "Retrieval",
      status: response.ok ? "healthy" : "degraded",
      detail: response.ok
        ? "Knowledge index API reachable."
        : `Request failed with ${response.status}.`,
      responseTimeMs,
    };
  } catch (error) {
    return {
      key: "member2",
      label: "Retrieval",
      status: "degraded",
      detail: error instanceof Error ? error.message : "Reachability check failed.",
      responseTimeMs: null,
    };
  }
}

async function checkMember3(baseUrl: string | undefined): Promise<WorkspaceServiceHealth> {
  if (!baseUrl) {
    return {
      key: "member3",
      label: "Generation",
      status: "unconfigured",
      detail: "MEMBER3_API_BASE_URL is not configured.",
      responseTimeMs: null,
    };
  }

  try {
    const { response, responseTimeMs } = await timedFetch(buildUrl(baseUrl, "/docs"), {
      headers: { Accept: "text/html" },
    });

    return {
      key: "member3",
      label: "Generation",
      status: response.ok ? "healthy" : "degraded",
      detail: response.ok
        ? "Generation service reachable."
        : `Request failed with ${response.status}.`,
      responseTimeMs,
    };
  } catch (error) {
    return {
      key: "member3",
      label: "Generation",
      status: "degraded",
      detail: error instanceof Error ? error.message : "Reachability check failed.",
      responseTimeMs: null,
    };
  }
}

async function checkMember4(baseUrl: string | undefined): Promise<WorkspaceServiceHealth> {
  if (!baseUrl) {
    return {
      key: "member4",
      label: "Monitoring",
      status: "unconfigured",
      detail: "MEMBER4_API_BASE_URL is not configured.",
      responseTimeMs: null,
    };
  }

  try {
    const { response, responseTimeMs } = await timedFetch(buildUrl(baseUrl, "/health"), {
      headers: { Accept: "application/json" },
    });
    const payload = await readJsonIfPossible(response);
    const status = String(payload?.status ?? "");
    const healthy = response.ok && (status === "healthy" || status === "ok");

    return {
      key: "member4",
      label: "Monitoring",
      status: healthy ? "healthy" : "degraded",
      detail: healthy
        ? "Health check passed."
        : `Unexpected response: ${status || response.status}.`,
      responseTimeMs,
    };
  } catch (error) {
    return {
      key: "member4",
      label: "Monitoring",
      status: "degraded",
      detail: error instanceof Error ? error.message : "Health check failed.",
      responseTimeMs: null,
    };
  }
}

export async function getWorkspaceHealthSummary(): Promise<WorkspaceHealthSummary> {
  const config = getServerConfig();
  const services = await Promise.all([
    checkMember1(config.member1ApiBaseUrl),
    checkMember2(config.member2ApiBaseUrl, config.member2ApiKey),
    checkMember3(config.member3ApiBaseUrl),
    checkMember4(config.member4ApiBaseUrl),
  ]);

  const healthyCount = services.filter((service) => service.status === "healthy").length;
  const configuredServices = services.filter((service) => service.status !== "unconfigured");
  const totalCount = services.length;
  const latencies = configuredServices
    .map((service) => service.responseTimeMs)
    .filter((value): value is number => value != null);

  const averageResponseTimeMs = latencies.length
    ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
    : null;

  const overallStatus =
    configuredServices.length === 0
      ? "unconfigured"
      : configuredServices.every((service) => service.status === "healthy")
        ? "healthy"
        : "degraded";

  return {
    overallStatus,
    healthyCount,
    totalCount,
    averageResponseTimeMs,
    services,
    generatedAt: new Date().toISOString(),
  };
}

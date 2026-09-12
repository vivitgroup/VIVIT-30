export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, sql } from "@/lib/db";
import { configuredVivitoProviders, vivitoFreeOnlyMode } from "@/lib/vivito/providers";

const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const PROBE_TIMEOUT_MS = 2500;

type DiagnosticStatus = "OK" | "DEGRADED" | "UNAVAILABLE";

type DiagnosticCheck = {
  name: string;
  status: DiagnosticStatus;
  message: string;
};

async function probeDatabase(): Promise<DiagnosticCheck> {
  try {
    await Promise.race([
      db.execute(sql`select 1 as ok`),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("diagnostic_timeout")), PROBE_TIMEOUT_MS),
      ),
    ]);
    return { name: "database", status: "OK", message: "Database probe succeeded" };
  } catch {
    return { name: "database", status: "UNAVAILABLE", message: "Database probe failed" };
  }
}

function configPresence(name: string, required = false): DiagnosticCheck {
  const configured = Boolean(process.env[name]?.trim());
  return {
    name,
    status: configured ? "OK" : required ? "UNAVAILABLE" : "DEGRADED",
    message: configured ? "Configured" : required ? "Required configuration missing" : "Optional configuration missing",
  };
}

function vivitoProviderCheck(): DiagnosticCheck {
  const providers = configuredVivitoProviders();
  const freeOnly = vivitoFreeOnlyMode();
  if (!providers.length) {
    return {
      name: "vivito_ai_providers",
      status: "UNAVAILABLE",
      message: freeOnly
        ? "No free VIVITO AI provider is configured"
        : "No VIVITO AI provider is configured",
    };
  }
  return {
    name: "vivito_ai_providers",
    status: "OK",
    message: `${providers.length} provider(s) configured: ${providers.join(", ")}${freeOnly ? " · free-only mode" : ""}`,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }

  const role = String(session.user.role || "");
  const workspaceId = String(session.user.workspaceId || "");
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace unavailable" }, { status: 403, headers: noStore });
  }

  const checks: DiagnosticCheck[] = [
    await probeDatabase(),
    configPresence("DATABASE_URL", true),
    configPresence("AUTH_SECRET", true),
    vivitoProviderCheck(),
  ];

  const unavailable = checks.filter((check) => check.status === "UNAVAILABLE").length;
  const degraded = checks.filter((check) => check.status === "DEGRADED").length;
  const status: DiagnosticStatus = unavailable > 0 ? "UNAVAILABLE" : degraded > 0 ? "DEGRADED" : "OK";

  return NextResponse.json(
    {
      status,
      workspaceId,
      checkedAt: new Date().toISOString(),
      checks,
      remediation: { enabled: false, requiresConfirmation: true },
    },
    { status: unavailable > 0 ? 503 : 200, headers: noStore },
  );
}

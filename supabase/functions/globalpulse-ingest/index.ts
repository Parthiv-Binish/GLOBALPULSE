import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const githubJwks = createRemoteJWKSet(
  new URL("https://token.actions.githubusercontent.com/.well-known/jwks"),
);

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function normalize(doc: any) {
  const state = doc?.status?.indicator ?? "unknown";
  const incidents = (doc?.incidents ?? []).map((item: any) => {
    const raw = item.status ?? "investigating";
    const status = ["investigating", "identified", "monitoring", "resolved"].includes(raw)
      ? raw
      : raw === "postmortem" ? "resolved" : "investigating";
    return {
      source_event_id: item.id,
      title: item.name ?? "Provider incident",
      status,
      impact: item.impact ?? "unknown",
      shortlink: item.shortlink ?? null,
      source_url: item.shortlink ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  });
  return { state, incidents };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return response({ error: "Missing GitHub Actions identity token" }, 401);

  try {
    const { payload } = await jwtVerify(token, githubJwks, {
      issuer: "https://token.actions.githubusercontent.com",
      audience: "globalpulse-ingest",
    });
    const expectedWorkflow = "Parthiv-Binish/GLOBALPULSE/.github/workflows/ingestion.yml@refs/heads/main";
    if (
      payload.repository !== "Parthiv-Binish/GLOBALPULSE" ||
      payload.ref !== "refs/heads/main" ||
      payload.workflow_ref !== expectedWorkflow
    ) {
      return response({ error: "Caller is not the approved GLOBALPULSE workflow" }, 403);
    }
  } catch {
    return response({ error: "GitHub Actions identity verification failed" }, 401);
  }

  const startedAt = new Date().toISOString();
  let checked = 0;
  let failed = 0;
  const failures: string[] = [];

  try {
    const { data: providers, error: providerError } = await supabase
      .from("providers")
      .select("id,name,status_url")
      .eq("enabled", true)
      .eq("integration_type", "statuspage");
    if (providerError) throw providerError;

    for (const provider of providers ?? []) {
      try {
        const source = new URL(provider.status_url);
        const approvedHosts = new Set([
          "www.cloudflarestatus.com",
          "www.githubstatus.com",
          "status.atlassian.com",
          "status.digitalocean.com",
          "status.twilio.com",
          "status.openai.com",
          "discordstatus.com",
          "www.zoomstatus.com",
          "status.mongodb.com",
          "status.supabase.com",
          "www.netlifystatus.com",
          "www.akamaistatus.com",
          "status.npmjs.org",
          "status.newrelic.com",
        ]);
        if (
          source.protocol !== "https:" || !approvedHosts.has(source.hostname) ||
          source.username || source.password || source.port ||
          source.pathname !== "/" || source.search || source.hash
        ) {
          throw new Error("Provider URL is not an approved official HTTPS status source");
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        let document: any;
        try {
          const result = await fetch(source.toString().replace(/\/$/, "") + "/api/v2/summary.json", {
            signal: controller.signal,
            redirect: "error",
            headers: { "accept": "application/json", "user-agent": "GLOBALPULSE/1.0 (+https://github.com/Parthiv-Binish/GLOBALPULSE) status monitor" },
          });
          if (!result.ok) throw new Error("Status source returned HTTP " + result.status);
          document = await result.json();
        } finally {
          clearTimeout(timeout);
        }

        const { state, incidents } = normalize(document);
        const { error: updateError } = await supabase.from("providers")
          .update({ current_status: state, last_checked_at: new Date().toISOString() })
          .eq("id", provider.id);
        if (updateError) throw updateError;

        if (incidents.length) {
          const rows = incidents.map((incident: any) => ({ ...incident, provider_id: provider.id }));
          const { error: incidentError } = await supabase.from("incidents")
            .upsert(rows, { onConflict: "provider_id,source_event_id" });
          if (incidentError) throw incidentError;
        }
        checked++;
      } catch (error) {
        failed++;
        failures.push(provider.id + ": " + String(error).slice(0, 180));
      }
    }

    const completedAt = new Date().toISOString();
    const { error: runError } = await supabase.from("ingestion_runs").insert({
      started_at: startedAt,
      completed_at: completedAt,
      providers_checked: checked,
      status: failed ? "failed" : "completed",
      error_summary: failed ? failures.slice(0, 10).join("; ") : null,
    });
    if (runError) throw runError;

    return response({ ok: failed === 0, providers_checked: checked, providers_failed: failed });
  } catch (error) {
    console.error("GLOBALPULSE ingestion failed", error);
    return response({ error: "Ingestion cycle failed" }, 500);
  }
});

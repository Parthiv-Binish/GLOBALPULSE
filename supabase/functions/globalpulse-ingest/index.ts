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


function xmlText(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
function xmlTag(block: string, name: string) {
  const match = block.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return match ? xmlText(match[1]).trim() : "";
}
function normalizeFeed(xml: string) {
  const entries = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  const incidents = entries.map((item) => {
    const title = xmlTag(item, "title") || "Provider status update";
    const description = xmlTag(item, "description") || xmlTag(item, "summary") || xmlTag(item, "content");
    const body = (title + " " + description).toLowerCase();
    const id = xmlTag(item, "guid") || xmlTag(item, "id");
    const href = item.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1];
    const link = href || xmlTag(item, "link") || null;
    const dateValue = xmlTag(item, "pubDate") || xmlTag(item, "updated") ||
      xmlTag(item, "published") || new Date().toISOString();
    const parsedDate = new Date(dateValue);
    const timestamp = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    const status = /resolved|closed|restored|completed/.test(body) ? "resolved"
      : /monitoring|mitigat/.test(body) ? "monitoring"
      : /identified/.test(body) ? "identified" : "investigating";
    const impact = /critical/.test(body) ? "critical" : /major|severe/.test(body) ? "major"
      : /minor|degraded/.test(body) ? "minor" : "unknown";
    return {
      source_event_id: id || String(link || title + timestamp),
      title: title.slice(0, 500),
      status,
      impact,
      shortlink: link,
      source_url: link,
      created_at: timestamp,
      updated_at: timestamp,
    };
  });
  return { state: "unknown", incidents };
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
      .select("id,name,status_url,integration_type")
      .eq("enabled", true)
      .in("integration_type", ["statuspage", "rss"]);
    if (providerError) throw providerError;

    for (const provider of providers ?? []) {
      try {
        const source = new URL(provider.status_url);
        const statuspageHosts = new Set([
          "www.cloudflarestatus.com","www.githubstatus.com","status.atlassian.com",
          "status.digitalocean.com","status.twilio.com","status.openai.com",
          "discordstatus.com","www.zoomstatus.com","status.mongodb.com",
          "status.supabase.com","www.netlifystatus.com","www.akamaistatus.com",
          "status.npmjs.org","status.newrelic.com",
        ]);
        const rssFeeds = new Set([
          "https://status.aws.amazon.com/rss/all.rss",
          "https://status.cloud.google.com/en/feed.atom",
          "https://azure.status.microsoft/status/feed/",
          "https://cloud.ibm.com/status/api/notifications/feed.rss",
          "https://ocistatus.oraclecloud.com/api/v2/incident-summary.rss",
        ]);
        const validSource = provider.integration_type === "statuspage"
          ? statuspageHosts.has(source.hostname) && source.pathname === "/" && !source.search && !source.hash
          : provider.integration_type === "rss"
            ? rssFeeds.has(source.toString())
            : false;
        if (source.protocol !== "https:" || source.username || source.password || source.port || !validSource) {
          throw new Error("Provider URL is not an approved official status source");
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        let document: any;
        try {
          const endpoint = provider.integration_type === "rss"
            ? source.toString()
            : source.toString().replace(/\/$/, "") + "/api/v2/summary.json";
          const result = await fetch(endpoint, {
            signal: controller.signal,
            redirect: "error",
            headers: { "accept": provider.integration_type === "rss" ? "application/rss+xml, application/atom+xml, application/xml, text/xml" : "application/json", "user-agent": "GLOBALPULSE/1.0 (+https://github.com/Parthiv-Binish/GLOBALPULSE) status monitor" },
          });
          if (!result.ok) throw new Error("Status source returned HTTP " + result.status);
          document = provider.integration_type === "rss" ? await result.text() : await result.json();
        } finally {
          clearTimeout(timeout);
        }

        const { state, incidents } = provider.integration_type === "rss" ? normalizeFeed(document) : normalize(document);
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

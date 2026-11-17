import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "Access-Control-Allow-Origin": "https://globalpulse-parthivs-projects-0af44f70.vercel.app",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: cors });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: cors });

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    console.error("Account deletion failed", deleteError.message);
    return new Response(JSON.stringify({ error: "Account deletion could not be completed" }), { status: 500, headers: cors });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
});

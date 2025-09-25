import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "jsr:@std/http@0.224.0/server"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers })
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers })
  }

  try {
    // Supabase provides SUPABASE_URL automatically in Edge Functions
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SERVICE_ROLE  = Deno.env.get("SERVICE_ROLE_KEY")!           // set as a secret
    const REDIRECT_TO   = Deno.env.get("INVITE_REDIRECT_TO") ?? null  // optional

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers })
    }

    // Verify caller is an ADMIN
    const authHeader = req.headers.get("Authorization") ?? ""
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers })

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: me } = await admin.auth.getUser(jwt)
    const callerId = me?.user?.id
    if (!callerId) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers })

    const { data: prof } = await admin.from("profiles").select("role").eq("id", callerId).maybeSingle()
    if (!prof || prof.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden (admin only)" }), { status: 403, headers })
    }

    // Parse input
    const { email, fullName, role } = await req.json()
    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers })
    }

    // Send invite email (creates user if not existing)
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: REDIRECT_TO || undefined, // else uses Auth → Site URL
    })
    if (invErr) throw invErr

    // Upsert role in profiles
    const newId = invited.user?.id
    if (newId) {
      await admin.from("profiles").upsert({
        id: newId,
        full_name: fullName,
        role: (role as "viewer" | "editor" | "admin") ?? "viewer",
      })
    }

    return new Response(JSON.stringify({ ok: true, user_id: newId }), { headers })
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Invite failed" }), { status: 400, headers })
  }
})

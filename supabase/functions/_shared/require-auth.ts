// Shared authentication helper for RealHunt edge functions.
// Validates the caller's JWT server-side and (optionally) their admin role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthedUser {
  id: string;
  email: string | null;
}

export interface AuthFailure {
  status: number;
  error: string;
}

export async function authenticate(
  req: Request,
): Promise<{ user: AuthedUser } | { failure: AuthFailure }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { failure: { status: 401, error: "Not authenticated" } };

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { failure: { status: 401, error: "Invalid session" } };

  return { user: { id: user.id, email: user.email ?? null } };
}

export async function requireAdmin(
  req: Request,
): Promise<{ user: AuthedUser } | { failure: AuthFailure }> {
  const result = await authenticate(req);
  if ("failure" in result) return result;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: isAdmin, error } = await admin.rpc("is_admin", { _user_id: result.user.id });
  if (error || !isAdmin) return { failure: { status: 403, error: "Admin access required" } };

  return result;
}

export function authErrorResponse(failure: AuthFailure, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: failure.error }), {
    status: failure.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

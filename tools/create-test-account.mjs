import { createClient } from "@supabase/supabase-js";

const rawArgs = process.argv.slice(2);
const resetProfile = rawArgs.includes("--reset-profile");
const positional = rawArgs.filter((arg) => arg !== "--reset-profile");
const [emailArg, passwordArg, limitArg = "80000", nameArg = "Leadbase Tester"] = positional;

if (!emailArg || !passwordArg) {
  console.error(`\nUsage:\n  node --env-file=.env.local tools/create-test-account.mjs <email> <password> [tokenLimit] [name] [--reset-profile]\n\nExample:\n  node --env-file=.env.local tools/create-test-account.mjs brother@example.com 'StrongPassword123!' 80000 'Test Account'\n`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.");
}

const tokenLimit = Number(limitArg);
if (!Number.isFinite(tokenLimit) || tokenLimit < 0) {
  throw new Error("Token limit must be a positive number or 0.");
}

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function findUserByEmail(email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 1000) return null;
    page += 1;
  }
  return null;
}

let user = await findUserByEmail(emailArg);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailArg,
    password: passwordArg,
    email_confirm: true,
    user_metadata: {
      full_name: nameArg,
      name: nameArg,
      leadbase_profile: {},
      leadbase_profile_completed: false,
    },
  });
  if (error || !data.user) throw error ?? new Error("Could not create test user.");
  user = data.user;
  console.log(`Created auth user ${user.id}.`);
} else {
  const update = {
    password: passwordArg,
    email_confirm: true,
  };

  if (resetProfile) {
    update.user_metadata = {
      ...(user.user_metadata ?? {}),
      full_name: nameArg,
      name: nameArg,
      leadbase_profile: {},
      leadbase_profile_completed: false,
    };
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, update);
  if (error) throw error;
  console.log(`Auth user already existed; password was updated for ${user.id}.`);
  if (resetProfile) console.log("Profile setup was reset; the user must enter their own Leadbase profile data.");
}

const { error: planError } = await admin
  .from("ai_usage_accounts")
  .upsert(
    {
      user_id: user.id,
      plan_id: "test-80k",
      monthly_token_limit: Math.round(tokenLimit),
      purchased_token_balance: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
if (planError) throw planError;

const { count: leadCount, error: leadError } = await admin
  .from("leads")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id);
if (leadError) throw leadError;

console.log("\nLeadbase test account ready:");
console.log(`  Email:       ${emailArg}`);
console.log(`  Token limit: ${Math.round(tokenLimit).toLocaleString("en-US")} / month`);
console.log(`  Leads:       ${leadCount ?? 0}`);
console.log(`  User ID:     ${user.id}`);
console.log("\nThe password is the value you supplied to this command.\n");

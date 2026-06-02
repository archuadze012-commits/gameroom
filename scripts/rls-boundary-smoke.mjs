import crypto from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error("Missing Supabase env for smoke test.");
  process.exit(1);
}

const service = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = `Smoke!${Date.now()}Aa1`;
const createdUserIds = [];
const results = [];

function record(ok, label, extra = "") {
  results.push({ ok, label, extra });
  const prefix = ok ? "PASS" : "FAIL";
  console.log(`${prefix} ${label}${extra ? ` :: ${extra}` : ""}`);
}

function makeAnonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createUser(label) {
  const email = `codex-rls-${label}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}@example.com`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`createUser(${label}) failed: ${error?.message ?? "unknown"}`);
  }

  createdUserIds.push(data.user.id);
  return { id: data.user.id, email };
}

async function signIn(email) {
  const client = makeAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`signIn failed for ${email}: ${error?.message ?? "unknown"}`);
  }
  return client;
}

async function waitForProfiles(userIds) {
  for (let i = 0; i < 20; i += 1) {
    const { data, error } = await service
      .from("profiles")
      .select("id")
      .in("id", userIds);

    if (!error && (data?.length ?? 0) === userIds.length) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error("profiles were not provisioned in time");
}

async function cleanupUsers() {
  for (const userId of createdUserIds.reverse()) {
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`cleanup failed for ${userId}: ${error.message}`);
    }
  }
}

async function run() {
  const userA = await createUser("a");
  const userB = await createUser("b");
  const userC = await createUser("c");

  await waitForProfiles([userA.id, userB.id, userC.id]);

  const clientA = await signIn(userA.email);

  const { data: shopItem, error: shopItemError } = await service
    .from("shop_items")
    .select("id, category")
    .in("category", ["character", "vehicle"])
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (shopItemError || !shopItem) {
    throw new Error(`shop item lookup failed: ${shopItemError?.message ?? "not_found"}`);
  }

  const convAB = crypto.randomUUID();
  const convBC = crypto.randomUUID();
  const notifA = crypto.randomUUID();
  const notifB = crypto.randomUUID();
  const linkedA = crypto.randomUUID();
  const linkedB = crypto.randomUUID();
  const dmAB = crypto.randomUUID();
  const dmBC = crypto.randomUUID();

  const independentSeedOps = await Promise.all([
    service.from("wallets").upsert({ user_id: userA.id, nc_balance: 111, pro_balance: 5 }),
    service.from("wallets").upsert({ user_id: userB.id, nc_balance: 222, pro_balance: 6 }),
    service.from("wallet_transactions").insert({
      user_id: userA.id,
      currency: "nc",
      amount: 11,
      type: "admin_grant",
      note: "codex smoke",
    }),
    service.from("wallet_transactions").insert({
      user_id: userB.id,
      currency: "nc",
      amount: 22,
      type: "admin_grant",
      note: "codex smoke",
    }),
    service.from("linked_accounts").insert({
      id: linkedA,
      user_id: userA.id,
      provider: `codex_${crypto.randomBytes(2).toString("hex")}`,
      external_id: `ext_a_${crypto.randomBytes(4).toString("hex")}`,
      external_name: "A",
      metadata: { smoke: true },
    }),
    service.from("linked_accounts").insert({
      id: linkedB,
      user_id: userB.id,
      provider: `codex_${crypto.randomBytes(2).toString("hex")}`,
      external_id: `ext_b_${crypto.randomBytes(4).toString("hex")}`,
      external_name: "B",
      metadata: { smoke: true },
    }),
    service.from("notifications").insert({
      id: notifA,
      user_id: userA.id,
      type: "system",
      title: "A",
      body: "notif a",
      link: "/messages",
    }),
    service.from("notifications").insert({
      id: notifB,
      user_id: userB.id,
      type: "system",
      title: "B",
      body: "notif b",
      link: "/messages",
    }),
    service.from("user_lobby_loadouts").upsert({
      user_id: userA.id,
      game_slug: "pubg-mobile",
      loadout: { character: "leo" },
    }),
    service.from("user_lobby_loadouts").upsert({
      user_id: userB.id,
      game_slug: "pubg-mobile",
      loadout: { character: "leo" },
    }),
    service.from("user_purchases").upsert({ user_id: userA.id, item_id: shopItem.id }, { onConflict: "user_id,item_id" }),
    service.from("user_purchases").upsert({ user_id: userB.id, item_id: shopItem.id }, { onConflict: "user_id,item_id" }),
    service.from("user_equipped").upsert({ user_id: userA.id, category: shopItem.category, item_id: shopItem.id }),
    service.from("user_equipped").upsert({ user_id: userB.id, category: shopItem.category, item_id: shopItem.id }),
  ]);

  const independentSeedError = independentSeedOps.find((op) => op.error);
  if (independentSeedError?.error) {
    throw new Error(`seed failed: ${independentSeedError.error.message}`);
  }

  const conversationSeedOps = await Promise.all([
    service.from("conversations").insert({ id: convAB, user_a: userA.id, user_b: userB.id }),
    service.from("conversations").insert({ id: convBC, user_a: userB.id, user_b: userC.id }),
  ]);

  const conversationSeedError = conversationSeedOps.find((op) => op.error);
  if (conversationSeedError?.error) {
    throw new Error(`conversation seed failed: ${conversationSeedError.error.message}`);
  }

  const messageSeedOps = await Promise.all([
    service.from("conversation_messages").insert({
      id: dmAB,
      conversation_id: convAB,
      sender_id: userB.id,
      body: "seed ab",
    }),
    service.from("conversation_messages").insert({
      id: dmBC,
      conversation_id: convBC,
      sender_id: userB.id,
      body: "seed bc",
    }),
  ]);

  const messageSeedError = messageSeedOps.find((op) => op.error);
  if (messageSeedError?.error) {
    throw new Error(`message seed failed: ${messageSeedError.error.message}`);
  }

  const ownWallet = await clientA.from("wallets").select("user_id,nc_balance").eq("user_id", userA.id);
  record((ownWallet.data?.length ?? 0) === 1, "wallets own row visible");

  const otherWallet = await clientA.from("wallets").select("user_id,nc_balance").eq("user_id", userB.id);
  record((otherWallet.data?.length ?? 0) === 0, "wallets other row hidden");

  const ownPurchases = await clientA.from("user_purchases").select("user_id,item_id").eq("user_id", userA.id);
  record((ownPurchases.data?.length ?? 0) >= 1, "user_purchases own rows visible");

  const otherPurchases = await clientA.from("user_purchases").select("user_id,item_id").eq("user_id", userB.id);
  record((otherPurchases.data?.length ?? 0) === 0, "user_purchases other rows hidden");

  const ownLoadout = await clientA.from("user_lobby_loadouts").select("user_id,game_slug").eq("user_id", userA.id);
  record((ownLoadout.data?.length ?? 0) === 1, "user_lobby_loadouts own row visible");

  const otherLoadout = await clientA.from("user_lobby_loadouts").select("user_id,game_slug").eq("user_id", userB.id);
  record((otherLoadout.data?.length ?? 0) === 0, "user_lobby_loadouts other row hidden");

  const ownLinked = await clientA.from("linked_accounts").select("user_id,provider").eq("user_id", userA.id);
  record((ownLinked.data?.length ?? 0) === 1, "linked_accounts own row visible");

  const otherLinked = await clientA.from("linked_accounts").select("user_id,provider").eq("user_id", userB.id);
  record((otherLinked.data?.length ?? 0) === 0, "linked_accounts other row hidden");

  const badLinkedInsert = await clientA.from("linked_accounts").insert({
    user_id: userB.id,
    provider: `codex_${crypto.randomBytes(2).toString("hex")}`,
    external_id: `forbidden_${crypto.randomBytes(4).toString("hex")}`,
  });
  record(Boolean(badLinkedInsert.error), "linked_accounts cross-user insert blocked", badLinkedInsert.error?.code ?? "");

  const ownNotifications = await clientA.from("notifications").select("id,user_id").eq("user_id", userA.id);
  record((ownNotifications.data?.length ?? 0) === 1, "notifications own row visible");

  const otherNotifications = await clientA.from("notifications").select("id,user_id").eq("user_id", userB.id);
  record((otherNotifications.data?.length ?? 0) === 0, "notifications other row hidden");

  const badNotifInsert = await clientA.from("notifications").insert({
    user_id: userA.id,
    type: "system",
    title: "forbidden",
    body: "forbidden",
  });
  record(Boolean(badNotifInsert.error), "notifications client insert blocked", badNotifInsert.error?.code ?? "");

  const convAllowed = await clientA.from("conversations").select("id").eq("id", convAB);
  record((convAllowed.data?.length ?? 0) === 1, "conversations participant select allowed");

  const convDenied = await clientA.from("conversations").select("id").eq("id", convBC);
  record((convDenied.data?.length ?? 0) === 0, "conversations non-participant hidden");

  const msgAllowed = await clientA.from("conversation_messages").select("id").eq("conversation_id", convAB);
  record((msgAllowed.data?.length ?? 0) >= 1, "conversation_messages participant select allowed");

  const msgDenied = await clientA.from("conversation_messages").select("id").eq("conversation_id", convBC);
  record((msgDenied.data?.length ?? 0) === 0, "conversation_messages non-participant hidden");

  const goodMsgInsert = await clientA.from("conversation_messages").insert({
    conversation_id: convAB,
    sender_id: userA.id,
    body: "allowed",
  });
  record(!goodMsgInsert.error, "conversation_messages participant insert allowed", goodMsgInsert.error?.message ?? "");

  const badMsgInsert = await clientA.from("conversation_messages").insert({
    conversation_id: convBC,
    sender_id: userA.id,
    body: "forbidden",
  });
  record(Boolean(badMsgInsert.error), "conversation_messages non-participant insert blocked", badMsgInsert.error?.code ?? "");

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    throw new Error(`${failures.length} smoke assertions failed`);
  }
}

try {
  await run();
  console.log("RLS_BOUNDARY_SMOKE_OK");
} catch (error) {
  console.error("RLS_BOUNDARY_SMOKE_FAILED");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await cleanupUsers();
}

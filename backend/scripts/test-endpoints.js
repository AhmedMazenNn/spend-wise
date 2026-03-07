#!/usr/bin/env node
/**
 * Run with: node scripts/test-endpoints.js
 * Requires: server running (npm start) and MongoDB available.
 */
const BASE = process.env.API_BASE || "http://localhost:5000";

async function request(method, path, body = null, token = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function run() {
  console.log("Testing API at", BASE);
  let accessToken;
  let refreshToken;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPass = "TestPass1!";

  const rHealth = await request("GET", "/health");
  assert(rHealth.status === 200 && rHealth.data?.ok, "GET /health");
  console.log("  GET /health -> 200");

  const rSignup = await request("POST", "/api/auth/signup", {
    name: "Test User",
    email: testEmail,
    password: testPass,
    confirmPassword: testPass,
    phone: "+201234567890",
  });
  if (rSignup.status !== 201) console.log("Signup failed:", rSignup.data);
  assert(rSignup.status === 201 && rSignup.data?.accessToken, "POST /api/auth/signup");
  accessToken = rSignup.data.accessToken;
  refreshToken = rSignup.data.refreshToken;
  console.log("  POST /api/auth/signup -> 201");

  const rProfile = await request("GET", "/api/auth/profile", null, accessToken);
  assert(rProfile.status === 200 && rProfile.data?.user?.email === testEmail, "GET /api/auth/profile");
  console.log("  GET /api/auth/profile -> 200");

  const rUsers = await request("GET", "/api/users", null, accessToken);
  assert(rUsers.status === 403, "GET /api/users (non-admin) -> 403");
  console.log("  GET /api/users (non-admin) -> 403");

  const rMePatch = await request(
    "PATCH",
    "/api/users/me",
    { name: "Updated Name" },
    accessToken
  );
  assert(rMePatch.status === 200 && rMePatch.data?.user?.name === "Updated Name", "PATCH /api/users/me");
  console.log("  PATCH /api/users/me -> 200");

  const rForgot = await request("POST", "/api/auth/forgot-password", { email: testEmail });
  assert(rForgot.status === 200 && rForgot.data?.resetToken, "POST /api/auth/forgot-password");
  const resetToken = rForgot.data.resetToken;
  console.log("  POST /api/auth/forgot-password -> 200");

  const newPass = "NewPass1!";
  const rReset = await request("POST", "/api/auth/reset-password", {
    token: resetToken,
    newPassword: newPass,
    confirmPassword: newPass,
  });
  assert(rReset.status === 200, "POST /api/auth/reset-password");
  console.log("  POST /api/auth/reset-password -> 200");

  const rProfileOld = await request("GET", "/api/auth/profile", null, accessToken);
  assert(rProfileOld.status === 401, "GET /api/auth/profile with old token -> 401 (session invalidated)");
  console.log("  GET /api/auth/profile (old token) -> 401");

  const rLoginNew = await request("POST", "/api/auth/login", { email: testEmail, password: newPass });
  assert(rLoginNew.status === 200 && rLoginNew.data?.accessToken, "POST /api/auth/login (new password)");
  accessToken = rLoginNew.data.accessToken;
  console.log("  POST /api/auth/login (new password) -> 200");

  refreshToken = rLoginNew.data.refreshToken;
  if (refreshToken) {
    const rRefresh = await request("POST", "/api/auth/refresh", { refreshToken });
    if (rRefresh.status === 200) {
      accessToken = rRefresh.data.accessToken;
      console.log("  POST /api/auth/refresh -> 200");
    }
  }

  const rLogout = await request("POST", "/api/auth/logout", null, accessToken);
  assert(rLogout.status === 200, "POST /api/auth/logout");
  console.log("  POST /api/auth/logout -> 200");

  const rAfterLogout = await request("GET", "/api/auth/profile", null, accessToken);
  assert(rAfterLogout.status === 401 && (rAfterLogout.data?.message || "").includes("revoked"), "GET /api/auth/profile after logout -> 401");
  console.log("  GET /api/auth/profile (after logout) -> 401");

  const rLoginAgain = await request("POST", "/api/auth/login", { email: testEmail, password: newPass });
  assert(rLoginAgain.status === 200, "POST /api/auth/login again");
  accessToken = rLoginAgain.data.accessToken;
  refreshToken = rLoginAgain.data.refreshToken;
  console.log("  POST /api/auth/login (again) -> 200");

  if (refreshToken) {
    const rRefresh2 = await request("POST", "/api/auth/refresh", { refreshToken });
    assert(rRefresh2.status === 200 && rRefresh2.data?.accessToken, "POST /api/auth/refresh");
    accessToken = rRefresh2.data.accessToken;
    console.log("  POST /api/auth/refresh -> 200");
  }

  const rProfileAgain = await request("GET", "/api/auth/profile", null, accessToken);
  assert(rProfileAgain.status === 200, "GET /api/auth/profile after re-login");
  console.log("  GET /api/auth/profile (re-login) -> 200");

  console.log("\nAll endpoint checks passed.");
}

run().catch((err) => {
  console.error("\nTest failed:", err.message);
  process.exit(1);
});

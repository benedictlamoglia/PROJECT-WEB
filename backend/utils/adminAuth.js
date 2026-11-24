import crypto from "node:crypto";

/*
  ADMIN AUTH GUIDE
  ----------------
  This project uses a simple signed token (HMAC) for admin login to avoid extra
  dependencies. For production, consider stronger auth (hashed credentials in DB,
  httpOnly cookies, rotation, rate limiting, etc.).

  Required environment variables (set in .env locally and Render Environment):
  - ADMIN_USERNAME=your-admin-username
  - ADMIN_PASSWORD=your-admin-password
  - ADMIN_TOKEN_SECRET=a-long-random-secret-string

  The admin dashboard sends:
  Authorization: Bearer <token>
*/

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function getSecret() {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_TOKEN_SECRET is not configured. Set it in .env (local) or Render environment variables."
    );
  }
  return secret;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(data) {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createAdminToken(username) {
  const payload = {
    sub: username,
    role: "admin",
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload?.role !== "admin" || typeof payload?.sub !== "string") return null;
    if (!payload?.exp || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "",
    password: process.env.ADMIN_PASSWORD || "",
  };
}

export function validateAdminLogin(username, password) {
  const { username: expectedUsername, password: expectedPassword } = getAdminCredentials();

  if (!expectedUsername || !expectedPassword) {
    throw new Error(
      "Admin credentials are not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env (local) or Render environment variables."
    );
  }

  return username === expectedUsername && password === expectedPassword;
}

export function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    const payload = verifyAdminToken(token);
    if (!payload) {
      return res.status(401).json({
        status: "Error",
        message: "Admin authentication required.",
      });
    }

    req.admin = payload;
    return next();
  } catch (error) {
    return res.status(500).json({
      status: "Error",
      message: error.message || "Authentication configuration error.",
    });
  }
}

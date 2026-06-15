import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getUsers, saveUsers } from "./data";

const secret = process.env.PULSEPLAY_SECRET || "pulseplay-dev-secret";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(":");
  const currentHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(currentHash, "hex"));
}

function signValue(value) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function createSessionToken(username) {
  const payload = `${username}.${signValue(username)}`;
  return Buffer.from(payload).toString("base64url");
}

function readSessionToken(token) {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [username, signature] = raw.split(".");
    if (!username || signature !== signValue(username)) {
      return null;
    }
    return username;
  } catch (_error) {
    return null;
  }
}

function validateCredentials({ username, password }) {
  if (!username || !password) {
    throw new Error("Username and password are required.");
  }
  if (username.trim().length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
}

export async function createUser({ username, password }) {
  validateCredentials({ username, password });
  const cleanUsername = username.trim();
  const users = await getUsers();

  if (users.some((user) => user.username.toLowerCase() === cleanUsername.toLowerCase())) {
    throw new Error("That username is already taken.");
  }

  const user = {
    username: cleanUsername,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await saveUsers(users);
  return user;
}

export async function authenticateUser({ username, password }) {
  validateCredentials({ username, password });
  const cleanUsername = username.trim();
  const users = await getUsers();
  const user = users.find((entry) => entry.username.toLowerCase() === cleanUsername.toLowerCase());

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid username or password.");
  }

  return user;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("pulseplay_session")?.value;
  if (!token) {
    return null;
  }

  const username = readSessionToken(token);
  if (!username) {
    return null;
  }

  const users = await getUsers();
  const user = users.find((entry) => entry.username === username);
  return user ? { username: user.username, createdAt: user.createdAt } : null;
}

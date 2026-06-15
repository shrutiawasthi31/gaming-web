import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const usersPath = path.join(dataDir, "users.json");
const scoresPath = path.join(dataDir, "scores.json");

async function ensureDataFile(filePath) {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(filePath, "utf8");
  } catch (_error) {
    await writeFile(filePath, "[]", "utf8");
  }
}

async function readCollection(filePath) {
  await ensureDataFile(filePath);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeCollection(filePath, data) {
  await ensureDataFile(filePath);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function getUsers() {
  return readCollection(usersPath);
}

export async function saveUsers(users) {
  return writeCollection(usersPath, users);
}

export async function getTopScores(limit = 10) {
  const scores = await readCollection(scoresPath);
  return scores.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function addScore(entry) {
  if (!Number.isFinite(entry.score) || entry.score < 0) {
    throw new Error("Score must be a non-negative number.");
  }

  const scores = await readCollection(scoresPath);
  const saved = {
    username: entry.username,
    score: Math.floor(entry.score),
    createdAt: new Date().toISOString(),
  };

  scores.push(saved);
  await writeCollection(scoresPath, scores);
  return saved;
}

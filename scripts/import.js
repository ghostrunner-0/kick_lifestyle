// scripts/import-wp-json-dump.js
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import User from "../models/User.model.js"; // ensure this model uses mongoose.model("User", ...)

/* ---------- CONFIG ---------- */
const MONGO_URI =
  "mongodb://admin:StrongPassword123!@192.168.110.102:27017/admin?replicaSet=rs0&authSource=admin&retryWrites=true&w=majority";

// Path to your phpMyAdmin JSON export file
const INPUT_FILE = "./users.json";

/* ---------- ESM __dirname ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- BUILD USERMETA MAP ---------- */

function buildUsermetaMap(usermetaTable) {
  const metaMap = new Map();

  if (!usermetaTable || !Array.isArray(usermetaTable.data)) return metaMap;

  for (const row of usermetaTable.data) {
    const uid = String(row.user_id);
    if (!metaMap.has(uid)) metaMap.set(uid, {});
    metaMap.get(uid)[row.meta_key] = row.meta_value;
  }

  return metaMap;
}

/* ---------- DETECT LEGACY ALGO ---------- */

function detectAlgo(hash) {
  if (!hash) return null;
  if (hash.startsWith("$P$")) return "phpass";
  if (hash.startsWith("$2y$")) return "bcrypt";
  if (hash.startsWith("$argon2")) return "argon2";
  if (/^[a-f0-9]{32}$/i.test(hash)) return "md5"; // classic 32-char hex
  return "phpass";
}

/* ---------- LOAD + TRANSFORM ---------- */

function loadAndTransform(filePath) {
  const absPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, filePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Input file not found: ${absPath}`);
  }

  const raw = fs.readFileSync(absPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse JSON export: ${err.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected JSON format: root is not an array.");
  }

  const usersTable = parsed.find(
    (e) => e.type === "table" && e.name === "evNyg0N_users"
  );

  const usermetaTable = parsed.find(
    (e) => e.type === "table" && e.name === "evNyg0N_usermeta"
  );

  if (!usersTable || !Array.isArray(usersTable.data)) {
    throw new Error("Could not find evNyg0N_users table data in export.");
  }

  const metaMap = buildUsermetaMap(usermetaTable);

  const docs = [];

  for (const row of usersTable.data) {
    const id = String(row.ID);
    const meta = metaMap.get(id) || {};

    const email = row.user_email?.trim();
    if (!email) {
      console.warn(`Skipping user ID ${id} - missing email`);
      continue;
    }

    const firstName = (meta["first_name"] || "").trim();
    const lastName = (meta["last_name"] || "").trim();
    const billingPhone = (meta["billing_phone"] || "").trim();

    const name =
      (firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : row.display_name?.trim() || row.user_login?.trim() || email) ||
      "Unknown";

    const legacyHash = row.user_pass;
    const legacyAlgo = detectAlgo(legacyHash);

    const createdAt = row.user_registered
      ? new Date(row.user_registered.replace(" ", "T") + "Z")
      : new Date();

    const doc = {
      role: "user",
      name,
      email,
      provider: "wordpress",

      legacy: {
        source: "wordpress",
        hash: legacyHash || null,
        algo: legacyAlgo,
      },

      isEmailVerified: true,
      phone: billingPhone || null,

      address: null,
      deletedAt: null,

      pathaoCityId: null,
      pathaoCityLabel: null,
      pathaoZoneId: null,
      pathaoZoneLabel: null,
      pathaoAreaId: null,
      pathaoAreaLabel: null,

      createdAt,
      updatedAt: createdAt,
    };

    docs.push(doc);
  }

  return docs;
}

/* ---------- MAIN ---------- */

async function main() {
  console.log("Reading export & preparing docs...");
  const docs = loadAndTransform(INPUT_FILE);
  console.log(`Prepared ${docs.length} users from export.`);

  if (!docs.length) {
    console.log("No docs to import. Exiting.");
    return;
  }

  console.log("Connecting to MongoDB...");
  // ⬇️ IMPORTANT: target KICK-LIFESTYLE database for the User collection
  await mongoose.connect(MONGO_URI, {
    dbName: "KICK-LIFESTYLE",
  });
  console.log(
    `Connected. Using DB: ${mongoose.connection.name} (should be "KICK-LIFESTYLE")`
  );
  console.log(
    `Target collection: ${User.collection.collectionName} (from User.model.js)`
  );

  try {
    const res = await User.insertMany(docs, {
      ordered: false, // continue on duplicates
    });

    console.log(`✅ Import complete. Inserted ${res.length} users.`);
  } catch (err) {
    if (err?.writeErrors?.length) {
      const total = docs.length;
      const dupCount = err.writeErrors.filter((e) =>
        String(e.code).includes("11000")
      ).length;
      console.warn(
        `Completed with duplicates. Attempted: ${total}, duplicate emails skipped: ${dupCount}`
      );
    } else {
      console.error("❌ Import error:", err);
    }
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected. Done.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

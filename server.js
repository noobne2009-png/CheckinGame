// server.js
// Server điểm danh phát tài khoản game
// npm i express cookie-parser uuid fs-extra

const express = require("express");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");
const ACCOUNTS_FILE = path.join(__dirname, "accounts.txt");

// ✅ Bật chế độ xoá tài khoản sau khi phát
const REMOVE_AFTER_SERVE = true;

async function readDB() {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { users: {} };
  }
}
async function writeDB(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseAccount(line) {
  if (!line) return null;
  const s = line.trim().replace(/^\uFEFF/, "");
  if (!s) return null;
  const sepMatch = s.match(/[:|\t ]/);
  if (!sepMatch) return null;
  const sep = sepMatch[0];
  const parts = s.split(sep).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0]}:${parts.slice(1).join(sep)}`;
}

async function loadAccounts() {
  try {
    const raw = await fs.readFile(ACCOUNTS_FILE, "utf8");
    return raw.split(/\r?\n/).map(parseAccount).filter(Boolean);
  } catch {
    return [];
  }
}

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  if (!req.cookies.mg_userid) {
    const id = uuidv4();
    res.cookie("mg_userid", id, {
      maxAge: 10 * 365 * 24 * 3600 * 1000,
      httpOnly: true,
      sameSite: "Lax",
    });
    req.mg_userid = id;
  } else req.mg_userid = req.cookies.mg_userid;
  next();
});

app.post("/api/checkin", async (req, res) => {
  const userId = req.mg_userid;
  const db = await readDB();
  db.users = db.users || {};
  const today = todayStr();

  const user = db.users[userId] || {};
  if (user.lastCheckin === today)
    return res.json({
      ok: false,
      message: "Bạn đã điểm danh hôm nay rồi, quay lại ngày mai!",
    });

  let accounts = await loadAccounts();
  if (accounts.length === 0)
    return res.json({
      ok: false,
      message: "Danh sách tài khoản trống hoặc file không tồn tại.",
    });

  const idx = Math.floor(Math.random() * accounts.length);
  const acc = accounts[idx];

  if (REMOVE_AFTER_SERVE) {
    try {
      const raw = await fs.readFile(ACCOUNTS_FILE, "utf8");
      const lines = raw.split(/\r?\n/);
      let removed = false;
      const newLines = [];
      for (const line of lines) {
        const parsed = parseAccount(line);
        if (!removed && parsed && parsed === acc) {
          removed = true;
          continue;
        }
        newLines.push(line);
      }
      if (removed) await fs.writeFile(ACCOUNTS_FILE, newLines.join("\n"), "utf8");
    } catch (err) {
      console.error("Không thể xóa tài khoản:", err.message);
    }
  }

  db.users[userId] = { lastCheckin: today };
  await writeDB(db);

  res.json({
    ok: true,
    account: acc,
    telegram: "https://t.me/modgamevietshare",
    removed: REMOVE_AFTER_SERVE,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});


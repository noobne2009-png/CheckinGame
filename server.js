const express = require("express");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
const REMOVE_AFTER_SERVE = true;
const ACC_FILE = path.join(__dirname, "accounts.txt");
const CHECKIN_LOG = path.join(__dirname, "checkins.json");

app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadCheckins() {
  try {
    if (!fs.existsSync(CHECKIN_LOG)) return {};
    return JSON.parse(fs.readFileSync(CHECKIN_LOG, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveCheckins(data) {
  fs.writeFileSync(CHECKIN_LOG, JSON.stringify(data, null, 2), "utf8");
}

app.post("/checkin", (req, res) => {
  const today = new Date().toDateString();
  const deviceId = req.body.deviceId;

  if (!deviceId) {
    return res.json({ ok: false, message: "Thiếu thông tin thiết bị!" });
  }

  let checkins = loadCheckins();

  // Nếu thiết bị này đã điểm danh hôm nay
  if (checkins[deviceId] === today) {
    return res.json({
      ok: false,
      message: "❌ Bạn đã điểm danh hôm nay rồi! Hãy quay lại vào ngày mai nhé.",
    });
  }

  try {
    let data = fs.readFileSync(ACC_FILE, "utf8").trim();
    if (!data) {
      return res.json({
        ok: false,
        message: "Danh sách tài khoản trống!",
      });
    }

    let lines = data.split("\n").filter((l) => l.trim() !== "");
    let randomIndex = Math.floor(Math.random() * lines.length);
    let acc = lines[randomIndex].trim();

    if (REMOVE_AFTER_SERVE) {
      lines.splice(randomIndex, 1);
      fs.writeFileSync(ACC_FILE, lines.join("\n"), "utf8");
    }

    // Ghi lại thiết bị đã điểm danh
    checkins[deviceId] = today;
    saveCheckins(checkins);

    res.json({
      ok: true,
      account: acc,
      telegram: "https://t.me/modgamevietshare",
      removed: REMOVE_AFTER_SERVE,
    });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, message: "Lỗi đọc file accounts.txt!" });
  }
});

// Tự động reset log mỗi ngày
setInterval(() => {
  const today = new Date().toDateString();
  let checkins = loadCheckins();

  for (let key in checkins) {
    if (checkins[key] !== today) delete checkins[key];
  }
  saveCheckins(checkins);
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

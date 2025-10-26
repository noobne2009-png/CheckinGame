// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
const REMOVE_AFTER_SERVE = true;
const ACC_FILE = path.join(__dirname, "accounts.txt");
const CHECKIN_LOG = path.join(__dirname, "checkins.json");

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Lấy địa chỉ IP thực (kể cả Render proxy)
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    "unknown"
  );
}

// Tải dữ liệu checkin
function loadCheckins() {
  try {
    if (!fs.existsSync(CHECKIN_LOG)) return {};
    return JSON.parse(fs.readFileSync(CHECKIN_LOG, "utf8"));
  } catch (e) {
    return {};
  }
}

// Lưu dữ liệu checkin
function saveCheckins(data) {
  fs.writeFileSync(CHECKIN_LOG, JSON.stringify(data, null, 2), "utf8");
}

app.get("/checkin", (req, res) => {
  const today = new Date().toDateString();
  const ip = getClientIP(req);

  let checkins = loadCheckins();

  // Nếu IP đã điểm danh hôm nay
  if (checkins[ip] === today) {
    return res.json({
      ok: false,
      message: "❌ Bạn đã điểm danh hôm nay rồi! Hãy quay lại vào ngày mai nhé.",
    });
  }

  try {
    // Đọc file tài khoản
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

    // Xóa tài khoản sau khi phát nếu bật REMOVE_AFTER_SERVE
    if (REMOVE_AFTER_SERVE) {
      lines.splice(randomIndex, 1);
      fs.writeFileSync(ACC_FILE, lines.join("\n"), "utf8");
    }

    // Ghi lại IP vào file log
    checkins[ip] = today;
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

// Reset log mỗi ngày (làm nhẹ server)
setInterval(() => {
  const today = new Date().toDateString();
  let checkins = loadCheckins();

  // Xóa log cũ (chỉ giữ ngày hôm nay)
  for (let ip in checkins) {
    if (checkins[ip] !== today) delete checkins[ip];
  }
  saveCheckins(checkins);
}, 60 * 60 * 1000); // kiểm tra mỗi 1 tiếng

// Render Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

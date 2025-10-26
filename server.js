// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();
const REMOVE_AFTER_SERVE = true; // xóa tài khoản sau khi phát
const CHECKIN_FILE = path.join(__dirname, "accounts.txt");

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Hàm kiểm tra xem người dùng đã điểm danh hôm nay chưa
function hasCheckedInToday(cookieDate) {
  const today = new Date().toDateString();
  return cookieDate === today;
}

// API điểm danh
app.get("/checkin", (req, res) => {
  const userCookie = req.cookies.lastCheckin;
  const today = new Date().toDateString();

  if (hasCheckedInToday(userCookie)) {
    return res.json({
      ok: false,
      message: "❗ Bạn đã điểm danh hôm nay rồi, hãy quay lại vào ngày mai!",
    });
  }

  try {
    // Đọc file tài khoản
    let data = fs.readFileSync(CHECKIN_FILE, "utf8").trim();
    if (!data) {
      return res.json({
        ok: false,
        message: "Danh sách tài khoản trống!",
      });
    }

    let lines = data.split("\n").filter((l) => l.trim() !== "");
    let randomIndex = Math.floor(Math.random() * lines.length);
    let acc = lines[randomIndex].trim();

    // Nếu bật REMOVE_AFTER_SERVE thì xóa tài khoản đã phát
    if (REMOVE_AFTER_SERVE) {
      lines.splice(randomIndex, 1);
      fs.writeFileSync(CHECKIN_FILE, lines.join("\n"), "utf8");
    }

    // Lưu cookie để chống điểm danh nhiều lần
    res.cookie("lastCheckin", today, {
      maxAge: 24 * 60 * 60 * 1000, // 1 ngày
    });

    return res.json({
      ok: true,
      account: acc,
      telegram: "https://t.me/modgamevietshare",
      removed: REMOVE_AFTER_SERVE,
    });
  } catch (err) {
    console.error(err);
    return res.json({
      ok: false,
      message: "Lỗi đọc file accounts.txt!",
    });
  }
});

// Render port cho Render.com
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server is running on port ${PORT}`));

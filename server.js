require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// 🔥 Crash Debug (VERY IMPORTANT)
process.on("uncaughtException", err => {
  console.log("UNCAUGHT ERROR:", err);
});
process.on("unhandledRejection", err => {
  console.log("PROMISE ERROR:", err);
});

// 🔥 Global Data
let requestCount = 0;
let otpLogs = [];
const startTime = Date.now();

// 📊 Request Counter
app.use((req, res, next) => {
  requestCount++;
  next();
});

// 🔐 Gmail Transporter
let transporter;

try {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS
    }
  });
  console.log("✅ Mail transporter ready");
} catch (err) {
  console.log("❌ Mail transporter error:", err);
}

// 🚀 SEND OTP API
app.post("/send-otp", async (req, res) => {
  console.log("📩 Request received:", req.body);

  try {
    const { email, username } = req.body;

    if (!email || !username) {
      return res.json({ success: false, msg: "Email & Username required!" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    await transporter.sendMail({
      from: `"Downloader X" <${process.env.EMAIL}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Hello ${username}, OTP: ${otp}`
    });

    otpLogs.unshift({
      email,
      otp,
      time: new Date().toLocaleString()
    });

    if (otpLogs.length > 20) otpLogs.pop();

    console.log("✅ OTP Sent:", otp);

    res.json({ success: true, msg: "OTP sent!" });

  } catch (err) {
    console.log("❌ SEND ERROR:", err);
    res.json({ success: false, error: err.message });
  }
});

// 📜 Logs API
app.get("/logs", (req, res) => {
  res.json(otpLogs);
});

// 🌐 Root
app.get("/", (req, res) => {
  res.send("MAINUL-X OTP API RUNNING 🚀");
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});

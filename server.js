require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

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
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS
  }
});

// 🚀 SEND OTP API
app.post("/send-otp", async (req, res) => {
  const { email, username } = req.body;

  if (!email || !username) {
    return res.json({ success: false, msg: "Email & Username required!" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);

  try {
    await transporter.sendMail({
      from: `"Downloader X" <${process.env.EMAIL}>`,
      to: email,
      subject: "Your OTP Code - Downloader X",
      text: `Hello ${username}, Your OTP is: ${otp}`,
      
      html: `
      <div style="font-family:Arial; background:#0f0c29; padding:20px; color:white; text-align:center;">
        <h2 style="color:#00d4ff;">🚀 Downloader X</h2>
        <p>Hello <b>${username}</b> 👋</p>
        <p>Your OTP is:</p>

        <div style="
          background:linear-gradient(135deg,#00d4ff,#00ff88);
          color:black;
          display:inline-block;
          padding:15px 25px;
          font-size:26px;
          font-weight:bold;
          border-radius:12px;
          letter-spacing:4px;
          margin:15px 0;
        ">
          ${otp}
        </div>

        <p>⏳ Valid for 2 minutes</p>
        <p style="font-size:12px; color:#aaa;">Do not share this code</p>

        <hr style="opacity:0.2;">
        <p style="font-size:12px; color:#888;">© Downloader X | MAINUL-X TEAM</p>
      </div>
      `
    });

    // 🔥 Save Logs
    otpLogs.unshift({
      email,
      otp,
      time: new Date().toLocaleString()
    });

    if (otpLogs.length > 20) otpLogs.pop();

    console.log("OTP:", otp);

    res.json({ success: true, msg: "OTP sent!" });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 📜 Logs API
app.get("/logs", (req, res) => {
  res.json(otpLogs);
});

// 🌐 ROOT DASHBOARD
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Downloader X API</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{
margin:0;
font-family:Segoe UI;
background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
color:white;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
}
.card{
background:rgba(255,255,255,0.06);
padding:25px;
border-radius:20px;
text-align:center;
width:340px;
backdrop-filter:blur(15px);
box-shadow:0 0 25px rgba(0,0,0,0.6);
animation:fadeIn 1s ease;
}
.status{
color:#00ff88;
font-weight:bold;
animation:pulse 1.5s infinite;
}
.box{
background:rgba(255,255,255,0.08);
padding:10px;
border-radius:10px;
margin:8px 0;
}
button{
padding:10px;
border:none;
border-radius:10px;
background:#00d4ff;
color:black;
cursor:pointer;
width:100%;
margin-top:8px;
}
@keyframes fadeIn{
from{opacity:0;transform:translateY(20px);}
to{opacity:1;}
}
@keyframes pulse{
0%{opacity:1;}
50%{opacity:0.5;}
100%{opacity:1;}
}
</style>
</head>

<body>
<div class="card">

<h2>🚀 Downloader X</h2>
<p class="status">● SERVER ONLINE</p>

<div class="box">⏱ Uptime: <span id="uptime">...</span></div>
<div class="box">📊 Requests: ${requestCount}</div>
<div class="box">📡 API: Working</div>

<button onclick="testAPI()">Test OTP API</button>
<button onclick="loadLogs()">View Logs</button>

<div id="result" class="box" style="display:none;"></div>
<div id="logs" class="box" style="display:none; max-height:150px; overflow:auto;"></div>

<hr style="opacity:0.2;">
<p>👨‍💻 Md. Mainul Islam</p>

</div>

<script>
const startTime=${startTime};

function updateUptime(){
const diff=Math.floor((Date.now()-startTime)/1000);
const h=Math.floor(diff/3600);
const m=Math.floor((diff%3600)/60);
const s=diff%60;
document.getElementById("uptime").innerText=h+"h "+m+"m "+s+"s";
}
setInterval(updateUptime,1000);
updateUptime();

async function testAPI(){
const box=document.getElementById("result");
box.style.display="block";
box.innerText="Testing...";
try{
const res=await fetch("/send-otp",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({email:"test@gmail.com",username:"Test"})
});
const data=await res.json();
box.innerText=data.success?"✅ Working":"❌ Failed";
}catch{
box.innerText="❌ Error";
}
}

async function loadLogs(){
const logBox=document.getElementById("logs");
logBox.style.display="block";
logBox.innerText="Loading...";
const res=await fetch("/logs");
const data=await res.json();

logBox.innerHTML=data.map(l=>\`
📧 \${l.email}<br>
🔢 OTP: \${l.otp}<br>
⏰ \${l.time}<hr>
\`).join("");
}
</script>

</body>
</html>
`);
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running...");
});

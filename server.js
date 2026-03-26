// সম্পূর্ণ আপডেটেড কোড
require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// Global Data
let requestCount = 0;
let otpLogs = [];
const startTime = Date.now();
let lastOtpSent = {}; // Rate limiting

// Process error handlers
process.on("uncaughtException", (err) => {
    console.log("💥 UNCAUGHT ERROR:", err);
});
process.on("unhandledRejection", (err) => {
    console.log("💥 PROMISE ERROR:", err);
});

// Request Counter
app.use((req, res, next) => {
    requestCount++;
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// ✅ FIXED: GMAIL TRANSPORTER with better config
let transporter;

async function createTransporter() {
    try {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASS
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true,
            logger: true
        });

        // Verify connection
        await transporter.verify();
        console.log("✅ Mail transporter ready");
        console.log("📧 EMAIL:", process.env.EMAIL);
        console.log("🔑 PASS:", process.env.PASS ? "SET ✅" : "NOT SET ❌");
        return true;
    } catch (err) {
        console.log("❌ Transporter Error:", err);
        return false;
    }
}

// 🚀 SEND OTP API (FIXED)
app.post("/send-otp", async (req, res) => {
    console.log("📩 BODY:", req.body);

    try {
        const { email, username } = req.body;

        if (!email || !username) {
            console.log("❌ Missing data");
            return res.json({ success: false, msg: "Email & Username required!" });
        }

        // Rate limiting (60 seconds)
        if (lastOtpSent[email] && Date.now() - lastOtpSent[email] < 60000) {
            return res.json({ 
                success: false, 
                msg: "Please wait 60 seconds before requesting another OTP!" 
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        console.log("🔢 Generated OTP:", otp);

        // Check if transporter is ready
        if (!transporter) {
            await createTransporter();
        }

        const mailOptions = {
            from: `"Downloader X" <${process.env.EMAIL}>`,
            to: email,
            subject: "🔐 Your OTP Code - Downloader X",
            text: `Hello ${username}, your OTP code is: ${otp}. Valid for 2 minutes.`,
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #0f0c29, #1a1a2e);
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 500px;
                        margin: 0 auto;
                        background: rgba(255,255,255,0.05);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 30px;
                        border: 1px solid rgba(0,212,255,0.3);
                    }
                    h2 {
                        color: #00d4ff;
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .otp-box {
                        background: linear-gradient(135deg, #00d4ff, #00ff88);
                        color: #0f0c29;
                        font-size: 36px;
                        font-weight: bold;
                        text-align: center;
                        padding: 20px;
                        border-radius: 15px;
                        letter-spacing: 8px;
                        margin: 25px 0;
                        font-family: monospace;
                    }
                    .message {
                        color: rgba(255,255,255,0.9);
                        text-align: center;
                        margin: 15px 0;
                    }
                    .footer {
                        text-align: center;
                        font-size: 12px;
                        color: rgba(255,255,255,0.5);
                        margin-top: 25px;
                        padding-top: 15px;
                        border-top: 1px solid rgba(255,255,255,0.1);
                    }
                    .warning {
                        color: #ffaa44;
                        font-size: 12px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>🚀 Downloader X</h2>
                    <div class="message">
                        Hello <strong style="color: #00ff88;">${username}</strong> 👋
                    </div>
                    <div class="message">
                        Your One-Time Password (OTP) is:
                    </div>
                    <div class="otp-box">
                        ${otp}
                    </div>
                    <div class="warning">
                        ⏳ This code expires in <strong>2 minutes</strong>
                    </div>
                    <div class="message">
                        🔒 Please do not share this code with anyone
                    </div>
                    <div class="footer">
                        © 2026 Downloader X | Developed by MAINUL-X TEAM
                    </div>
                </div>
            </body>
            </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email Sent Successfully! Message ID:", info.messageId);

        // Save logs
        lastOtpSent[email] = Date.now();
        otpLogs.unshift({
            email,
            otp,
            time: new Date().toLocaleString(),
            messageId: info.messageId
        });

        if (otpLogs.length > 20) otpLogs.pop();

        res.json({ success: true, msg: "OTP sent successfully!", messageId: info.messageId });

    } catch (err) {
        console.log("❌ SEND ERROR:", err);
        res.json({ 
            success: false, 
            error: err.message,
            msg: "Failed to send email. Please check your email configuration."
        });
    }
});

// 📜 LOGS API
app.get("/logs", (req, res) => {
    res.json(otpLogs);
});

// 📊 STATS API
app.get("/stats", (req, res) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    res.json({
        uptime,
        requests: requestCount,
        otpSent: otpLogs.length,
        status: "online"
    });
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
*{margin:0;padding:0;box-sizing:border-box;}
body{
font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
color:white;
min-height:100vh;
display:flex;
justify-content:center;
align-items:center;
}
.card{
background:rgba(255,255,255,0.08);
backdrop-filter:blur(15px);
border-radius:28px;
padding:32px;
width:380px;
text-align:center;
border:1px solid rgba(0,212,255,0.3);
box-shadow:0 25px 45px rgba(0,0,0,0.3);
animation:fadeIn 0.6s ease;
}
.status{
color:#00ff88;
font-weight:bold;
animation:pulse 1.5s infinite;
}
.box{
background:rgba(255,255,255,0.1);
padding:12px;
border-radius:12px;
margin:12px 0;
font-size:14px;
}
button{
background:linear-gradient(135deg,#00d4ff,#0099cc);
border:none;
padding:12px;
border-radius:12px;
color:#0f0c29;
font-weight:bold;
cursor:pointer;
width:100%;
margin-top:10px;
transition:all 0.3s;
}
button:hover{
transform:translateY(-2px);
box-shadow:0 5px 20px rgba(0,212,255,0.4);
}
@keyframes fadeIn{
from{opacity:0;transform:translateY(20px);}
to{opacity:1;}
}
@keyframes pulse{
0%,100%{opacity:1;}
50%{opacity:0.6;}
}
</style>
</head>
<body>
<div class="card">
<h2 style="color:#00d4ff;">🚀 Downloader X</h2>
<p class="status">● SERVER ONLINE</p>
<div class="box">⏱ Uptime: <span id="uptime">...</span></div>
<div class="box">📊 Requests: ${requestCount}</div>
<div class="box">📧 OTP Sent: ${otpLogs.length}</div>
<div class="box">📡 API Status: <span style="color:#00ff88;">Working</span></div>
<button onclick="testAPI()">📧 Test OTP API</button>
<button onclick="loadLogs()">📜 View Logs</button>
<div id="result" style="display:none;" class="box"></div>
<div id="logs" style="display:none; max-height:200px; overflow:auto;" class="box"></div>
<hr style="margin:15px 0; opacity:0.2;">
<p>👨‍💻 <strong>Md. Mainul Islam</strong></p>
<p style="font-size:11px;">MAINUL-X TEAM</p>
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
box.innerHTML="📧 Sending test email...";
const email=prompt("Enter your email address:");
if(!email){box.innerHTML="❌ Cancelled";return;}
try{
const res=await fetch("/send-otp",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({email:email,username:"TestUser"})
});
const data=await res.json();
if(data.success){
box.innerHTML="✅ OTP sent successfully! Check your email inbox (also check spam folder).";
} else {
box.innerHTML="❌ Failed: "+data.msg;
}
}catch(e){
box.innerHTML="❌ Network Error";
}
}
async function loadLogs(){
const logBox=document.getElementById("logs");
logBox.style.display="block";
logBox.innerHTML="📜 Loading logs...";
const res=await fetch("/logs");
const data=await res.json();
if(data.length===0){
logBox.innerHTML="📭 No OTP sent yet";
return;
}
logBox.innerHTML=data.map(l=>\`
📧 <strong>\${l.email}</strong><br>
🔢 OTP: \${l.otp}<br>
⏰ \${l.time}<hr>
\`).join("");
}
</script>
</body>
</html>
`);
});

// Start server
const PORT = process.env.PORT || 3000;
createTransporter().then(() => {
    app.listen(PORT, () => {
        console.log("🚀 Server running on port", PORT);
        console.log("🌐 http://localhost:" + PORT);
    });
}).catch(err => {
    console.log("❌ Failed to start server:", err);
});

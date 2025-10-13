// server.js
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();

app.use(bodyParser.json());
app.use(cors());

// ✅ ENV VARIABLES (Set these in Render)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "my_secure_verify_token_123";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// ✅ Root route
app.get("/", (req, res) => {
  res.send("Facebook Chatbot is running!");
});


// ========================
// 🌐 1. WEBHOOK VERIFICATION
// ========================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully!");
      res.status(200).send(challenge);
    } else {
      console.error("❌ Webhook verification failed. Invalid token.");
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});


// ========================
// 💬 2. WEBHOOK EVENT HANDLER
// ========================
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach((entry) => {
      const webhookEvent = entry.messaging[0];
      const senderPsid = webhookEvent.sender.id;

      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      } else if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback);
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});


// ========================
// 🤖 3. HANDLE MESSAGES
// ========================
function handleMessage(senderPsid, receivedMessage) {
  let response;

  if (receivedMessage.text) {
    const text = receivedMessage.text.toLowerCase();

    if (text.includes("hi") || text.includes("hello")) {
      response = { text: "Hey there! 👋 Welcome to Kaslod Crew. How can I help you?" };
    } else if (text.includes("hours") || text.includes("open")) {
      response = { text: "⏰ We're usually around from 8AM - 5PM! Catch us then." };
    } else if (text.includes("thank")) {
      response = { text: "You're very welcome! 🙌" };
    } else {
      response = { text: "I’m not sure what you mean. Try asking about our crew, hours, or upcoming rides!" };
    }
  }

  callSendAPI(senderPsid, response);
}


// ========================
// 🧭 4. HANDLE POSTBACKS
// ========================
function handlePostback(senderPsid, receivedPostback) {
  const payload = receivedPostback.payload;
  let response;

  if (payload === "GET_STARTED") {
    response = { text: "Welcome to Kaslod Crew! 🛹 Let’s roll together!" };
  } else {
    response = { text: "Got your postback event! 🚀" };
  }

  callSendAPI(senderPsid, response);
}


// ========================
// 🚀 5. CALL FACEBOOK SEND API
// ========================
function callSendAPI(senderPsid, response) {
  const requestBody = {
    recipient: { id: senderPsid },
    message: response,
  };

  axios
    .post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, requestBody)
    .then(() => {
      console.log("✅ Message sent!");
    })
    .catch((error) => {
      console.error("❌ Unable to send message:", error.response?.data || error.message);
    });
}


// ========================
// 🖥️ SERVER LISTEN
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Facebook Chatbot server is running on port ${PORT}`);
});

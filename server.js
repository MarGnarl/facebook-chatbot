// server.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Configuration
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_secure_verify_token_123';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PORT = process.env.PORT || 3000;

// Root route
app.get('/', (req, res) => {
  res.send('Facebook Chatbot is running!');
});

// FAQ Database
const faqs = {
  'hours': '⏰ We\'re usually around from 8AM - 5PM! Catch us then.',
  'location': '📍 We roll around Maasin City, Southern Leyte!',
  'contact': '📧 Hit us up here on Messenger or email kaslodcrew@gmail.com',
  'services': '🛹 Kaslod Crew offers: Custom rides, crew meetups, and sick skating sessions!',
  'pricing': '💰 Wanna join the crew? Message us for details!',
  'help': 'I can answer questions about: hours, location, contact, services, pricing, crew. Just type any keyword!'
};

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    if (mode === 'subscribe') {
      console.log('Webhook verified!');
      res.status(200).send(challenge);
    }
  } else {
    res.sendStatus(403);
  }
});

// Webhook event handler
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      entry.messaging.forEach(event => {
        if (event.message && event.message.text) {
          handleMessage(event.sender.id, event.message.text);
        } else if (event.postback) {
          handlePostback(event.sender.id, event.postback.payload);
        }
      });
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Handle incoming messages
function handleMessage(senderId, messageText) {
  const lowerText = messageText.toLowerCase();
  let response = "I'm not sure what you mean. Try asking about our crew, hours, location, or services! Type 'help' for options.";

  // Check for greetings first
  if (lowerText.match(/^(hi|hello|hey|greetings|sup|yo)/)) {
    response = "Hey there! 👋 Welcome to Kaslod Crew. How can I help you?";
  }
  // Check for thanks
  else if (lowerText.includes('thank')) {
    response = "You're very welcome! 🙌 Anything else I can help with?";
  }
  // Check for FAQ keywords
  else {
    for (const [key, value] of Object.entries(faqs)) {
      if (lowerText.includes(key)) {
        response = value;
        break;
      }
    }
  }

  sendTextMessage(senderId, response);
}

// Handle postback buttons
function handlePostback(senderId, payload) {
  let response;
  
  switch(payload) {
    case 'GET_STARTED':
      response = "Welcome to Kaslod Crew! 🛹 Let's roll together! Type 'help' to see what I can do.";
      break;
    case 'SHOW_FAQS':
      response = "Here are our FAQs:\n• Hours\n• Location\n• Contact\n• Services\n• Pricing\n\nJust type any keyword!";
      break;
    default:
      response = "Got your message! 🚀 How can I help you?";
  }
  
  sendTextMessage(senderId, response);
}

// Send text message
function sendTextMessage(recipientId, messageText) {
  const messageData = {
    recipient: { id: recipientId },
    message: { text: messageText }
  };

  callSendAPI(messageData);
}

// Send message with quick replies
function sendQuickReply(recipientId) {
  const messageData = {
    recipient: { id: recipientId },
    message: {
      text: "What would you like to know?",
      quick_replies: [
        {
          content_type: "text",
          title: "Hours",
          payload: "HOURS"
        },
        {
          content_type: "text",
          title: "Location",
          payload: "LOCATION"
        },
        {
          content_type: "text",
          title: "Contact",
          payload: "CONTACT"
        },
        {
          content_type: "text",
          title: "Services",
          payload: "SERVICES"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

// Call the Facebook Send API
function callSendAPI(messageData) {
  axios.post(`https://graph.facebook.com/v18.0/me/messages`, messageData, {
    params: { access_token: PAGE_ACCESS_TOKEN }
  })
  .then(response => {
    console.log('✅ Message sent successfully');
  })
  .catch(error => {
    console.error('❌ Error sending message:', error.response ? error.response.data : error.message);
  });
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Facebook Chatbot is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Facebook Chatbot server is running on port ${PORT}`);
  console.log(`🔗 Webhook URL: https://your-app.onrender.com/webhook`);
});

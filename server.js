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
  'location': '📍 We roll around Quezon City, Metro Manila!',
  'contact': '📧 Hit us up here on Messenger or email kaslodcrew@example.com',
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

  // Check for greetings first - show menu with quick replies
  if (lowerText.match(/^(hi|hello|hey|greetings|sup|yo|start|menu)/)) {
    sendQuickReply(senderId, "Hey there! 👋 Welcome to Kaslod Crew. What would you like to know?");
    return;
  }
  // Check for thanks
  else if (lowerText.includes('thank')) {
    sendQuickReply(senderId, "You're very welcome! 🙌 Anything else I can help with?");
    return;
  }
  // Check for help
  else if (lowerText.includes('help')) {
    sendQuickReply(senderId, "Here's what I can help you with. Just click a button below! 👇");
    return;
  }

  // Check for FAQ keywords
  let response = null;
  for (const [key, value] of Object.entries(faqs)) {
    if (lowerText.includes(key)) {
      response = value;
      break;
    }
  }

  // If we found an answer, send it with quick replies for more questions
  if (response) {
    sendQuickReply(senderId, response);
  } else {
    // Default response with quick replies
    sendQuickReply(senderId, "I'm not sure what you mean. Try clicking one of the options below! 👇");
  }
}

// Handle postback buttons
function handlePostback(senderId, payload) {
  let response;
  
  switch(payload) {
    case 'GET_STARTED':
      sendButtonTemplate(senderId);
      return;
    case 'SHOW_FAQS':
      sendQuickReply(senderId, "Here are our most asked questions. Click any button below! 👇");
      return;
    case 'CONTACT_US':
      sendQuickReply(senderId, faqs.contact);
      return;
    default:
      sendQuickReply(senderId, "Got your message! 🚀 How can I help you?");
      return;
  }
}

// Send text message
function sendTextMessage(recipientId, messageText) {
  const messageData = {
    recipient: { id: recipientId },
    message: { text: messageText }
  };

  callSendAPI(messageData);
}

// Send message with quick replies (clickable buttons)
function sendQuickReply(recipientId, messageText) {
  const messageData = {
    recipient: { id: recipientId },
    message: {
      text: messageText,
      quick_replies: [
        {
          content_type: "text",
          title: "⏰ Hours",
          payload: "HOURS"
        },
        {
          content_type: "text",
          title: "📍 Location",
          payload: "LOCATION"
        },
        {
          content_type: "text",
          title: "📧 Contact",
          payload: "CONTACT"
        },
        {
          content_type: "text",
          title: "🛹 Services",
          payload: "SERVICES"
        },
        {
          content_type: "text",
          title: "💰 Pricing",
          payload: "PRICING"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

// Send button template (for more structured options)
function sendButtonTemplate(recipientId) {
  const messageData = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome to Kaslod Crew! 🛹 Choose an option:",
          buttons: [
            {
              type: "postback",
              title: "📋 View FAQs",
              payload: "SHOW_FAQS"
            },
            {
              type: "postback",
              title: "📧 Contact Us",
              payload: "CONTACT_US"
            },
            {
              type: "web_url",
              title: "🌐 Visit Website",
              url: "https://facebook.com/kaslodcrew"
            }
          ]
        }
      }
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

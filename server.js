// server.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Configuration
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'your_verify_token_here';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'your_page_access_token_here';
const PORT = process.env.PORT || 3000;

// FAQ Database
const faqs = {
  'hours': 'We are open Monday-Friday, 9 AM to 6 PM, and Saturday 10 AM to 4 PM.',
  'location': 'We are located at 123 Main Street, City, Country.',
  'contact': 'You can reach us at contact@example.com or call (123) 456-7890.',
  'services': 'We offer web development, mobile apps, consulting, and digital marketing services.',
  'pricing': 'Our pricing varies by project. Please contact us for a custom quote.',
  'help': 'I can answer questions about: hours, location, contact, services, pricing. Just type any keyword!'
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
  let response = "I'm sorry, I didn't understand that. Type 'help' to see what I can answer!";

  // Check for FAQ keywords
  for (const [key, value] of Object.entries(faqs)) {
    if (lowerText.includes(key)) {
      response = value;
      break;
    }
  }

  // Check for greetings
  if (lowerText.match(/^(hi|hello|hey|greetings)/)) {
    response = "Hello! 👋 How can I help you today? Type 'help' to see available options.";
  }

  sendTextMessage(senderId, response);
}

// Handle postback buttons
function handlePostback(senderId, payload) {
  let response;
  
  switch(payload) {
    case 'GET_STARTED':
      response = "Welcome! I'm here to help answer your questions. Type 'help' to see what I can do!";
      break;
    case 'SHOW_FAQS':
      response = "Here are our FAQs:\n• Hours\n• Location\n• Contact\n• Services\n• Pricing\n\nJust type any keyword!";
      break;
    default:
      response = "I'm not sure how to handle that.";
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
    console.log('Message sent successfully');
  })
  .catch(error => {
    console.error('Error sending message:', error.response ? error.response.data : error);
  });
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Facebook Chatbot is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
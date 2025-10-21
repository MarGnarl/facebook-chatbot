// server.js - Facebook Chatbot with Google Gemini AI
const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(bodyParser.json());

// Configuration
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_secure_verify_token_123';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Business context for Gemini AI
const BUSINESS_CONTEXT = `You are a friendly assistant for Kaslod Crew, a skateboarding crew in Roxas City, Capiz, Philippines.

Our Info:
- Hours: 8AM - 5PM
- Location: Roxas City, Capiz, Western Visayas, Philippines  
- Services: Custom rides, crew meetups, skating sessions
- Contact: warionramos@gmail.com, Facebook: facebook.com/kaslodcrew

Keep responses friendly, concise (2-3 sentences), use emojis occasionally 🛹. If you don't know something specific, suggest they contact us directly.`;

// FAQ fallback database
const faqs = {
  'hours': '⏰ We\'re usually around from 8AM - 5PM! Catch us then.',
  'location': '📍 We roll around Maasin City, Southern Leyte, Philippines!',
  'contact': '📧 Hit us up at warionramos@gmail.com or message us here!',
  'services': '🛹 Kaslod Crew offers: Custom rides, crew meetups, and sick skating sessions!',
  'pricing': '💰 Wanna join the crew? Message us for details!',
  'help': 'I can answer questions about: hours, location, contact, services, pricing, crew. Just ask me anything!'
};

// Root route
app.get('/', (req, res) => {
  res.send('🛹 Kaslod Crew Chatbot with Gemini AI is running!');
});

// Privacy Policy route
app.get('/privacy', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - Kaslod Crew Chatbot</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { color: #1877f2; border-bottom: 2px solid #1877f2; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p><em>Last Updated: October 14, 2025</em></p>
    <h2>1. Information We Collect</h2>
    <p>We collect: Facebook User ID, messages sent to the chatbot, and interaction data.</p>
    <h2>2. How We Use Information</h2>
    <p>Data is used to respond to inquiries and improve our chatbot service.</p>
    <h2>3. Data Storage</h2>
    <p>We do not permanently store messages. All processing is done in real-time.</p>
    <h2>4. Third-Party Services</h2>
    <p>We use: Facebook Messenger, Render.com hosting, and Google Gemini AI.</p>
    <h2>5. Contact</h2>
    <p>Email: warionramos@gmail.com | Facebook: facebook.com/kaslodcrew</p>
</body>
</html>
  `);
});

// Terms of Service route
app.get('/terms', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { color: #1877f2; border-bottom: 2px solid #1877f2; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p><em>Last Updated: October 14, 2025</em></p>
    <h2>1. Service Description</h2>
    <p>Our chatbot provides automated FAQ responses via Facebook Messenger.</p>
    <h2>2. Acceptable Use</h2>
    <p>Use the service lawfully and respectfully.</p>
    <h2>3. Limitation of Liability</h2>
    <p>We are not liable for response errors or service interruptions.</p>
    <h2>4. Contact</h2>
    <p>Email: warionramos@gmail.com</p>
</body>
</html>
  `);
});

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    if (mode === 'subscribe') {
      console.log('✅ Webhook verified!');
      res.status(200).send(challenge);
    }
  } else {
    console.error('❌ Webhook verification failed');
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

// Handle incoming messages with AI
async function handleMessage(senderId, messageText) {
  const lowerText = messageText.toLowerCase();

  // Show typing indicator while processing
  sendTypingIndicator(senderId, true);

  // Check for greetings - show welcome with quick replies
  if (lowerText.match(/^(hi|hello|hey|greetings|sup|yo|start|menu)$/)) {
    sendQuickReply(senderId, "Hey there! 👋 Welcome to Kaslod Crew. I'm an AI assistant. What would you like to know?");
    return;
  }

  // Try AI response first, fallback to FAQs if it fails
  try {
    const aiResponse = await getGeminiResponse(messageText);
    sendQuickReply(senderId, aiResponse);
  } catch (error) {
    console.error('⚠️ Gemini AI error:', error.message);
    // Fallback to FAQ-based response
    const fallbackResponse = getFallbackResponse(lowerText);
    sendQuickReply(senderId, fallbackResponse);
  }
}

// Get AI response from Google Gemini using SDK
async function getGeminiResponse(userMessage) {
  if (!GEMINI_API_KEY) {
    console.error('❌ Gemini API key missing');
    throw new Error('Gemini API key not configured');
  }

  try {
    console.log('🤖 Calling Gemini AI with SDK...');
    
    // Try different models in order of preference
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.0-pro',
      'gemini-pro',
      'models/gemini-pro'
    ];

    let lastError = null;
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`🤖 Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
            topP: 0.9,
            topK: 40
          }
        });

        const prompt = `${BUSINESS_CONTEXT}\n\nUser: ${userMessage}\n\nAssistant:`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ Success with model: ${modelName}`);
        return text.trim();
      } catch (error) {
        lastError = error;
        console.log(`❌ Model ${modelName} failed: ${error.message}`);
        // Continue to next model
      }
    }

    // If all models fail
    throw lastError || new Error('All Gemini models failed');

  } catch (error) {
    console.error('❌ All Gemini AI calls failed:', error.message);
    throw new Error(`Gemini AI unavailable: ${error.message}`);
  }
}

// Fallback response using FAQ keywords
function getFallbackResponse(messageText) {
  // Check for thanks
  if (messageText.includes('thank')) {
    return "You're very welcome! 🙌 Anything else I can help with?";
  }

  // Check FAQ keywords
  for (const [key, value] of Object.entries(faqs)) {
    if (messageText.includes(key)) {
      return value;
    }
  }
  
  return "I'm here to help! Ask me about our hours, location, services, or anything about Kaslod Crew! 🛹";
}

// Handle postback buttons
function handlePostback(senderId, payload) {
  switch(payload) {
    case 'GET_STARTED':
      sendButtonTemplate(senderId);
      break;
    case 'SHOW_FAQS':
      sendQuickReply(senderId, "Here are some things I can help you with! Click a button or just ask me anywhere.");
      break;
    case 'CONTACT_US':
      sendQuickReply(senderId, faqs.contact);
      break;
    default:
      sendQuickReply(senderId, "How can I help you today? 🛹");
  }
}

// Send typing indicator
function sendTypingIndicator(recipientId, isTyping) {
  const messageData = {
    recipient: { id: recipientId },
    sender_action: isTyping ? 'typing_on' : 'typing_off'
  };
  callSendAPI(messageData);
}

// Send text message
function sendTextMessage(recipientId, messageText) {
  const messageData = {
    recipient: { id: recipientId },
    message: { text: messageText }
  };
  callSendAPI(messageData);
}

// Send message with quick reply buttons
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

// Send button template
function sendButtonTemplate(recipientId) {
  const messageData = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome to Kaslod Crew! 🛹 I'm an AI-powered assistant. Choose an option:",
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
              title: "🌐 Facebook Page",
              url: "https://facebook.com/kaslodcrew"
            }
          ]
        }
      }
    }
  };
  callSendAPI(messageData);
}

// Call Facebook Send API
function callSendAPI(messageData) {
  const axios = require('axios');
  axios.post(`https://graph.facebook.com/v18.0/me/messages`, messageData, {
    params: { access_token: PAGE_ACCESS_TOKEN }
  })
  .then(() => {
    console.log('✅ Message sent');
  })
  .catch(error => {
    console.error('❌ Send error:', error.response?.data || error.message);
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ Kaslod Crew Chatbot running on port ${PORT}`);
  console.log(`🔑 Verify Token: ${VERIFY_TOKEN ? '✓ Set' : '✗ Missing'}`);
  console.log(`🔑 Page Token: ${PAGE_ACCESS_TOKEN ? '✓ Set' : '✗ Missing'}`);
  console.log(`🤖 Gemini API Key: ${GEMINI_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`🔗 Webhook: https://facebook-chatbot-5mpc.onrender.com/webhook`);
});

// server.js - Facebook Chatbot with Google Gemini AI
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Configuration
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_secure_verify_token_123';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

// Gemini API URL - using v1beta which is more stable
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

// Business context for Gemini AI
const BUSINESS_CONTEXT = `You are a friendly skateboarding assistant for Kaslod Crew in Maasin City, Southern Leyte, Philippines.

Business Details:
- Name: Kaslod Crew
- Hours: 8AM - 5PM
- Location: Maasin City, Southern Leyte, Philippines
- Services: Custom skateboard rides, crew meetups, skating sessions, longboarding
- Contact: warionramos@gmail.com, Facebook: facebook.com/kaslodcrew

Instructions:
- Be friendly and enthusiastic about skateboarding
- Keep responses SHORT (1-3 sentences max)
- Use emojis occasionally 🛹
- If you don't know specific details, suggest contacting us directly
- Answer questions about skateboarding, longboarding, and our crew

IMPORTANT: Always stay in character as a skateboarding crew assistant.`;

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
    <p><em>Last Updated: October 22, 2025</em></p>
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
    <p><em>Last Updated: October 22, 2025</em></p>
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
  console.log(`📨 Received message: "${messageText}" from ${senderId}`);
  
  const lowerText = messageText.toLowerCase();

  // Show typing indicator
  sendTypingIndicator(senderId, true);

  // Check for simple greetings
  if (lowerText.match(/^(hi|hello|hey|sup|yo)$/)) {
    sendQuickReply(senderId, "Hey there! 👋 Welcome to Kaslod Crew. I'm your AI skateboarding assistant! What would you like to know?");
    return;
  }

  // Try Gemini AI first
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'undefined') {
    try {
      console.log('🤖 Calling Gemini AI...');
      const aiResponse = await getGeminiResponse(messageText);
      console.log('✅ AI Response:', aiResponse);
      sendQuickReply(senderId, aiResponse);
      return;
    } catch (error) {
      console.error('❌ Gemini AI failed:', error.message);
      // Continue to fallback
    }
  } else {
    console.log('⚠️ Gemini API key not set, using fallback');
  }

  // Fallback to FAQ
  const fallbackResponse = getFallbackResponse(lowerText);
  console.log('📋 Using fallback response:', fallbackResponse);
  sendQuickReply(senderId, fallbackResponse);
}

// Get AI response from Google Gemini
async function getGeminiResponse(userMessage) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'undefined') {
    throw new Error('Gemini API key not configured');
  }

  const fullPrompt = `${BUSINESS_CONTEXT}\n\nUser asks: "${userMessage}"\n\nYour response (keep it SHORT and friendly):`;

  const requestBody = {
    contents: [{
      parts: [{
        text: fullPrompt
      }]
    }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 100,
      topP: 0.95,
      topK: 40
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  };

  try {
    const response = await axios.post(GEMINI_API_URL, requestBody, {
      headers: { 
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('📥 Gemini API response status:', response.status);

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const aiText = response.data.candidates[0].content.parts[0].text.trim();
      console.log('✅ Gemini response text:', aiText);
      return aiText;
    } else {
      console.error('❌ Unexpected Gemini response structure:', JSON.stringify(response.data));
      throw new Error('Invalid response format from Gemini');
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Gemini API error response:', error.response.status, error.response.data);
      throw new Error(`Gemini API error: ${error.response.status}`);
    } else {
      console.error('❌ Gemini request error:', error.message);
      throw error;
    }
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
  
  // Check for longboarding specifically
  if (messageText.includes('longboard')) {
    return "🛹 Longboarding is awesome! We do longboard sessions at Kaslod Crew. Want to know about our meetups or how to get started?";
  }
  
  return "I'm here to help with anything skateboarding related! Ask me about our hours, location, services, or just chat about skating! 🛹";
}

// Handle postback buttons
function handlePostback(senderId, payload) {
  console.log(`🔘 Postback received: ${payload}`);
  
  switch(payload) {
    case 'GET_STARTED':
      sendButtonTemplate(senderId);
      break;
    case 'SHOW_FAQS':
      sendQuickReply(senderId, "Here's what I can help you with! Click a button or just ask me anything about skating. 👇");
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
          text: "Welcome to Kaslod Crew! 🛹 I'm your AI skateboarding assistant. How can I help?",
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
  axios.post(`https://graph.facebook.com/v18.0/me/messages`, messageData, {
    params: { access_token: PAGE_ACCESS_TOKEN }
  })
  .then(() => {
    console.log('✅ Message sent successfully');
  })
  .catch(error => {
    console.error('❌ Failed to send message:', error.response?.data || error.message);
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Kaslod Crew Chatbot running on port ${PORT}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`🔐 Verify Token: ${VERIFY_TOKEN ? '✓ Set' : '✗ Missing'}`);
  console.log(`🔐 Page Token: ${PAGE_ACCESS_TOKEN ? '✓ Set' : '✗ Missing'}`);
  console.log(`🤖 Gemini API Key: ${GEMINI_API_KEY && GEMINI_API_KEY !== 'undefined' ? '✓ Set' : '✗ Missing'}`);
  console.log(`🔗 Webhook: https://facebook-chatbot-5mpc.onrender.com/webhook`);
  console.log(`${'='.repeat(60)}\n`);
});

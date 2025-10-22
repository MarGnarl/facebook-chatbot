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

// Using Gemini 2.0 Flash
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Enhanced Business Context with Multilingual Support
const BUSINESS_CONTEXT = `You are a friendly multilingual skateboarding assistant for Kaslod Crew in Maasin City, Southern Leyte, Philippines.

BUSINESS DETAILS:
- Name: Kaslod Crew
- Hours: 8AM - 5PM
- Location: Maasin City, Southern Leyte, Philippines
- Services: Custom skateboard rides, crew meetups, skating sessions, longboarding, hangouts
- Contact: kaslodcrew@gmail.com, Facebook: facebook.com/kaslodcrew

CREW MEMBERS (Facebook Profiles):
- Paul Sebastian Macutay (pongpong): https://www.facebook.com/paulsebastian.macutay
- Ethan Craig (Men): https://www.facebook.com/ethan.craig.351
- Joseph Delatorre (Jah): https://www.facebook.com/joseph.delatorre.99260
- Jul Alfred Cristobal: https://www.facebook.com/julcristobal
- Sam Christian (Mas): https://www.facebook.com/sam.christian.158923
- Marion Dave (Yown): https://www.facebook.com/warion.poortweny.420/

LONGBOARDING EXPERTISE:
We specialize in:
- Longboard cruising and carving
- Downhill longboarding
- Freestyle longboard tricks
- Longboard racing
- Board maintenance and customization
- Safety gear recommendations
- Best spots for longboarding in Southern Leyte

MULTILINGUAL SUPPORT:
- Detect the user's language and respond in the same language
- Support English, Filipino, Cebuano, Spanish, French, German, Japanese, Korean, Chinese
- Use appropriate emojis and cultural references
- Be friendly and welcoming to international users

INSTRUCTIONS:
1. Respond in the same language as the user's message
2. Keep responses SHORT or LONG (1-3 sentences or more) but helpful
3. Use emojis occasionally 🛹🤙
4. If you don't know specific details, suggest contacting us directly
5. Be enthusiastic about skateboarding and longboarding
6. Mention crew members when relevant
7. For technical longboarding questions, provide detailed advice
8. Always stay in character as a skateboarding crew assistant
9. Mention spots for longboarding

LONGBOARD SPOT:
1. Danao Camp Site
2. Guinabonan
3. Basak Rizal Maasin City
4. Can-iwan
5. Lomboy
6. Baugo
7. Lonoy
8. Bagtican
9. Batu - 1
10. Batu - 2
11. Matinao
12. Cagnituan 
13. Maria Clara Maasin City
14. Libhu
15. Hanginan 

IMPORTANT: If the user asks in a different language, respond in that same language.`;

// Enhanced FAQ with multilingual fallbacks
const faqs = {
  'hours': {
    en: '⏰ We\'re usually around from 8AM - 5PM! Catch us then.',
    fil: '⏰ Karaniwang nasa 8AM - 5PM kami! Abangan kami.',
    ceb: '⏰ Kasagarang naa mi gikan 8AM - 5PM! Abti mi.'
  },
  'location': {
    en: '📍 We roll around Maasin City, Southern Leyte, Philippines!',
    fil: '📍 Gumagala kami sa Maasin City, Southern Leyte, Philippines!',
    ceb: '📍 Naglibod mi sa Maasin City, Southern Leyte, Philippines!'
  },
  'contact': {
    en: '📧 Hit us up at warionramos@gmail.com or message us here!',
    fil: '📧 Mag-message sa warionramos@gmail.com o dito mismo!',
    ceb: '📧 Kontaka mi sa warionramos@gmail.com o dinhi mismo!'
  },
  'services': {
    en: '🛹 Kaslod Crew offers: Custom rides, crew meetups, skating sessions, longboarding lessons!',
    fil: '🛹 Nag-aalok ang Kaslod Crew: Custom rides, crew meetups, skating sessions, longboarding lessons!',
    ceb: '🛹 Naghatag ang Kaslod Crew: Custom rides, crew meetups, skating sessions, longboarding lessons!'
  },
  'pricing': {
    en: '💰 Wanna join the crew or get lessons? Message us for details!',
    fil: '💰 Gusto sumali sa crew o kumuha ng lessons? Message us for details!',
    ceb: '💰 Gusto mo apil sa crew o kuha lessons? Message us for details!'
  },
  'crew': {
    en: '👥 Our crew: Paul, Ethan, Joseph, Jul, Sam, Marion! Check our Facebook for more info! 🛹',
    fil: '👥 Ang aming crew: Paul, Ethan, Joseph, Jul, Sam, Marion! Check our Facebook for more info! 🛹',
    ceb: '👥 Among crew: Paul, Ethan, Joseph, Jul, Sam, Marion! Check our Facebook for more info! 🛹'
  },
  'longboarding': {
    en: '🛹 We LOVE longboarding! Cruising, downhill, dancing - we do it all! Ask us about techniques, gear, or best spots!',
    fil: '🛹 Mahal namin ang longboarding! Cruising, downhill, dancing - ginagawa namin lahat! Tanong lang about techniques, gear, or best spots!',
    ceb: '🛹 Gihigugma namo ang longboarding! Cruising, downhill, dancing - among gibuhat tanan! Pangutana about techniques, gear, or best spots!'
  }
};

// Language detection function
function detectLanguage(text) {
  const lowerText = text.toLowerCase();
  
  // Filipino/Tagalog detection
  if (lowerText.match(/(ako|ikaw|sila|kami|tayo|mo|ko|natin|ka|ba|po|opo|hindi|oo|sige|mabuhay)/)) {
    return 'fil';
  }
  
  // Cebuano/Bisaya detection
  if (lowerText.match(/(ako|ikaw|sila|kami|ato|imo|nako|nato|ka|ba|dili|oo|sige|bai|istorya)/)) {
    return 'ceb';
  }
  
  // Spanish detection
  if (lowerText.match(/(hola|gracias|por favor|buenos|días|noche|adiós|sí|no)/)) {
    return 'es';
  }
  
  // French detection
  if (lowerText.match(/(bonjour|merci|s'il vous|plaît|oui|non|au revoir)/)) {
    return 'fr';
  }
  
  // Japanese detection
  if (lowerText.match(/(こんにちは|ありがとう|すみません|はい|いいえ|おはよう)/)) {
    return 'ja';
  }
  
  // Korean detection
  if (lowerText.match(/(안녕|감사|합니다|네|아니요|주세요)/)) {
    return 'ko';
  }
  
  // Chinese detection
  if (lowerText.match(/(你好|谢谢|对不起|是的|不|请)/)) {
    return 'zh';
  }
  
  // German detection
  if (lowerText.match(/(hallo|danke|bitte|ja|nein|tschüss)/)) {
    return 'de';
  }
  
  return 'en'; // default to English
}

// Enhanced longboarding knowledge base
const LONGBOARDING_KNOWLEDGE = {
  'basics': {
    en: "🛹 Longboarding Basics: Start with a cruiser board, learn to push and footbrake first. Wear helmet & pads! We can teach you!",
    fil: "🛹 Longboarding Basics: Magsimula sa cruiser board, matutong mag-push at footbrake. Suot ang helmet & pads! Kami ang magtuturo!",
    ceb: "🛹 Longboarding Basics: Sugod sa cruiser board, kat-on og push ug footbrake. Sul-ob ug helmet & pads! Kami ang magtudlo!"
  },
  'tricks': {
    en: "🤙 Longboard Tricks: Start with carving, then learn sliding and dancing! We host workshops every weekend!",
    fil: "🤙 Longboard Tricks: Magsimula sa carving, pagkatapos matuto ng sliding at dancing! May workshops kami every weekend!",
    ceb: "🤙 Longboard Tricks: Sugod sa carving, unya kat-on og sliding ug dancing! Naay workshops every weekend!"
  },
  'gear': {
    en: "⚙️ Longboard Gear: We recommend Sector 9 or Loaded boards, Orangatang wheels, and Bones bearings. We can help you choose!",
    fil: "⚙️ Longboard Gear: Rekomendado namin ang Sector 9 o Loaded boards, Orangatang wheels, at Bones bearings. Tutulungan ka namin pumili!",
    ceb: "⚙️ Longboard Gear: Girekomenda namo ang Sector 9 o Loaded boards, Orangatang wheels, ug Bones bearings. Tabangan ka namo pagpili!"
  },
  'spots': {
    en: "📍 Best Spots: Maasin Boulevard for cruising, Tagnipa Road for downhill, City Plaza for dancing! Join us for sessions!",
    fil: "📍 Best Spots: Maasin Boulevard para sa cruising, Tagnipa Road para sa downhill, City Plaza para sa dancing! Sumama sa amin!",
    ceb: "📍 Best Spots: Maasin Boulevard para sa cruising, Tagnipa Road para sa downhill, City Plaza para sa dancing! Apil namo!"
  }
};

// Root route
app.get('/', (req, res) => {
  res.send('🛹 Kaslod Crew Chatbot with Gemini AI is running!');
});

// Privacy Policy route (keep your existing HTML)
app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html><html>...</html>`);
});

// Terms of Service route (keep your existing HTML)
app.get('/terms', (req, res) => {
  res.send(`<!DOCTYPE html><html>...</html>`);
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

// Enhanced message handler with retry logic
async function handleMessage(senderId, messageText) {
  console.log(`📨 Received message: "${messageText}" from ${senderId}`);
  
  const lowerText = messageText.toLowerCase();
  const detectedLanguage = detectLanguage(messageText);

  // Show typing indicator
  sendTypingIndicator(senderId, true);

  // Check for simple greetings in multiple languages
  const greetings = {
    en: /^(hi|hello|hey|sup|yo|what's up|howdy)$/i,
    fil: /^(kamusta|musta|hey|hoy)$/i,
    ceb: /^(kamusta|musta|hey|hoy|bai)$/i,
    es: /^(hola|buenos|días)$/i,
    fr: /^(bonjour|salut)$/i
  };

  let isGreeting = false;
  for (const [lang, pattern] of Object.entries(greetings)) {
    if (messageText.match(pattern)) {
      isGreeting = true;
      const greetingResponses = {
        en: "Hey there! 👋 Welcome to Kaslod Crew. I'm your multilingual skateboarding assistant! What would you like to know?",
        fil: "Kamusta! 👋 Welcome sa Kaslod Crew. Ako ang inyong multilingual skateboarding assistant! Ano ang gusto mong malaman?",
        ceb: "Kamusta! 👋 Welcome sa Kaslod Crew. Ako ang inyong multilingual skateboarding assistant! Unsay gusto nimo mahibal-an?",
        es: "¡Hola! 👋 Bienvenido a Kaslod Crew. ¡Soy tu asistente multilingüe de skateboarding! ¿Qué te gustaría saber?",
        fr: "Bonjour! 👋 Bienvenue à Kaslod Crew. Je suis votre assistant multilingue de skateboard! Que voudriez-vous savoir?"
      };
      sendQuickReply(senderId, greetingResponses[lang] || greetingResponses.en, detectedLanguage);
      return;
    }
  }

  // Try Gemini AI first with retry logic
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'undefined') {
    try {
      console.log('🤖 Calling Gemini AI...');
      const aiResponse = await getGeminiResponseWithRetry(messageText, 2); // 2 retries
      console.log('✅ AI Response:', aiResponse);
      sendQuickReply(senderId, aiResponse, detectedLanguage);
      return;
    } catch (error) {
      console.error('❌ Gemini AI failed after retries:', error.message);
      // Continue to fallback
    }
  } else {
    console.log('⚠️ Gemini API key not set, using fallback');
  }

  // Enhanced fallback with multilingual support
  const fallbackResponse = getEnhancedFallbackResponse(messageText, detectedLanguage);
  console.log('📋 Using fallback response:', fallbackResponse);
  sendQuickReply(senderId, fallbackResponse, detectedLanguage);
}

// Enhanced Gemini function with retry logic
async function getGeminiResponseWithRetry(userMessage, maxRetries = 2) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'undefined') {
    throw new Error('Gemini API key not configured');
  }

  const fullPrompt = `${BUSINESS_CONTEXT}\n\nUser asks: "${userMessage}"\n\nYour response (keep it SHORT and friendly, respond in user's language):`;

  const requestBody = {
    contents: [{
      parts: [{
        text: fullPrompt
      }]
    }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 150, // Slightly increased for multilingual
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

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🔄 Gemini API attempt ${attempt}/${maxRetries + 1}`);
      
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
      if (error.response && error.response.status === 503 && attempt <= maxRetries) {
        console.log(`⏳ Model overloaded, retrying in ${attempt * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }
      throw error;
    }
  }
}

// Enhanced multilingual fallback response
function getEnhancedFallbackResponse(messageText, language = 'en') {
  const lowerText = messageText.toLowerCase();

  // Check for thanks in multiple languages
  const thanksPatterns = {
    en: /thank|thanks|ty|cheers/i,
    fil: /salamat|salamat po/i,
    ceb: /salamat|salamat daan/i,
    es: /gracias/i,
    fr: /merci/i
  };

  for (const [lang, pattern] of Object.entries(thanksPatterns)) {
    if (lowerText.match(pattern)) {
      const responses = {
        en: "You're very welcome! 🙌 Anything else I can help with?",
        fil: "Walang anuman! 🙌 May iba pa ba akong matutulong?",
        ceb: "Walay sapayan! 🙌 Naay lain nga matabangan nako?",
        es: "¡De nada! 🙌 ¿Hay algo más en lo que pueda ayudar?",
        fr: "De rien! 🙌 Y a-t-il autre chose avec laquelle je peux vous aider?"
      };
      return responses[language] || responses.en;
    }
  }

  // Enhanced longboarding queries
  if (lowerText.includes('longboard') || lowerText.includes('long boarding')) {
    if (lowerText.includes('basic') || lowerText.includes('beginner') || lowerText.includes('start')) {
      return LONGBOARDING_KNOWLEDGE.basics[language] || LONGBOARDING_KNOWLEDGE.basics.en;
    }
    if (lowerText.includes('trick') || lowerText.includes('slide') || lowerText.includes('dance')) {
      return LONGBOARDING_KNOWLEDGE.tricks[language] || LONGBOARDING_KNOWLEDGE.tricks.en;
    }
    if (lowerText.includes('gear') || lowerText.includes('equipment') || lowerText.includes('board')) {
      return LONGBOARDING_KNOWLEDGE.gear[language] || LONGBOARDING_KNOWLEDGE.gear.en;
    }
    if (lowerText.includes('spot') || lowerText.includes('place') || lowerText.includes('location')) {
      return LONGBOARDING_KNOWLEDGE.spots[language] || LONGBOARDING_KNOWLEDGE.spots.en;
    }
    return faqs.longboarding[language] || faqs.longboarding.en;
  }

  // Crew member queries
  if (lowerText.includes('crew') || lowerText.includes('member') || lowerText.match(/(paul|ethan|joseph|jul|sam|marion)/i)) {
    return faqs.crew[language] || faqs.crew.en;
  }

  // Check FAQ keywords
  for (const [key, translations] of Object.entries(faqs)) {
    if (lowerText.includes(key)) {
      return translations[language] || translations.en;
    }
  }

  // Default multilingual response
  const defaultResponses = {
    en: "I'm here to help with anything skateboarding related! Ask me about our hours, location, services, crew members, or just chat about skating! 🛹",
    fil: "Nandito ako para tumulong sa lahat ng bagay tungkol sa skateboarding! Magtanong ka about sa oras, lokasyon, serbisyo, crew members, o kumustahan lang tungkol sa skating! 🛹",
    ceb: "Ania ko para motabang sa bisan unsa nga skateboarding! Pangutana bahin sa oras, location, services, crew members, o pakig-chat lang bahin sa skating! 🛹",
    es: "¡Estoy aquí para ayudar con todo lo relacionado con el skateboarding! ¡Pregúntame sobre nuestros horarios, ubicación, servicios, miembros del equipo o simplemente charla sobre el skate! 🛹",
    fr: "Je suis là pour aider avec tout ce qui concerne le skateboard! Demandez-moi nos heures, emplacement, services, membres de l'équipe ou discutez simplement de skate! 🛹"
  };

  return defaultResponses[language] || defaultResponses.en;
}

// Handle postback buttons
function handlePostback(senderId, payload) {
  console.log(`🔘 Postback received: ${payload}`);
  
  switch(payload) {
    case 'GET_STARTED':
      sendButtonTemplate(senderId);
      break;
    case 'SHOW_FAQS':
      sendQuickReply(senderId, "Here's what I can help you with! Click a button or just ask me anything about skating. 👇", 'en');
      break;
    case 'CONTACT_US':
      sendQuickReply(senderId, faqs.contact.en, 'en');
      break;
    default:
      sendQuickReply(senderId, "How can I help you today? 🛹", 'en');
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

// Enhanced send message with multilingual quick replies
function sendQuickReply(recipientId, messageText, language = 'en') {
  const quickReplyTitles = {
    en: {
      hours: "⏰ Hours",
      location: "📍 Location", 
      contact: "📧 Contact",
      services: "🛹 Services",
      crew: "👥 Crew",
      longboard: "🏄 Longboarding"
    },
    fil: {
      hours: "⏰ Oras",
      location: "📍 Lokasyon",
      contact: "📧 Kontak", 
      services: "🛹 Serbisyo",
      crew: "👥 Crew",
      longboard: "🏄 Longboarding"
    },
    ceb: {
      hours: "⏰ Oras",
      location: "📍 Location",
      contact: "📧 Kontak",
      services: "🛹 Serbisyo",
      crew: "👥 Crew", 
      longboard: "🏄 Longboarding"
    }
  };

  const titles = quickReplyTitles[language] || quickReplyTitles.en;

  const messageData = {
    recipient: { id: recipientId },
    message: {
      text: messageText,
      quick_replies: [
        {
          content_type: "text",
          title: titles.hours,
          payload: "HOURS"
        },
        {
          content_type: "text",
          title: titles.location,
          payload: "LOCATION"
        },
        {
          content_type: "text",
          title: titles.contact,
          payload: "CONTACT"
        },
        {
          content_type: "text",
          title: titles.services,
          payload: "SERVICES"
        },
        {
          content_type: "text",
          title: titles.crew,
          payload: "CREW"
        },
        {
          content_type: "text",
          title: titles.longboard,
          payload: "LONGBOARD"
        }
      ]
    }
  };
  callSendAPI(messageData);
}

// Send button template (keep your existing function)
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

// Call Facebook Send API (keep your existing function)
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
  console.log(`🌍 MULTILINGUAL SUPPORT: English, Filipino, Cebuano + more!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`🔐 Verify Token: ${VERIFY_TOKEN ? '✓ Set' : '✗ Missing'}`);
  console.log(`🔐 Page Token: ${PAGE_ACCESS_TOKEN ? '✓ Set' : '✗ Missing'}`);
  console.log(`🤖 Gemini API Key: ${GEMINI_API_KEY && GEMINI_API_KEY !== 'undefined' ? '✓ Set' : '✗ Missing'}`);
  console.log(`🔗 Webhook: https://facebook-chatbot-5mpc.onrender.com/webhook`);
  console.log(`${'='.repeat(60)}\n`);
});


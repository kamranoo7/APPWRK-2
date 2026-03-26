import multer from "multer";
import fs from "fs";
import User from "../models/User.js";
import { transcribeAudio, processWithLLM,sendConfirmationSMS } from "../services/llmService.js";

const upload = multer({ dest: "uploads/" });

let sessions = {};
let lastCallTime = {};

// ------------------ Twilio Incoming Call ------------------
export const handleIncomingCall = async (req, res) => {
  const callSid = req.body.CallSid;
  // Initialize session
  sessions[callSid] = { stage: "start", data: {} };

  // First welcome message (optional English)
  const reply = "Welcome to IFB Customer Care. Please say Hindi or English.";
  res.type("text/xml").send(`
    <Response>
      <Say language="en-US">${reply}</Say>
      <Gather input="speech" action="/voice/response" method="POST" timeout="5"/>
    </Response>
  `);
};

// ------------------ Twilio User Response ------------------
export const handleUserResponse = async (req, res) => {
  const { CallSid, SpeechResult, Digits } = req.body;
  const sessionId = CallSid;

  if (!sessions[sessionId]) {
    // Initialize session
    sessions[sessionId] = {
      data: {},
      lang: "en", // default
    };
  }

  const session = sessions[sessionId];

  try {
    // Get the user's answer from Twilio Speech or DTMF
    const userAnswer = SpeechResult || Digits || "";

    // Call your LLM or AI service
    const aiData = await processWithLLM(session, userAnswer);
    // aiData example: { nextQuestion: "CONFIRM", replyText: "..." }

    // Save answer to session data
    if (aiData.field) {
      session.data[aiData.field] = userAnswer;
    }

    // Check if conversation is complete
    if (aiData.nextQuestion === "CONFIRM") {
      // Save user data in MongoDB
      await User.create(session.data);

      // Send SMS confirmation via Twilio
      const smsMessage = session.lang === "hi"
        ? `धन्यवाद! आपकी रिक्वेस्ट सफलतापूर्वक दर्ज हो गई। IFB टीम जल्द ही आपसे संपर्क करेगी।`
        : `Thank you! Your request has been successfully recorded. Our IFB team will contact you soon.`;

        if (session.data.mobile) {
          
            // Don't await, just fire and forget
            sendConfirmationSMS(session.data.mobile, smsMessage)
              .then(() => console.log("SMS sent successfully"))
              .catch(err => console.error("SMS sending failed:", err));
          
        }

      // Optionally: generate TTS mp3 for Twilio call
      const ttsFileUrl = await generateTTSFile(smsMessage, sessionId);

      // Clean up session
      delete sessions[sessionId];

      // Respond to Twilio with <Say> or <Play> TTS
      return res.type("text/xml").send(`
        <Response>
          <Play>${ttsFileUrl}</Play>
        </Response>
      `);
    }

    // If conversation is not complete, ask next question
    return res.type("text/xml").send(`
      <Response>
        <Say language="${session.lang === "hi" ? "hi-IN" : "en-US"}">
          ${aiData.replyText}
        </Say>
      </Response>
    `);

  } catch (err) {
    console.error("Error in handleUserResponse:", err);
    return res.type("text/xml").send(`
      <Response>
        <Say>Sorry, something went wrong. Please try again later.</Say>
      </Response>
    `);
  }
};

// -----------


let chatSessions = {};

/**
 * Handle messages from web chat
 * Expects: { sessionId, message, lang }
 */
// Global object to track active chat sessions


/**
 * Handle messages from web chat
 * Expects: { sessionId, message }
 */
export const handleWebChat = async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId) {
    return res.status(400).json({ reply: "Session ID is required." });
  }

  // 1. Initialize session if it doesn't exist
  if (!chatSessions[sessionId]) {
    chatSessions[sessionId] = {
      data: {
        mobile: "",
        name: "",
        product: "",
        address: "",
        pincode: "",
        intent: ""
      },
      lang: "en", // Default, will be updated by LLM
    };
  }

  const session = chatSessions[sessionId];

  try {
    // 2. Process message with LLM
    // We pass the current session data so the LLM knows what it already has
    const aiData = await processWithLLM(message, session.data);

    // 3. Update Session State
    // Synchronize the language and any newly extracted fields
    if (aiData.language) session.lang = aiData.language;
    
    // Merge extracted data (mobile, name, etc.) into the persistent session
    session.data = { ...session.data, ...aiData };

    // 4. Check if conversation is finished
    if (aiData.isComplete === true || aiData.nextQuestion === "CONFIRM") {
      
      // Save the finalized data to MongoDB
      const newTicket = await User.create(session.data);

      // Prepare the SMS Content
      const smsMessage = session.lang === "hi"
        ? `धन्यवाद! आपकी रिक्वेस्ट (ID: ${newTicket._id.toString().slice(-6)}) दर्ज हो गई है। IFB टीम जल्द संपर्क करेगी।`
        : `Thank you! Your request (ID: ${newTicket._id.toString().slice(-6)}) has been recorded. IFB team will contact you soon.`;

      // 5. Send SMS to the extracted mobile number
      const customerMobile = session.data.mobile;

      if (customerMobile && customerMobile.length >= 10) {
        // Fire and forget SMS to avoid blocking the HTTP response
        sendConfirmationSMS(customerMobile, smsMessage)
          .then(() => console.log(`✅ SMS sent to customer: ${customerMobile}`))
          .catch(err => console.error(`❌ SMS failed for ${customerMobile}:`, err));
      } else {
        console.warn("⚠️ SMS skipped: No valid mobile number extracted in session.");
      }

      // 6. Clean up session and send final response
      delete chatSessions[sessionId];
      
      return res.json({ 
        reply: aiData.nextQuestion, 
        done: true, 
        summary: session.data,
        ticket: newTicket._id.toString().slice(-6) 
      });
    }

    // 7. Conversation Ongoing: Send next question
    return res.json({ 
      reply: aiData.nextQuestion, 
      done: false,
      currentData: session.data // Helpful for debugging frontend
    });

  } catch (err) {
    console.error("Critical Web Chat Error:", err);
    return res.status(500).json({ 
      reply: "माफी चाहते हैं, तकनीकी समस्या के कारण प्रक्रिया पूरी नहीं हो सकी।", 
      error: err.message 
    });
  }
};
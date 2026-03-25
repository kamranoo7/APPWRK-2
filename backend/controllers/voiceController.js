import multer from "multer";
import fs from "fs";
import User from "../models/User.js";
import { transcribeAudio, processWithLLM } from "../services/llmService.js";

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
  const callSid = req.body.CallSid;
  const userSpeech = req.body.SpeechResult || "";

  if (!sessions[callSid]) sessions[callSid] = { stage: "start", data: {} };
  const session = sessions[callSid];

  try {
    // Call LLM with current session data
    const aiData = await processWithLLM(userSpeech, session.data);

    // Update session with LLM response
    session.data = { ...session.data, ...aiData };
    session.lang = aiData.language || session.lang || "en";

    // First interaction (start stage) → switch to conversation stage
    if (session.stage === "start") {
      session.stage = "conversation";
    }

    // If LLM says CONFIRM → save to DB and end session
    if (aiData.nextQuestion === "CONFIRM") {
      await User.create(session.data);
      delete sessions[callSid];

      const thankYou = session.lang === "hi"
        ? "धन्यवाद! आपकी रिक्वेस्ट सफलतापूर्वक दर्ज हो गई है। IFB टीम जल्द संपर्क करेगी।"
        : "Thank you! Your request has been successfully recorded. IFB team will contact you soon.";

      return res.type("text/xml").send(`
        <Response>
          <Say language="${session.lang === "hi" ? "hi-IN" : "en-US"}">${thankYou}</Say>
        </Response>
      `);
    }

    // Ask the next question from LLM
    const nextQ = aiData.nextQuestion || (session.lang === "hi" ? "माफ़ कीजिए, कृपया फिर से बताएं।" : "Sorry, I did not get that. Please try again.");

    res.type("text/xml").send(`
      <Response>
        <Say language="${session.lang === "hi" ? "hi-IN" : "en-US"}">${nextQ}</Say>
        <Gather input="speech" action="/voice/response" method="POST" timeout="5"/>
      </Response>
    `);
  } catch (err) {
    console.error("Twilio handler error:", err);
    res.type("text/xml").send(`
      <Response>
        <Say language="en-US">Sorry, something went wrong. Please try again.</Say>
      </Response>
    `);
  }
};

// -----------

export const handleWebChat = [
  upload.single("audio"),
  async (req, res) => {
    const textInput = req.body.message || "";
    const sessionId = req.body.sessionId || "anon";

    if (!sessions[sessionId]) sessions[sessionId] = { data: {}, lang: null, stage: "start" };
    const s = sessions[sessionId];

    const now = Date.now();
    if (lastCallTime[sessionId] && now - lastCallTime[sessionId] < 1000) {
      return res.json({ reply: "Please wait..." });
    }
    lastCallTime[sessionId] = now;

    try {
      // 🚀 Intercept start command
      if (textInput.toLowerCase() === "start") {
        s.stage = "language";
        s.lang = "en"; // default, will be updated later
        return res.json({ reply: "Welcome to IFB Customer Care. Please say Hindi or English.", nextQuestion: "language" });
      }

      let text = textInput;

      if (req.file) {
        text = await transcribeAudio(req.file.path);
        fs.unlinkSync(req.file.path);
      }

      const aiData = await processWithLLM(text, s.data);

      s.data = { ...s.data, ...aiData };
      s.lang = aiData.language || s.lang || "en";

      if (aiData.nextQuestion === "CONFIRM") {
        await User.create(s.data);
        delete sessions[sessionId];
        return res.json({ reply: s.lang === "hi" ? "धन्यवाद! आपकी रिक्वेस्ट दर्ज हो गई।" : "Thank you! Your request has been recorded." });
      }

      const nextQ = aiData.nextQuestion || (s.lang === "hi" ? "माफ़ कीजिए, कृपया फिर से बताएं।" : "Sorry, I did not get that. Please try again.");
      return res.json({ reply: nextQ });

    } catch (err) {
      console.error(err);
      res.json({ reply: "Something went wrong" });
    }
  }
];
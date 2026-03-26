import React, { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #080a0f;
    --surface:  #111318;
    --surface2: #181c26;
    --border:   rgba(255,255,255,0.07);
    --accent:   #00e5ff;
    --accent2:  #7b61ff;
    --danger:   #ff4d6d;
    --success:  #00d68f;
    --warn:     #ffb347;
    --text:     #e4e8f0;
    --muted:    #5a6275;
    --fh: 'Syne', sans-serif;
    --fb: 'DM Sans', sans-serif;
  }

  html, body, #root { height: 100%; }

  body {
    font-family: var(--fb);
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }

  /* ── Layout ── */
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px 24px;
    background:
      radial-gradient(ellipse 70% 40% at 50% 0%,   rgba(0,229,255,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 50% 35% at 90% 90%,  rgba(123,97,255,0.05) 0%, transparent 55%),
      var(--bg);
    overflow: hidden;
  }

  /* ── Header ── */
  .hdr {
    width: 100%; max-width: 580px;
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 14px; flex-shrink: 0;
  }
  .hdr-logo {
    width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-size: 19px;
    box-shadow: 0 0 18px rgba(0,229,255,0.25);
  }
  .hdr-title { font-family: var(--fh); font-size: 1.1rem; font-weight: 800; letter-spacing: -.02em; }
  .hdr-sub   { font-size: .68rem; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin-top: 1px; }

  /* ── Progress ── */
  .progress {
    width: 100%; max-width: 580px;
    display: flex; gap: 4px; margin-bottom: 12px; flex-shrink: 0;
  }
  .prog-seg {
    flex: 1; height: 3px; border-radius: 2px;
    background: var(--surface2); transition: background .4s;
  }
  .prog-seg.done    { background: var(--accent); }
  .prog-seg.current { background: linear-gradient(90deg,var(--accent),var(--accent2)); animation: shimmer 1.6s infinite; }
  @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:.55} }

  /* ── Status ── */
  .status {
    width: 100%; max-width: 580px;
    display: flex; align-items: center; gap: 8px;
    padding: 7px 13px; margin-bottom: 12px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 9px; font-size: .78rem; color: var(--muted);
    flex-shrink: 0;
  }
  .sdot {
    width: 7px; height: 7px; border-radius: 50%;
    flex-shrink: 0; transition: background .3s;
  }
  .sdot.idle      { background: var(--success); }
  .sdot.listening { background: var(--accent);  box-shadow: 0 0 7px var(--accent);  animation: blink 1.1s infinite; }
  .sdot.speaking  { background: var(--accent2); box-shadow: 0 0 7px var(--accent2); animation: blink 1.1s infinite; }
  .sdot.error     { background: var(--danger); }
  @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }

  /* ── Chat ── */
  .chat {
    width: 100%; max-width: 580px;
    flex: 1; min-height: 0;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 10px;
    padding: 14px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; margin-bottom: 16px;
    scroll-behavior: smooth;
  }
  .chat::-webkit-scrollbar { width: 3px; }
  .chat::-webkit-scrollbar-thumb { background: var(--surface2); border-radius: 3px; }

  .empty {
    flex:1; display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    gap:8px; color:var(--muted); font-size:.82rem;
  }
  .empty-icon { font-size:2.2rem; opacity:.35; }

  /* ── Bubbles ── */
  .msg {
    display: flex; gap: 9px;
    animation: pop .22s ease; max-width: 90%;
  }
  @keyframes pop { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
  .msg.user { align-self:flex-end; flex-direction:row-reverse; }
  .msg.bot  { align-self:flex-start; }

  .av {
    width:28px; height:28px; border-radius:7px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:13px; margin-top:3px;
  }
  .msg.bot  .av { background:rgba(0,229,255,.08);  border:1px solid rgba(0,229,255,.18); }
  .msg.user .av { background:rgba(123,97,255,.08); border:1px solid rgba(123,97,255,.2); }

  .bub {
    padding:9px 13px; border-radius:13px;
    font-size:.845rem; line-height:1.6;
    white-space:pre-wrap;
  }
  .msg.bot  .bub { background:var(--surface2); border:1px solid var(--border); border-top-left-radius:3px; }
  .msg.user .bub { background:rgba(123,97,255,.18); border:1px solid rgba(123,97,255,.22); border-top-right-radius:3px; color:#cfc9ff; }
  .msg.done .bub { border-color:rgba(0,214,143,.28); background:rgba(0,214,143,.06); }

  .ts { font-size:.62rem; color:var(--muted); margin-top:3px; }
  .msg.bot .ts { text-align:left; }
  .msg.user .ts { text-align:right; }

  /* summary */
  .sumcard {
    margin-top:7px; padding:9px 11px;
    background:var(--bg); border:1px solid rgba(0,229,255,.12);
    border-radius:9px; font-size:.76rem;
    display:grid; grid-template-columns:auto 1fr; gap:3px 10px;
  }
  .sumcard .k { color:var(--muted); text-transform:capitalize; }
  .sumcard .v { color:var(--text); }

  /* ticket */
  .ticket {
    display:inline-flex; align-items:center; gap:5px;
    background:rgba(0,214,143,.09); border:1px solid rgba(0,214,143,.22);
    border-radius:6px; padding:3px 9px; font-size:.72rem;
    color:var(--success); font-family:var(--fh); font-weight:700;
    margin-top:7px;
  }

  /* live transcript */
  .live {
    width:100%; padding:7px 13px;
    background:rgba(0,229,255,.05); border:1px solid rgba(0,229,255,.12);
    border-radius:8px; font-size:.78rem; color:var(--accent);
    font-style:italic; display:flex; align-items:center; gap:7px;
    animation: pop .2s ease;
  }
  .ldot { width:5px;height:5px;border-radius:50%;background:var(--accent);animation:blink 1s infinite;flex-shrink:0; }

  /* ── Controls ── */
  .ctrl {
    width:100%; max-width:580px;
    display:flex; flex-direction:column; align-items:center; gap:10px;
    flex-shrink:0;
  }

  .mic {
    width:66px; height:66px; border-radius:50%; border:none;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    font-size:26px; outline:none; transition:transform .15s, box-shadow .2s;
    position:relative;
  }
  .mic.ready {
    background:linear-gradient(135deg,var(--accent),var(--accent2));
    box-shadow:0 0 0 0 rgba(0,229,255,.35), 0 4px 18px rgba(0,229,255,.25);
  }
  .mic.ready:hover { transform:scale(1.07); box-shadow:0 0 0 7px rgba(0,229,255,.12), 0 4px 22px rgba(0,229,255,.35); }
  .mic.on {
    background:linear-gradient(135deg,var(--danger),#ff8c42);
    animation:micpulse 1.5s infinite;
  }
  .mic.disabled { background:var(--surface2); cursor:not-allowed; opacity:.5; }
  .mic:active:not(.disabled) { transform:scale(.95); }
  @keyframes micpulse {
    0%  { box-shadow:0 0 0 0   rgba(255,77,109,.55); }
    70% { box-shadow:0 0 0 15px rgba(255,77,109,0);   }
    100%{ box-shadow:0 0 0 0   rgba(255,77,109,0);   }
  }

  .mic-lbl { font-size:.72rem; color:var(--muted); letter-spacing:.06em; text-transform:uppercase; }
`;

const STAGES = ["language","intent","mobile","product","name","pincode","issue","confirm"];
const fmt    = (d) => d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});

export default function App() {
  const [msgs,       setMsgs]       = useState([]);
  const [started,    setStarted]    = useState(false);
  const [listening,  setListening]  = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [liveText,   setLiveText]   = useState("");
  const [stage,      setStage]      = useState("start");
  const [done,       setDone]       = useState(false);
  const [hasError,   setHasError]   = useState(false);
  
  const speakSentences = async (text) => {
    // Split by common punctuation but keep the flow natural
    const sentences = text.match(/[^.!?;]+[.!?;]?/g) || [text];
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      
      await speak(trimmed);
      // Wait 300ms between sentences to simulate a human "breath"
      await new Promise(r => setTimeout(r, 300)); 
    }
  };
  const getVoice = (lang = "hi-IN") => {
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === lang && /google/i.test(v.name) && /neural/i.test(v.name));
    if (preferred) return preferred;
    return voices.find(v => v.lang === lang && /google/i.test(v.name)) || voices[0];
  };
  const formatNumberForSpeech = (text) => {
    return text.replace(/\b\d{4,}\b/g, (num) => num.split("").join(" "));
  };
  useEffect(() => {
    const loadVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);
  const chatRef  = useRef(null);
  const recRef   = useRef(null);
  const lastCall = useRef(0);

  // ── Fresh session ID every page load (no localStorage) ──────────────────────
  const sessionId = useRef("web-" + Date.now());

  // inject CSS once
  useEffect(() => {
    if (!document.getElementById("ifb-css")) {
      const s = document.createElement("style");
      s.id = "ifb-css"; s.textContent = STYLES;
      document.head.appendChild(s);
    }
  }, []);

  // auto-scroll
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, liveText]);

  const addMsg = (sender, text, extra = {}) =>
    setMsgs(p => [...p, { sender, text, time: new Date(), ...extra }]);
  const speak = useCallback((text) => new Promise(resolve => {
    setSpeaking(true);
    window.speechSynthesis.cancel();
  
    // Remove any accidental HTML/SSML tags that might be in the LLM response
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
    
    const formattedText = formatNumberForSpeech(cleanText);
    const u = new SpeechSynthesisUtterance(formattedText);
  
    // 2. Select the most natural voice available
    u.voice = getVoice("hi-IN");
    u.lang  = "hi-IN";
  
    // 3. Human-like prosody settings
    u.rate  = 0.95;       // Slightly slower than 1.0 feels more professional and clear
    u.pitch = 1.1;        // A tiny bit higher pitch sounds more "helpful"/friendly
    u.volume = 1;         
  
    u.onend = () => { 
      setSpeaking(false); 
      resolve(); 
    };

    u.onerror = (e) => {
      console.error("Speech error:", e);
      setSpeaking(false);
      resolve();
    };
  
    window.speechSynthesis.speak(u);
  }), []);
  const sendToBackend = useCallback(async (text) => {
    const now = Date.now();
    if (now - lastCall.current < 1200) return false;
    lastCall.current = now;
    setHasError(false);

    try {
      const res = await axios.post("http://localhost:5000/voice/web", {
        message: text,
        sessionId: sessionId.current,
      });
      const { reply, summary, done: isDone, ticket } = res.data;
      addMsg("bot", reply, { summary, ticket, done: isDone });
      if (isDone) setDone(true);
      await speakSentences(reply);
      return isDone ? "done" : "ok";
    } catch {
      const err = "कनेक्शन में समस्या है। माइक दबाकर फिर बोलें।";
      addMsg("bot", err);
      setHasError(true);
      await speak(err);
      return "error";
    }
  }, [speak]);

  const startRec = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { addMsg("bot", "Browser doesn't support speech recognition. Please use Chrome."); return; }

    window.speechSynthesis.cancel(); // stop any ongoing TTS before listening
    const rec = new SR();
    rec.lang = "hi-IN";
    rec.continuous = false;
    rec.interimResults = true;
    recRef.current = rec;

    rec.onstart  = () => { setListening(true); setLiveText(""); };
    rec.onend    = () => { setListening(false); setLiveText(""); };
    rec.onerror  = (e) => {
      setListening(false); setLiveText("");
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("Speech error:", e.error);
      }
    };

    rec.onresult = async (e) => {
      const interim = Array.from(e.results).map(r => r[0].transcript).join("");
      setLiveText(interim);

      if (e.results[e.results.length - 1].isFinal) {
        const final = e.results[e.results.length - 1][0].transcript;
        setLiveText("");
        if (!final || final.length < 1) return;

        addMsg("user", final);
        const result = await sendToBackend(final);

        // Only auto-restart on success — NOT on error or done
        if (result === "ok") {
          startRec(); // 🚀 instant listening
        }
      }
    };

    try { rec.start(); } catch { /* already started */ }
  }, [sendToBackend]);

  const handleStart = async () => {
    setStarted(true);
    setStage("language");
  
    // 1️⃣ Add welcome message immediately
    addMsg("bot", "Welcome to IFB Customer Care. Please select your preferred language: Hindi or English");
  
    // 2️⃣ Speak welcome message
    await speak("Welcome to IFB Customer Care. Please select your preferred language: Hindi or English");
  
    // 3️⃣ Start speech recognition
    startRec();
  };

  const handleMicToggle = () => {
    if (listening) {
      recRef.current?.stop();
    } else {
      startRec();
    }
  };

  const handleNewRequest = () => {
    window.speechSynthesis.cancel();
    recRef.current?.stop();
    sessionId.current = "web-" + Date.now(); // fresh session
    setMsgs([]); setStarted(false); setDone(false);
    setStage("start"); setHasError(false); setLiveText("");
    lastCall.current = 0;
  };

  // stage progress index
  const stageIdx = STAGES.indexOf(stage);

  const statusLabel = speaking ? "Speaking…" : listening ? "Listening…" : hasError ? "Error — tap mic to retry" : started ? "Idle — tap mic to speak" : "Ready to start";
  const statusType  = speaking ? "speaking" : listening ? "listening" : hasError ? "error" : "idle";

  return (
    <div className="app">
      {/* Header */}
      <div className="hdr">
        <div className="hdr-logo">🔵</div>
        <div>
          <div className="hdr-title">IFB Voice Assistant</div>
          <div className="hdr-sub">Customer Care · Hindi / English</div>
        </div>
      </div>

      {/* Progress bar */}
      {started && (
        <div className="progress">
          {STAGES.map((s, i) => (
            <div
              key={s}
              className={`prog-seg ${i < stageIdx ? "done" : i === stageIdx ? "current" : ""}`}
            />
          ))}
        </div>
      )}

      {/* Status */}
      <div className="status">
        <div className={`sdot ${statusType}`} />
        {statusLabel}
      </div>

      {/* Chat */}
      <div className="chat" ref={chatRef}>
        {msgs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎙️</div>
            <span>Press Start to begin your service request</span>
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className={`msg ${m.sender}${m.done ? " done" : ""}`}>
              <div className="av">{m.sender === "bot" ? "🤖" : "🧑"}</div>
              <div>
                <div className="bub">
                  {m.text}
                  {m.summary && (
                    <div className="sumcard">
                      {Object.entries(m.summary).map(([k, v]) => (
                        <React.Fragment key={k}>
                          <span className="k">{k}</span>
                          <span className="v">{v}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  {m.ticket && <div className="ticket">🎫 {m.ticket}</div>}
                </div>
                <div className="ts">{fmt(m.time)}</div>
              </div>
            </div>
          ))
        )}
        {liveText && (
          <div className="live"><div className="ldot"/>{liveText}</div>
        )}
      </div>

      {/* Controls */}
      <div className="ctrl">
        {!started ? (
          <>
            <button className="mic ready" onClick={handleStart}>▶</button>
            <span className="mic-lbl">Start Call</span>
          </>
        ) : done ? (
          <>
            <button className="mic ready" onClick={handleNewRequest}>🔄</button>
            <span className="mic-lbl">New Request</span>
          </>
        ) : (
          <>
            <button
              className={`mic ${speaking ? "disabled" : listening ? "on" : "ready"}`}
              onClick={speaking ? undefined : handleMicToggle}
              title={speaking ? "Bot is speaking…" : listening ? "Tap to stop" : "Tap to speak"}
            >
              {listening ? "⏹" : "🎙"}
            </button>
            <span className="mic-lbl">
              {speaking ? "Bot speaking…" : listening ? "Tap to stop" : "Tap to speak"}
            </span>
          </> 
        )}
      </div>
    </div>
  );
}

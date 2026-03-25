const express = require("express");
const router = express.Router();
const {
  handleIncomingCall,
  handleUserResponse,
  handleWebChat,
} = require("../controllers/voiceController");

router.post("/incoming", handleIncomingCall);
router.post("/response", handleUserResponse);
router.post("/web", handleWebChat);

router.get("/test", (req, res) => {
  res.json({ message: "Voice routes working ✅" });
});

module.exports = router;
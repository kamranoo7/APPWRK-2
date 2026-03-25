const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const bodyParser = require("body-parser");
require("dotenv").config();

const voiceRoutes = require("./routes/voiceRoutes");

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/voice", voiceRoutes);

app.get("/", (req, res) => {
  res.send("IFB Voice Bot Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

connectDB();
app.listen(PORT, () => {
  console.log(`Server   running on port ${PORT}`);
});
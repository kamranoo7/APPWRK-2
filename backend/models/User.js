const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  mobile: String,
  name: String,
  product: String,
  address: String,
  pincode: String,
  type: String,
});

module.exports = mongoose.model("User", userSchema);
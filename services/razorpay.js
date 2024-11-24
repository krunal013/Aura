// const crypto = require("crypto");
const Razorpay = require("razorpay");

// Use environment variables to keep sensitive data secure
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Replace with your environment variable for Key ID
  key_secret: process.env.RAZORPAY_KEY_SECRET, // Replace with your environment variable for Key Secret
});

module.exports = razorpayInstance;

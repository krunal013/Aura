const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const plm = require("passport-local-mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/aura");

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user", // Default role is 'user'
  },
  hasPaid: {
    type: Boolean,
    default: false, // By default, users haven't paid
  },
  paymentExpires: {
    type: Date, // New field to track payment expiration
  },
  profileimage: {
    type: String,
  },
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    lowercase: true,
    required: true,
    unique: true, // Ensures that emails are unique
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" }, // Reference to Category
  mobileNumber: {
    type: Number,
    required: false, // Optional field
    validate: {
      validator: function (v) {
        // Simple regex for validating mobile numbers
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid mobile number!`,
    },
  },
  otp: {
    type: Number,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  resetPasswordToken: String, // Add token for password reset
  resetPasswordExpires: Date, // Expiry time for token
  messages: [
    {
      sender: { type: String },
      message: { type: String },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  status: {
    type: String,
    enum: ["active", "deactivated"],
    default: "active", // Default status is 'active'
  },
  winner: {
    type: Number,
    default: 0,
  },
});

userSchema.plugin(plm);
const User = mongoose.model("User", userSchema);

module.exports = User;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const workSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  uname: {
    type: String,
    required: true,
    unique: true,
  },
  usermail: {
    type: String,
    lowercase: true,
    required: true,
  },
  usernumber: {
    type: String,
    required: false, // Optional field
    validate: {
      validator: function (v) {
        // Simple regex for validating mobile numbers
        return /^\+?[1-9]\d{1,14}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid mobile number!`,
    },
  },
  image: {
    type: String,
  },
  video: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  firstwinner: {
    type: Boolean,
    default: false,
  },
  secondwinner: {
    type: Boolean,
    default: false,
  },
  thirdwinner: {
    type: Boolean,
    default: false,
  },
  looser: {
    type: Boolean,
    default: true,
  },
  winnersDeclared: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  olddata: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["first", "second", "third", "loser"],
    default: "loser",
  },
});

module.exports = mongoose.model("Work", workSchema);

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

mongoose.connect("mongodb://127.0.0.1:27017/aura");

// Define Event schema with timestamps
const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description1: {
      type: String,
      required: true,
    },
    description2: {
      type: String,
      required: true,
    },
    description3: {
      type: String,
      required: true,
    },
    description4: {
      type: String,
      required: true,
    },
    price1: {
      type: Number,
      required: true,
    },
    price2: {
      type: Number,
      required: true,
    },
    price3: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
); // Enable timestamps

// Create the Event model
const Event = mongoose.model("Event", eventSchema);

module.exports = Event;

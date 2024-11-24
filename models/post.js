const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the Post Schema
const postSchema = new Schema({
  imagetext: {
    type: String,
  },
  image: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  className: {
    type: String,
    required: true,
  },
  // catagory: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "Category",
  // },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  likes: {
    type: Array,
    default: [],
  },
  downloads: {
    type: Number,
    default: 0,
  },
});

// Create the Post model using the Post schema
const Post = mongoose.model("Post", postSchema);

module.exports = Post;

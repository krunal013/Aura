const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const catSchema = new Schema({
  cname: {
    type: String, // Store a single category name as a string
    required: true,
    },
    
});

const Category = mongoose.model("Category", catSchema);

module.exports = Category;

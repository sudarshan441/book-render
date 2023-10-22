const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
    Name: { type: String, require: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    ImageUrl: { type: String, require:true,},
    ImageName: { type: String, require:true},
    Author: { type: String, require: true },
    Genre:{ type: String, require: true},
    Price: { type: String, require: true },
  },{versionKey: false});

const bookModel = mongoose.model("book", bookSchema);
module.exports = bookModel;
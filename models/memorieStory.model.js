const mongoose = require("mongoose");

const memorieStorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  story: { type: String, required: true },
  visitedLocation: { type: String, required: true },
  imageUrl: { type: String, required: true },
  visitedDate: { type: Date, required: true },
  isFavourite: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("MemoriesStory", memorieStorySchema);

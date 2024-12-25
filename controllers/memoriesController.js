const MemoriesStory = require("../models/memorieStory.model");
const fs = require("fs");
const path = require("path");

exports.addMemoryStory = async (req, res) => {
  const { title, story, visitedLocation, imageUrl, visitedDate } = req.body;
  const { userId } = req.user;

  if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
    return res.status(400).json({ error: true, message: "All fields are required" });
  }

  try {
    const newStory = new MemoriesStory({
      title,
      story,
      visitedLocation,
      imageUrl,
      visitedDate: new Date(parseInt(visitedDate)),
      userId,
    });
    await newStory.save();
    return res.status(201).json({ story: newStory, message: "Added successfully" });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

exports.getAllMemories = async (req, res) => {
  const { userId } = req.user;
  try {
    const stories = await MemoriesStory.find({ userId }).sort({ isFavourite: -1 });
    return res.status(200).json({ stories });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

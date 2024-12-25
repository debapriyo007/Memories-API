const express = require("express");
const { addMemoryStory, getAllMemories } = require("../controllers/memoriesController");
const { authenticateToken } = require("../utilities/authenticateToken");

const router = express.Router();

router.post("/add-memories-story", authenticateToken, addMemoryStory);
router.get("/get-all-stories", authenticateToken, getAllMemories);

module.exports = router;

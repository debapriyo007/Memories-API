require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const userRoutes = require("./routes/userRoutes");
const memoriesRoutes = require("./routes/memoriesRoutes");
const config = require("./config.json");

const app = express();

// Database Connection
mongoose.connect(config.connectionString,)
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection failed:", err));

// Middleware
app.use(express.json());
app.use(cors({ origin: "*" }));

// Routes
app.use("/api/user", userRoutes);
app.use("/api/memories", memoriesRoutes);

// Static Files
app.use("/uploads", express.static("uploads"));
app.use("/assets", express.static("assets"));

// Server Initialization
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

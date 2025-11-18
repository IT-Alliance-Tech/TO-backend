const path = require("path");

// Load .env FIRST
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const mongoose = require("mongoose");

// Debug
console.log("DEBUG db.js -> MONGO_URI:", !!process.env.MONGO_URI);

const MONGO_URI = process.env.MONGO_URI;

// Validate
if (!MONGO_URI || MONGO_URI.trim() === "") {
  console.error("MongoDB connection string is required");
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;

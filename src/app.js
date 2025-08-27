import express from "express";
import { createServer } from "node:http";
import { connectToServer } from "./controllers/socketManager.js";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.IO via your socketManager
const io = connectToServer(server);

// Use port from .env or default to 8000
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors()); // For production, replace '*' with your frontend URL
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Routes
app.use("/api/v1/users", userRoutes);

// Start server and connect to MongoDB
const start = async () => {
  try {
    const connectionDB = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${connectionDB.connection.host}`);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }
};

start();

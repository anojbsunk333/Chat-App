import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.routes.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// CORS - allow both local and production
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://chat-app-three-pi-78.vercel.app",
      process.env.FRONTEND_URL || "",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Root endpoint for development
app.get("/", (req, res) => {
  res.json({
    message: "Chat App Backend",
    mode: process.env.NODE_ENV || "development",
    endpoints: {
      auth: "/api/auth",
      messages: "/api/messages",
      health: "/api/health",
    },
  });
});

// Production static file serving
if (process.env.NODE_ENV === "production") {
  // Note: 'Frontend' with capital F (match your folder name)
  const frontendPath = path.join(__dirname, "..", "Frontend", "dist");

  console.log("Production mode - Serving frontend from:", frontendPath);

  // Serve static files
  app.use(express.static(frontendPath));

  // Handle SPA routing - all non-API routes go to index.html
  app.use((req, res) => {
    // Don't handle API routes here - they're already handled above
    if (req.path.startsWith("/api/")) {
      // This will only be reached if no API route matched
      return res.status(404).json({ error: "API endpoint not found" });
    }

    // Serve frontend for all other routes
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// Alternative: SIMPLER VERSION - Remove the problematic pattern entirely
// Instead of app.all("/api/*", ...), let Express handle 404 naturally

// Export app for Vercel serverless (must be default export)
export default app;

// Initialize database connection
connectDB();

// Start server for local development only
if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT}`);
    console.log(`Mode: development`);
  });
}

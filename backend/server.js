
import express from "express";
import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import ReferenceCodeGenerator from "./utils/referenceCodeGenerator.js";

// Initialize Express
const app = express();

const PORT = process.env.PORT || 1000;

// Reference Code Generator
const referenceGenerator = new ReferenceCodeGenerator();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Frontend directory
const frontendPath = path.join(__dirname, "../frontend");

// ======================================
// MIDDLEWARE
// ======================================

app.use(express.json({ limit: "20kb" }));

// Log every HTTP request
app.use((req, res, next) => {

  const start = Date.now();

  res.on("finish", () => {

    const duration = Date.now() - start;

    console.log(
      `[REQUEST] ${req.method} ${req.originalUrl}`
    );

    console.log(
      `[RESPONSE] Status: ${res.statusCode} | ${duration}ms`
    );

  });

  next();

});

// ======================================
// API HEALTH CHECK
// ======================================

app.get("/api/health", (req, res) => {

  res.status(200).json({
    status: "online",
    message: "CampusPass API is running!"
  });

});

// ======================================
// ENROLLMENT API
// ======================================

app.post("/api/enrollments", (req, res) => {

  const data = req.body;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({
      status: "Error",
      message: "Invalid enrollment data"
    });
  }

  // Basic validation
  const requiredFields = [
    "firstName",
    "lastName",
    "email",
    "mobile",
    "educationLevel",
    "studentType",
    "visitDate",
    "timeSlot"
  ];

  for (const field of requiredFields) {

    if (
      typeof data[field] !== "string" ||
      !data[field].trim()
    ) {
      return res.status(400).json({
        status: "Error",
        message: `Missing or invalid field: ${field}`
      });
    }

  }

  // Generate reference code
  const referenceCode = referenceGenerator.generate();

  console.log("Enrollment request received");
  console.log(`Generated reference: ${referenceCode}`);

  // Return response to frontend
  return res.status(201).json({
    status: "Success",
    message: "Enrollment request received (demo only; not saved)",
    referenceCode
  });

});

// ======================================
// SERVE FRONTEND
// ======================================

app.use(express.static(frontendPath));

// ======================================
// START SERVER
// ======================================

app.listen(PORT, "0.0.0.0", () => {

  console.log("================================");
  console.log("CampusPass Server Started");
  console.log(`Listening on port: ${PORT}`);
  console.log("================================");

});


import express from "express";
import cors from "cors";
import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import ReferenceCodeGenerator from "./utils/referenceCodeGenerator.js";

// ======================================
// INITIALIZE EXPRESS
// ======================================

const app = express();
const PORT = process.env.PORT || 1000;

const referenceGenerator = new ReferenceCodeGenerator();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.join(__dirname, "../frontend");

// ======================================
// CORS CONFIGURATION
// ======================================

// FRONTEND_ORIGIN = Your Vercel website URL
const allowedOrigins = [
  "https://webproject-ebon-nine.vercel.app",
  process.env.FRONTEND_ORIGIN,
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:1000",
  "http://localhost:3000"
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// ======================================
// MIDDLEWARE
// ======================================

app.use(express.json({ limit: "20kb" }));

// Request logging
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
// HEALTH CHECK
// ======================================

app.get("/api/health", (req, res) => {

  return res.status(200).json({
    status: "online",
    message: "CampusPass API is running!"
  });

});

// ======================================
// ENROLLMENT API
// ======================================

app.post("/api/enrollments", (req, res) => {

  const data = req.body;

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return res.status(400).json({
      status: "Error",
      message: "Invalid enrollment data"
    });
  }

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

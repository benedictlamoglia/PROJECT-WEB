
import express from "express";
import cors from "cors";
import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import ReferenceCodeGenerator from "./utils/referenceCodeGenerator.js";

// ======================================
// 1. INITIALIZE EXPRESS
// ======================================

const app = express();

const PORT = process.env.PORT || 1000;

const referenceGenerator = new ReferenceCodeGenerator();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.join(__dirname, "../frontend");

// ======================================
// 2. REQUEST LOGGING MIDDLEWARE
// ======================================

app.use((req, res, next) => {
  const start = Date.now();

  console.log(
    `[INCOMING] ${req.method} ${req.originalUrl}`
  );

  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      `[RESPONSE] ${req.method} ${req.originalUrl} | ` +
      `Status: ${res.statusCode} | ${duration}ms`
    );
  });

  next();
});

// ======================================
// 3. CORS CONFIGURATION
// ======================================

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
  allowedHeaders: ["Content-Type"],
  optionsSuccessStatus: 204
}));

// ======================================
// 4. JSON MIDDLEWARE
// ======================================

app.use(express.json({ limit: "20kb" }));

// ======================================
// 5. HEALTH CHECK
// ======================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "online",
    message: "CampusPass API is running!",
    timestamp: new Date().toISOString()
  });
});

// ======================================
// 6. ENROLLMENT API
// ======================================

app.post("/api/enrollments", (req, res) => {

  const data = req.body;

  // ====================================
  // VALIDATE REQUEST BODY
  // ====================================

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    console.log("[ERROR] Invalid request body");

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
      console.log(
        `[VALIDATION FAILED] Missing or invalid: ${field}`
      );

      return res.status(400).json({
        status: "Error",
        message: `Missing or invalid field: ${field}`
      });
    }
  }

  // ====================================
  // VALIDATE EDUCATION INFORMATION
  // ====================================

  const seniorHighGrades = [
    "Grade 11",
    "Grade 12"
  ];

  const seniorHighStrands = [
    "STEM",
    "ICT",
    "ABM",
    "HUMMS",
    "GAS",
    "TOURISM OPERATION"
  ];

  const collegePrograms = [
    "BSIT",
    "BSCS",
    "TOURISM",
    "BSBA",
    "BS PSYCHOLOGY"
  ];

  if (data.educationLevel === "Senior High School") {
    if (
      !seniorHighGrades.includes(data.gradeLevel) ||
      !seniorHighStrands.includes(data.strand)
    ) {
      return res.status(400).json({
        status: "Error",
        message: "Invalid grade level or strand"
      });
    }
  } else if (data.educationLevel === "College") {
    if (!collegePrograms.includes(data.program)) {
      return res.status(400).json({
        status: "Error",
        message: "Invalid college program"
      });
    }
  } else {
    return res.status(400).json({
      status: "Error",
      message: "Invalid education level"
    });
  }

  // ====================================
  // GENERATE REFERENCE CODE
  // ====================================

  const referenceCode = referenceGenerator.generate();

  // ====================================
  // LOG ENROLLMENT DETAILS
  // ====================================

  // Safe operational information for Render Logs.
  // Do not include real student names, contact
  // details, or free-text notes in production logs.

  const enrollmentLog = {
    event: "ENROLLMENT_RECEIVED",
    timestamp: new Date().toISOString(),

    referenceCode,

    educationLevel: data.educationLevel,
    gradeLevel: data.gradeLevel || null,
    strand: data.strand || null,
    program: data.program || null,
    studentType: data.studentType,

    visitDate: data.visitDate,
    timeSlot: data.timeSlot,

    notesProvided:
      typeof data.notes === "string" &&
      data.notes.trim().length > 0
  };

  console.log("====================================");
  console.log("NEW CAMPUSPASS ENROLLMENT");
  console.log("====================================");

  console.log(JSON.stringify(enrollmentLog, null, 2));

  // Optional: full form logs for fictional test data.
  // NEVER enable while accepting real student data.
  if (process.env.LOG_FULL_TEST_DATA === "true") {
    console.log("TEST DATA ONLY - FULL FORM:");
    console.log(JSON.stringify(data, null, 2));
  }

  console.log("====================================");

  // ====================================
  // RESPONSE TO FRONTEND
  // ====================================

  return res.status(201).json({
    status: "Success",
    message: "Enrollment request received (demo only; not saved)",
    referenceCode
  });

});

// ======================================
// 7. SERVE FRONTEND WEBSITE
// ======================================

app.use(express.static(frontendPath));

// ======================================
// 8. NOT FOUND HANDLER FOR API ROUTES
// ======================================

app.use("/api", (req, res) => {
  return res.status(404).json({
    status: "Error",
    message: "API endpoint not found"
  });
});

// ======================================
// 9. START EXPRESS SERVER
// ======================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("====================================");
  console.log("CAMPUSPASS SERVER STARTED");
  console.log(`Listening on port: ${PORT}`);
  console.log("====================================");
});


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
// 2. CORS CONFIGURATION
// ======================================

const allowedOrigins = [
  "https://webproject-ebon-nine.vercel.app",
  process.env.FRONTEND_ORIGIN?.trim(),
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
// 3. MIDDLEWARE
// ======================================

app.use(express.json({ limit: "20kb" }));

// Log every incoming request
app.use((req, res, next) => {

  const start = Date.now();

  console.log(
    `[INCOMING] ${req.method} ${req.originalUrl}`
  );

  res.on("finish", () => {

    const duration = Date.now() - start;

    console.log(
      `[RESPONSE] ${req.method} ${req.originalUrl}`
    );

    console.log(
      `Status: ${res.statusCode} | Duration: ${duration}ms`
    );

  });

  next();

});

// ======================================
// 4. HEALTH CHECK
// ======================================

app.get("/api/health", (req, res) => {

  return res.status(200).json({
    status: "online",
    message: "CampusPass API is running!",
    timestamp: new Date().toISOString()
  });

});

// ======================================
// 5. VALIDATION CONFIGURATION
// ======================================

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

const studentTypes = [
  "New student",
  "Transferee",
  "Returning"
];

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

  // ====================================
  // REQUIRED FIELDS
  // ====================================

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
        `[VALIDATION ERROR] Invalid field: ${field}`
      );

      return res.status(400).json({
        status: "Error",
        message: `Missing or invalid field: ${field}`
      });

    }

  }

  // ====================================
  // VALIDATE STUDENT TYPE
  // ====================================

  if (!studentTypes.includes(data.studentType)) {

    return res.status(400).json({
      status: "Error",
      message: "Invalid student type"
    });

  }

  // ====================================
  // VALIDATE EDUCATION LEVEL
  // ====================================

  if (data.educationLevel === "Senior High School") {

    if (!seniorHighGrades.includes(data.gradeLevel)) {

      return res.status(400).json({
        status: "Error",
        message: "Invalid grade level"
      });

    }

    if (!seniorHighStrands.includes(data.strand)) {

      return res.status(400).json({
        status: "Error",
        message: "Invalid strand"
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

  const dateReceived = new Date().toISOString();

  // ====================================
  // LOG ENROLLMENT DETAILS
  // ====================================

  // Full identifying information is logged
  // ONLY when explicitly enabled for
  // fictional test submissions.

  const fullTestLogging =
    process.env.LOG_FULL_TEST_DATA === "true";

  // Prevent newline/control-character log injection.
  const display = (value) => {

    if (value === null || value === undefined || value === "") {
      return "N/A";
    }

    return String(value)
      .replace(/[\x00-\x1f\x7f]/g, " ")
      .slice(0, 300);

  };

  console.log("");
  console.log("============================================");
  console.log("          CAMPUSPASS ENROLLMENT");
  console.log("============================================");

  console.log("Reference Code:", referenceCode);
  console.log("Date Received:", dateReceived);
  console.log("Request Status: ACCEPTED - DEMO ONLY");

  if (fullTestLogging) {

    console.log("");
    console.log("----------- STUDENT DETAILS -----------");

    console.log("First Name:", display(data.firstName));
    console.log("Middle Name:", display(data.middleName));
    console.log("Last Name:", display(data.lastName));

    console.log("Email Address:", display(data.email));
    console.log("Mobile Number:", display(data.mobile));

  } else {

    console.log("");
    console.log("Student information: [REDACTED]");

  }

  console.log("");
  console.log("---------- EDUCATION DETAILS ----------");

  console.log(
    "Education Level:",
    display(data.educationLevel)
  );

  console.log(
    "Grade Level:",
    display(data.gradeLevel)
  );

  console.log(
    "Strand:",
    display(data.strand)
  );

  console.log(
    "College Program:",
    display(data.program)
  );

  console.log(
    "Student Type:",
    display(data.studentType)
  );

  console.log("");
  console.log("---------- VISIT SCHEDULE ------------");

  console.log(
    "Visit Date:",
    display(data.visitDate)
  );

  console.log(
    "Time Slot:",
    display(data.timeSlot)
  );

  if (fullTestLogging) {

    console.log(
      "Additional Notes:",
      display(data.notes)
    );

  } else {

    console.log(
      "Additional Notes:",
      data.notes ? "[REDACTED]" : "None"
    );

  }

  console.log("");
  console.log("============================================");
  console.log("         ENROLLMENT REQUEST RECEIVED");
  console.log("============================================");
  console.log("");

  // ====================================
  // SEND RESPONSE TO FRONTEND
  // ====================================

  return res.status(201).json({
    status: "Success",
    message: "Enrollment request received (demo only; not saved)",
    referenceCode
  });

});

// ======================================
// 7. SERVE FRONTEND
// ======================================

// Makes the frontend available through
// the same Render website as the backend.

app.use(express.static(frontendPath));

// ======================================
// 8. API NOT FOUND HANDLER
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

  console.log("");
  console.log("============================================");
  console.log("          CAMPUSPASS SERVER");
  console.log("============================================");
  console.log("Status: ONLINE");
  console.log(`Listening on port: ${PORT}`);
  console.log("Express API: READY");
  console.log("============================================");
  console.log("");

});

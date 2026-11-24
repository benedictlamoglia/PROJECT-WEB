import express from "express";
import cors from "cors";
import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";

import ReferenceCodeGenerator from "./utils/referenceCodeGenerator.js";
import { initDatabase, isDatabaseConfigured, pool } from "./config/database.js";
import {
  createAdminToken,
  requireAdminAuth,
  validateAdminLogin,
} from "./utils/adminAuth.js";

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
  methods: ["GET", "POST", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
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
    timestamp: new Date().toISOString(),
    databaseConfigured: isDatabaseConfigured
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

/*
  DATABASE SEQUENCE GUIDE
  -----------------------
  Enrollment data is now stored in Postgres (Supabase).
  - Configure DATABASE_URL in .env (local) and Render Environment (production).
  - See backend/config/database.js for connection + table initialization.
  - initDatabase() runs at startup and ensures the `enrollments` table exists.
*/

// ======================================
// 6. ENROLLMENT API
// ======================================

app.post("/api/enrollments", async (req, res) => {

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

  /*
    DATABASE INSERT SEQUENCE
    ------------------------
    1. Request is validated above (same rules as before).
    2. A reference code and timestamp are generated.
    3. The enrollment is inserted into the `enrollments` table in Supabase/Postgres.
    4. The admin dashboard reads/updates rows from the same table via protected endpoints.
  */
  const insertQuery = `
    insert into enrollments (
      reference_code, date_received, checked,
      first_name, middle_name, last_name, email, mobile,
      education_level, grade_level, strand, program, student_type,
      visit_date, time_slot, notes
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
    )
    returning reference_code
  `;

  const values = [
    referenceCode,
    dateReceived,
    false,
    data.firstName,
    data.middleName || null,
    data.lastName,
    data.email,
    data.mobile,
    data.educationLevel,
    data.gradeLevel || null,
    data.strand || null,
    data.program || null,
    data.studentType,
    data.visitDate,
    data.timeSlot,
    data.notes || null
  ];

  try {
    await pool.query(insertQuery, values);
  } catch (error) {
    console.error("[DATABASE ERROR] Failed to insert enrollment:", error);
    return res.status(500).json({
      status: "Error",
      message: "Could not save enrollment to the database. Please check server/database configuration."
    });
  }

  // ====================================
  // SEND RESPONSE TO FRONTEND
  // ====================================

  return res.status(201).json({
    status: "Success",
    message: "Enrollment request saved successfully.",
    referenceCode
  });

});

// ======================================
// 6B. ADMIN AUTH & PROTECTED ENROLLMENT ENDPOINTS
// ======================================

// Admin login: validates credentials from environment variables and returns a signed token.
// Frontend stores token and sends: Authorization: Bearer <token>
app.post("/api/admin/login", (req, res) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    return res.status(400).json({
      status: "Error",
      message: "Username and password are required."
    });
  }

  try {
    const valid = validateAdminLogin(username, password);
    if (!valid) {
      return res.status(401).json({
        status: "Error",
        message: "Invalid admin username or password."
      });
    }

    const token = createAdminToken(username);
    return res.status(200).json({
      status: "Success",
      token,
      admin: { username }
    });
  } catch (error) {
    console.error("[AUTH ERROR] Admin login failed:", error);
    return res.status(500).json({
      status: "Error",
      message: error.message || "Admin login is not configured correctly."
    });
  }
});

const ENROLLMENT_SELECT_SQL = `
  select
    reference_code as "referenceCode",
    date_received as "dateReceived",
    checked,
    first_name as "firstName",
    middle_name as "middleName",
    last_name as "lastName",
    email,
    mobile,
    education_level as "educationLevel",
    grade_level as "gradeLevel",
    strand,
    program,
    student_type as "studentType",
    to_char(visit_date, 'YYYY-MM-DD') as "visitDate",
    time_slot as "timeSlot",
    notes
  from enrollments
`;

// List all enrollments for admin dashboard (protected)
app.get("/api/enrollments", requireAdminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${ENROLLMENT_SELECT_SQL} order by date_received desc`
    );

    return res.status(200).json({
      status: "Success",
      enrollments: rows
    });
  } catch (error) {
    console.error("[DATABASE ERROR] Failed to fetch enrollments:", error);
    return res.status(500).json({
      status: "Error",
      message: "Could not load enrollments from the database."
    });
  }
});

// Mark an enrollment as checked/pending (protected)
app.patch("/api/enrollments/:referenceCode/check", requireAdminAuth, async (req, res) => {
  const { referenceCode } = req.params;
  const requestedChecked = req.body?.checked;

  const useExplicitValue = typeof requestedChecked === "boolean";
  const query = useExplicitValue
    ? `update enrollments
       set checked = $2
       where reference_code = $1
       returning
         reference_code as "referenceCode",
         date_received as "dateReceived",
         checked,
         first_name as "firstName",
         middle_name as "middleName",
         last_name as "lastName",
         email,
         mobile,
         education_level as "educationLevel",
         grade_level as "gradeLevel",
         strand,
         program,
         student_type as "studentType",
         to_char(visit_date, 'YYYY-MM-DD') as "visitDate",
         time_slot as "timeSlot",
         notes`
    : `update enrollments
       set checked = not checked
       where reference_code = $1
       returning
         reference_code as "referenceCode",
         date_received as "dateReceived",
         checked,
         first_name as "firstName",
         middle_name as "middleName",
         last_name as "lastName",
         email,
         mobile,
         education_level as "educationLevel",
         grade_level as "gradeLevel",
         strand,
         program,
         student_type as "studentType",
         to_char(visit_date, 'YYYY-MM-DD') as "visitDate",
         time_slot as "timeSlot",
         notes`;

  const params = useExplicitValue ? [referenceCode, requestedChecked] : [referenceCode];

  try {
    const { rows } = await pool.query(query, params);
    const enrollment = rows[0];

    if (!enrollment) {
      return res.status(404).json({
        status: "Error",
        message: "Enrollment not found"
      });
    }

    return res.status(200).json({
      status: "Success",
      enrollment
    });
  } catch (error) {
    console.error("[DATABASE ERROR] Failed to update enrollment check status:", error);
    return res.status(500).json({
      status: "Error",
      message: "Could not update enrollment status in the database."
    });
  }
});

// ======================================
// 7. SERVE FRONTEND
// ======================================

// Makes the frontend available through
// the same Render website as the backend.

app.use(express.static(frontendPath));

app.use("/api", (req, res) => {

  return res.status(404).json({
    status: "Error",
    message: "API endpoint not found"
  });

});

// ======================================
// 8. START SERVER (after DB init)
// ======================================

async function startServer() {
  /*
    SUPABASE INTEGRATION SEQUENCE
    -----------------------------
    1. Set DATABASE_URL (Supabase connection string URI) in .env / Render env.
    2. Set ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_TOKEN_SECRET for admin login.
    3. Start server -> initDatabase() verifies connection and creates `enrollments` table if missing.
    4. Submit enrollment form -> row inserted in Supabase.
    5. Login at /admin.html -> view/check records from Supabase.
  */
  if (!isDatabaseConfigured) {
    console.error("");
    console.error("============================================");
    console.error("DATABASE CONFIGURATION REQUIRED");
    console.error("============================================");
    console.error("DATABASE_URL is missing.");
    console.error("Add your Supabase Postgres connection string to .env (local)");
    console.error("or Render Environment variables, then restart the server.");
    console.error("See backend/config/database.js and .env for setup comments.");
    console.error("============================================");
    console.error("");
    process.exit(1);
  }

  try {
    await initDatabase();
    console.log("[DATABASE] Connected and initialized successfully.");
  } catch (error) {
    console.error("[DATABASE] Failed to connect/initialize:", error);
    process.exit(1);
  }

  app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("============================================");
    console.log("          CAMPUSPASS SERVER");
    console.log("============================================");
    console.log("Status: ONLINE");
    console.log(`Listening on port: ${PORT}`);
    console.log("Express API: READY");
    console.log("Database: CONNECTED");
    console.log("============================================");
    console.log("");

  });
}

startServer();

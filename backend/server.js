
import express from "express";
import cors from "cors";
import "dotenv/config";
import ReferenceCodeGenerator from "./utils/referenceCodeGenerator.js";

const referenceGenerator =
  new ReferenceCodeGenerator();

const app = express();
const PORT = 1000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "School Enrollment API is running!"
  });

  console.log("endpoint is being used");
});

app.post("/api/enrollments", (req,res ) => {
  console.log("Enrollement recieved")

  console.log(req.body);

    const referenceCode =
    referenceGenerator.generate();

    console.log(`Reference code : ${referenceCode}`);

  res.status(201).json({
    status: "Success",
    message: "enrollement data received successfully",
    referenceCode: referenceCode,
    data: req.body,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

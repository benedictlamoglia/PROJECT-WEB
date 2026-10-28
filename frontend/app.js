
const APP_CONFIG = Object.freeze({
  totalSteps: 3,
  apiUrl: "https://project-web-1-qq6z.onrender.com/api/enrollments",
  seniorHighGrades: ["Grade 11", "Grade 12"],
  seniorHighStrands: [
    "STEM", "ICT", "ABM",
    "HUMMS", "GAS", "TOURISM OPERATION"
  ],
  collegePrograms: [
    "BSIT", "BSCS", "TOURISM",
    "BSBA", "BS PSYCHOLOGY"
  ],
  studentTypes: ["New student", "Transferee", "Returning"],
  stepLabels: [
    "Student details",
    "Preferred schedule",
    "Review and submit"
  ],
});

// STUDENT CLASS

class Student {
  constructor(data) {
    this.firstName = String(data.firstName ?? "").trim();
    this.middleName = String(data.middleName ?? "").trim();
    this.lastName = String(data.lastName ?? "").trim();
    this.email = String(data.email ?? "").trim();
    this.mobile = String(data.mobile ?? "").trim();
    this.educationLevel = data.educationLevel ?? "";
    this.gradeLevel = data.gradeLevel || null;
    this.strand = data.strand || null;
    this.program = data.program || null;
    this.studentType = data.studentType ?? "";
  }

  getFullName() {
    return [
      this.firstName,
      this.middleName,
      this.lastName
    ].filter(Boolean).join(" ");
  }

  getEducationLabel() {
    if (this.educationLevel === "Senior High School") {
      return `${this.gradeLevel} · ${this.strand}`;
    }

    return this.educationLevel === "College"
      ? this.program
      : this.educationLevel;
  }
}

// ENROLLMENT REQUEST CLASS

class EnrollmentRequest {
  constructor(student, data) {
    this.student = student;
    this.visitDate = data.visitDate ?? "";
    this.timeSlot = data.timeSlot ?? "";
    this.notes = String(data.notes ?? "").trim();
  }

  static parseLocalDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    const valid =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

    return valid ? date : null;
  }

  static formatDate(value) {
    const date = EnrollmentRequest.parseLocalDate(value);

    return date
      ? new Intl.DateTimeFormat("en-PH", {
          day: "numeric",
          month: "long",
          year: "numeric"
        }).format(date)
      : "Invalid date";
  }

  getScheduleLabel() {
    return `${EnrollmentRequest.formatDate(this.visitDate)} · ${this.timeSlot}`;
  }
}

// ENROLLMENT WIZARD CLASS

class EnrollmentWizard {
  constructor() {
    this.currentStep = 1;
    this.isSubmitting = false;

    const $ = (selector) => document.querySelector(selector);

    this.elements = {
      form: $("#enrollment-form"),
      firstName: $("#firstName"),
      educationLevel: $("#educationLevel"),
      seniorHighFields: $("#seniorHighFields"),
      collegeFields: $("#collegeFields"),
      gradeLevel: $("#gradeLevel"),
      strand: $("#strand"),
      program: $("#program"),
      visitDate: $("#visitDate"),
      error: $("#form-error"),
      backButton: $("#back-button"),
      nextButton: $("#next-button"),
      submitButton: $("#submit-button"),
      stepCounter: $("#step-counter"),
      stepDescription: $("#step-description"),
      progressFill: $("#progress-fill"),
      reviewList: $("#review-list"),
      consent: $("#demoConsent"),
      dialog: $("#success-dialog"),
      generatedCode: $("#generated-code"),
      receiptName: $("#receipt-name"),
      receiptEducation: $("#receipt-grade"),
      receiptSchedule: $("#receipt-schedule"),
      copyButton: $("#copy-code"),
      restartButton: $("#restart-button"),
    };

    this.bindEvents();
    this.setMinimumDate();
    this.updateEducationFields();
    this.renderStep();
  }

  // EVENT LISTENERS

  bindEvents() {
    this.elements.educationLevel.addEventListener(
      "change",
      () => this.updateEducationFields()
    );

    this.elements.nextButton.addEventListener(
      "click",
      () => this.goForward()
    );

    this.elements.backButton.addEventListener(
      "click",
      () => this.goToStep(this.currentStep - 1)
    );

    this.elements.form.addEventListener(
      "submit",
      (event) => this.handleSubmit(event)
    );

    this.elements.copyButton.addEventListener(
      "click",
      () => this.copyReferenceCode()
    );

    this.elements.restartButton.addEventListener(
      "click",
      () => this.restart()
    );
  }

  // GET FORM VALUES

  getFormValues() {
    return Object.fromEntries(
      new FormData(this.elements.form).entries()
    );
  }

  // EDUCATION FIELD VISIBILITY

  updateEducationFields() {
    const isSeniorHigh =
      this.elements.educationLevel.value === "Senior High School";

    const isCollege =
      this.elements.educationLevel.value === "College";

    this.elements.seniorHighFields.hidden = !isSeniorHigh;
    this.elements.collegeFields.hidden = !isCollege;

    for (const field of [
      this.elements.gradeLevel,
      this.elements.strand
    ]) {
      field.disabled = !isSeniorHigh;
      field.required = isSeniorHigh;

      if (!isSeniorHigh) {
        field.value = "";
      }
    }

    this.elements.program.disabled = !isCollege;
    this.elements.program.required = isCollege;

    if (!isCollege) {
      this.elements.program.value = "";
    }
  }

  // SET MINIMUM DATE

  setMinimumDate() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    this.elements.visitDate.min = `${year}-${month}-${day}`;
  }

  // ERROR HANDLING

  showError(message) {
    this.elements.error.textContent = message;
    this.elements.error.hidden = false;
  }

  clearError() {
    this.elements.error.textContent = "";
    this.elements.error.hidden = true;
  }

  rejectValue(message) {
    this.showError(message);
    return false;
  }

  // REQUIRED FIELD VALIDATION

  validateFields(selectors) {
    for (const selector of selectors) {
      const field = this.elements.form.querySelector(selector);

      if (
        !field ||
        !field.checkValidity() ||
        !String(field.value).trim()
      ) {
        this.showError(
          "Please complete the highlighted fields correctly before continuing."
        );

        field?.reportValidity();
        field?.focus();

        return false;
      }
    }

    return true;
  }

  // VALIDATE STUDENT DETAILS

  validateStudentDetails() {
    const selectors = [
      "#firstName",
      "#lastName",
      "#email",
      "#mobile",
      "#educationLevel",
      'input[name="studentType"]:checked'
    ];

    const level = this.elements.educationLevel.value;

    if (level === "Senior High School") {
      selectors.push("#gradeLevel", "#strand");
    }

    if (level === "College") {
      selectors.push("#program");
    }

    if (!this.validateFields(selectors)) {
      return false;
    }

    const values = this.getFormValues();

    if (!APP_CONFIG.studentTypes.includes(values.studentType)) {
      return this.rejectValue("Choose a valid enrollment type.");
    }

    if (level === "Senior High School") {
      if (
        !APP_CONFIG.seniorHighGrades.includes(values.gradeLevel) ||
        !APP_CONFIG.seniorHighStrands.includes(values.strand)
      ) {
        return this.rejectValue("Choose a valid grade and strand.");
      }
    } else if (level === "College") {
      if (!APP_CONFIG.collegePrograms.includes(values.program)) {
        return this.rejectValue("Choose a valid college program.");
      }
    } else {
      return this.rejectValue("Choose Senior High School or College.");
    }

    return true;
  }

  // VALIDATE SCHEDULE

  validateSchedule() {
    if (!this.validateFields(["#visitDate", "#timeSlot"])) {
      return false;
    }

    this.setMinimumDate();

    const dateValue = this.elements.visitDate.value;
    const date = EnrollmentRequest.parseLocalDate(dateValue);

    if (!date || dateValue < this.elements.visitDate.min) {
      this.elements.visitDate.focus();

      return this.rejectValue(
        "Choose a valid date that is today or later."
      );
    }

    if ([0, 6].includes(date.getDay())) {
      this.elements.visitDate.focus();

      return this.rejectValue(
        "Choose a weekday, Monday through Friday."
      );
    }

    return true;
  }

  // WIZARD NAVIGATION

  goForward() {
    this.clearError();

    if (
      this.currentStep === 1 &&
      !this.validateStudentDetails()
    ) {
      return;
    }

    if (
      this.currentStep === 2 &&
      !this.validateSchedule()
    ) {
      return;
    }

    this.goToStep(this.currentStep + 1);
  }

  goToStep(step) {
    if (step < 1 || step > APP_CONFIG.totalSteps) {
      return;
    }

    this.currentStep = step;
    this.clearError();
    this.renderStep();

    document.querySelector("#registration-title")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  }

  // RENDER CURRENT STEP

  renderStep() {
    for (let step = 1; step <= APP_CONFIG.totalSteps; step++) {
      const active = step === this.currentStep;

      document.querySelector(`#step-${step}`).hidden = !active;

      const indicator = document.querySelector(
        `[data-step-indicator="${step}"]`
      );

      indicator.classList.toggle("is-active", active);

      indicator.classList.toggle(
        "is-complete",
        step < this.currentStep
      );

      if (active) {
        indicator.setAttribute("aria-current", "step");
      } else {
        indicator.removeAttribute("aria-current");
      }
    }

    const last = this.currentStep === APP_CONFIG.totalSteps;

    this.elements.backButton.hidden = this.currentStep === 1;
    this.elements.nextButton.hidden = last;
    this.elements.submitButton.hidden = !last;

    this.elements.stepCounter.textContent =
      `STEP 0${this.currentStep} OF 0${APP_CONFIG.totalSteps}`;

    this.elements.stepDescription.textContent =
      APP_CONFIG.stepLabels[this.currentStep - 1];

    this.elements.progressFill.style.width =
      `${(this.currentStep / APP_CONFIG.totalSteps) * 100}%`;

    if (last) {
      this.renderReview();
    }
  }

  // RENDER REVIEW SCREEN

  renderReview() {
    const values = this.getFormValues();
    const student = new Student(values);
    const enrollment = new EnrollmentRequest(student, values);

    const details = [
      ["Student", student.getFullName()],
      ["Email", student.email],
      ["Mobile number", student.mobile],
      ["Education level", student.educationLevel],
      ["Grade / strand / program", student.getEducationLabel()],
      ["Enrollment type", student.studentType],
      ["Preferred schedule", enrollment.getScheduleLabel()],
      ["Notes", enrollment.notes || "None"],
    ];

    const rows = details.map(([name, value]) => {
      const row = document.createElement("div");
      const label = document.createElement("dt");
      const description = document.createElement("dd");

      label.textContent = name;
      description.textContent = value;

      row.append(label, description);

      return row;
    });

    this.elements.reviewList.replaceChildren(...rows);
  }

  // SEND REQUEST TO EXPRESS BACKEND

  async sendEnrollment(payload) {
    const response = await fetch(APP_CONFIG.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Enrollment request failed."
      );
    }

    return result;
  }

  // SUBMIT ENROLLMENT

  async handleSubmit(event) {
    event.preventDefault();

    if (
      this.isSubmitting ||
      this.currentStep !== APP_CONFIG.totalSteps
    ) {
      return;
    }

    this.clearError();

    if (!this.validateStudentDetails()) {
      this.goToStep(1);
      this.validateStudentDetails();
      return;
    }

    if (!this.validateSchedule()) {
      this.goToStep(2);
      this.validateSchedule();
      return;
    }

    if (!this.elements.consent.checked) {
      this.elements.consent.focus();
      this.showError("Confirm your details before submitting.");
      return;
    }

    const values = this.getFormValues();

    const student = new Student(values);

    const enrollment = new EnrollmentRequest(
      student,
      values
    );

    const payload = {
      firstName: student.firstName,
      middleName: student.middleName || null,
      lastName: student.lastName,
      email: student.email,
      mobile: student.mobile,
      educationLevel: student.educationLevel,
      gradeLevel: student.gradeLevel,
      strand: student.strand,
      program: student.program,
      studentType: student.studentType,
      visitDate: enrollment.visitDate,
      timeSlot: enrollment.timeSlot,
      notes: enrollment.notes || null,
    };

    this.isSubmitting = true;
    this.elements.submitButton.disabled = true;
    this.elements.submitButton.textContent = "Submitting…";

    try {
      const result = await this.sendEnrollment(payload);

      const referenceCode = result.referenceCode;

      if (
        typeof referenceCode !== "string" ||
        !referenceCode.trim()
      ) {
        throw new Error(
          "The server did not return a reference code."
        );
      }

      this.elements.generatedCode.textContent = referenceCode;

      this.elements.receiptName.textContent =
        student.getFullName();

      this.elements.receiptEducation.textContent =
        student.getEducationLabel();

      this.elements.receiptSchedule.textContent =
        enrollment.getScheduleLabel();

      this.elements.copyButton.textContent = "Copy";

      this.elements.dialog.showModal();

    } catch (error) {
      console.error("CampusPass submission failed:", error);

      this.showError(
        "Could not submit the request. Check the server connection and try again."
      );

    } finally {
      this.isSubmitting = false;

      this.elements.submitButton.disabled = false;

      this.elements.submitButton.innerHTML =
        'Get reference <span aria-hidden="true">↗</span>';
    }
  }

  // COPY REFERENCE CODE

  async copyReferenceCode() {
    const code = this.elements.generatedCode.textContent;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(code);
      this.elements.copyButton.textContent = "Copied!";

    } catch {
      const selection = window.getSelection();
      const range = document.createRange();

      range.selectNodeContents(
        this.elements.generatedCode
      );

      selection.removeAllRanges();
      selection.addRange(range);

      this.elements.copyButton.textContent = "Select & copy";
    }
  }

  // RESTART WIZARD

  restart() {
    this.elements.dialog.close();
    this.elements.form.reset();
    this.updateEducationFields();
    this.setMinimumDate();
    this.goToStep(1);

    this.elements.copyButton.textContent = "Copy";
    this.elements.firstName.focus();
  }
}

// 3D PASS POINTER INTERACTION

function initializePassTilt() {
  const scene = document.querySelector("#pass-scene");

  if (
    !scene ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const area = scene.parentElement;

  area.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") {
      return;
    }

    const rect = area.getBoundingClientRect();

    const x =
      (event.clientX - rect.left) / rect.width - 0.5;

    const y =
      (event.clientY - rect.top) / rect.height - 0.5;

    scene.style.setProperty(
      "--tilt-y",
      `${x * 8}deg`
    );

    scene.style.setProperty(
      "--tilt-x",
      `${-y * 7}deg`
    );
  });

  area.addEventListener("pointerleave", () => {
    scene.style.setProperty("--tilt-x", "0deg");
    scene.style.setProperty("--tilt-y", "0deg");
  });
}

// START APPLICATION

new EnrollmentWizard();
initializePassTilt();

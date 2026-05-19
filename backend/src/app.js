const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/auth.routes");
const consentRoutes = require("./routes/consent.routes");
const courseRoutes = require("./routes/course.routes");
const demoRoutes = require("./routes/demo.routes");
const flagRoutes = require("./routes/flag.routes");
const provenanceRoutes = require("./routes/provenance.routes");
const submissionRoutes = require("./routes/submission.routes");
const telemetryRoutes = require("./routes/telemetry.routes");
const tutorRoutes = require("./routes/tutor.routes");
const env = require("./config/env");

const app = express();

const defaultDevOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
];

const allowedOrigins = env.corsAllowedOrigins.length > 0
  ? env.corsAllowedOrigins
  : env.nodeEnv === "production"
    ? []
    : defaultDevOrigins;

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error("Origin not allowed by CORS.");
    error.statusCode = 403;
    callback(error);
  }
};

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({
  verify: (req, res, buffer) => {
    if (buffer?.length) {
      req.rawBody = buffer.toString("utf8");
    }
  }
}));

app.get("/", (req, res) => {
  res.status(200).json({
    name: "Guardrail LMS API",
    status: "ok",
    health: "/health"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/flags", flagRoutes);
app.use("/api/provenance", provenanceRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/tutor", tutorRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error.";

  if (error.code === "23505") {
    statusCode = 409;
    message = "A record with that value already exists.";
  }

  if (error.code === "23503") {
    statusCode = 400;
    message = "The request references a related record that does not exist.";
  }

  res.status(statusCode).json({ message });
});

module.exports = app;

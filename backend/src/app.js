const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/auth.routes");
const consentRoutes = require("./routes/consent.routes");
const courseRoutes = require("./routes/course.routes");
const demoRoutes = require("./routes/demo.routes");
const telemetryRoutes = require("./routes/telemetry.routes");

const app = express();
const frontendDir = path.join(__dirname, "..", "..", "frontend");

app.use(helmet());
app.use(cors());
app.use(express.json({
  verify: (req, res, buffer) => {
    if (buffer?.length) {
      req.rawBody = buffer.toString("utf8");
    }
  }
}));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use(express.static(frontendDir));

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

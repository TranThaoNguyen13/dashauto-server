const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ message: "DashAuto Server is running" });
});
app.post("/api/test-post", (req, res) => {
  res.json({ ok: true, body: req.body });
});
// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/reports", require("./routes/report.routes"));
app.use("/api/alerts", require("./routes/alert.routes"));
app.use("/api/workflows", require("./routes/workflow.routes"));
app.use("/api/orders", require("./routes/order.routes"));
app.use("/api/products", require("./routes/product.routes"));
module.exports = app;

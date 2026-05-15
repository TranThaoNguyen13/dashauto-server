const express = require("express");
const router = express.Router();
const automationController = require("../controllers/automation.controller");

router.post("/reports/generate", automationController.generateReport);
router.post("/reports/save", automationController.saveReport);
router.post("/workflow-logs", automationController.saveWorkflowLog);
router.get("/orders/hourly-stats", automationController.getHourlyOrdersStats);
router.post("/alerts", automationController.createAlert);

module.exports = router;

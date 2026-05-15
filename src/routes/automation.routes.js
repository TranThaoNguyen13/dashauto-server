const express = require("express");
const router = express.Router();
const automationController = require("../controllers/automation.controller");

router.post("/reports/generate", automationController.generateReport);
router.post("/reports/analyze", automationController.analyzeReport);
router.post("/reports/save", automationController.saveReport);
router.post("/workflow-logs", automationController.saveWorkflowLog);
router.get("/orders/hourly-stats", automationController.getHourlyOrdersStats);
router.post("/orders", automationController.createOrder);
router.get("/revenue/comparison", automationController.getRevenueComparison);
router.get("/alerts/open", automationController.getOpenAlert);
router.post("/alerts", automationController.createAlert);
router.patch("/alerts/:id", automationController.updateAlert);

module.exports = router;

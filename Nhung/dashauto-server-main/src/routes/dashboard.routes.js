const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/stats", dashboardController.getStats);
router.get("/revenue", dashboardController.getRevenue);
router.get("/top-products", dashboardController.getTopProducts);
router.get("/kpi", dashboardController.getKpi);

module.exports = router;

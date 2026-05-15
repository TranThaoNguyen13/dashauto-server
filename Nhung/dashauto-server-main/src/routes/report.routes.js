const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/", reportController.list);

module.exports = router;

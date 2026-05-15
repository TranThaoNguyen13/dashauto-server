const express = require("express");
const router = express.Router();
const workflowController = require("../controllers/workflow.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/summary", workflowController.getSummary);
router.get("/", workflowController.list);
router.post("/", workflowController.create);

module.exports = router;

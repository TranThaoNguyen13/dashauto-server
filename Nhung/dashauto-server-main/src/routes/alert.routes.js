const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alert.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/", alertController.list);
router.post("/", authorize("admin", "manager"), alertController.create);
router.patch("/:id/resolve", authorize("admin", "manager"), alertController.resolve);

module.exports = router;
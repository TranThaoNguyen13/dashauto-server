const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);
router.get("/", orderController.list);

module.exports = router;
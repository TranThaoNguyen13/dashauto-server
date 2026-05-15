const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);
router.get("/", productController.list);

module.exports = router;
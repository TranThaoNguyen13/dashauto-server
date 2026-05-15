const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.patch("/me/password", userController.changePassword);

router.use(authorize("admin"));

router.get("/summary", userController.summary);
router.get("/", userController.list);
router.post("/", userController.create);
router.patch("/:id", userController.update);
router.patch("/:id/password", userController.resetPassword);

module.exports = router;

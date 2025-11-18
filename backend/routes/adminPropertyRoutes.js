// backend/routes/adminPropertyRoutes.js
const express = require("express");
const router = express.Router();

// ensure this path matches the controller location
const adminController = require("../controllers/adminPropertyController");

// require adminAuth; if you don't have it yet, create a dev noop at backend/middlewares/adminAuth.js
let adminAuth;
try {
  adminAuth = require("../middlewares/adminAuth");
} catch (e) {
  adminAuth = (req, res, next) => next();
}

// attach route - ensure function exists on adminController
router.post("/create", adminAuth, adminController.adminCreateProperty);

module.exports = router;

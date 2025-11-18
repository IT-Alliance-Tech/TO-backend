const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const { userAuth } = require("../middlewares/roleCheck");
const userController = require("../controllers/userController");

// --------- PUBLIC ROUTES ---------
router.get("/properties", userController.getAllProperties);

// --------- PROTECTED ROUTES ---------
router.use(auth);
router.use(userAuth);

// Property routes
router.get("/properties/:id", userController.getPropertyById);

// Wishlist routes
router.post("/wishlist", userController.addToWishlist);
router.get("/wishlist", userController.getUserWishlist);
router.delete("/wishlist", userController.removeFromWishlist);

// Booking routes
router.post("/bookings", userController.bookSiteVisit);
router.get("/bookings", userController.getUserBookings);

// Payment routes
router.post("/unlock-contact", userController.unlockOwnerContact);

// --- NOTE ---
// Subscription / user-CRUD routes were removed here because
// userController does not export create/list/get/update/remove/getAll.
// If you have a separate controller for subscriptions (e.g. subscriptionController),
// import it and re-add those routes pointing to that controller.

// Example (if subscription controller exists):
// const subscriptionController = require("../controllers/subscriptionController");
// router.post("/", subscriptionController.create);
// router.get("/", subscriptionController.list);
// router.get("/:id", subscriptionController.get);
// router.put("/:id", subscriptionController.update);
// router.delete("/:id", subscriptionController.remove);

module.exports = router;

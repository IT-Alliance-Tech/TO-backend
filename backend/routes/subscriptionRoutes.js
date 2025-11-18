// routes/userSubscriptions.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/userSubscriptionController");

// quick health check (temporary; remove later)
router.get("/_ping", (req, res) =>
  res.json({ ok: true, msg: "user-subscriptions router alive" })
);

// Specific/convenience routes FIRST (no param collisions)
router.post("/subscribe", ctrl.subscribe);
router.get("/user/:userId/active", ctrl.getActiveForUser);
router.get("/active/:userId", ctrl.getActiveForUser);

// Actions tied to a specific user-subscription (use-view, end, upgrade)
router.post("/:id/use-view", ctrl.useView);
router.put("/:id/end", ctrl.endSubscription);
router.put("/:id/upgrade", ctrl.upgradeSubscription);

// Core CRUD LAST (so /:id doesn't shadow other routes)
router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;

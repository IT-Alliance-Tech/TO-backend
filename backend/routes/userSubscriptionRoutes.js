const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/userSubscriptionController");

// core CRUD
router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.get("/:id", ctrl.get);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

// convenience
router.get("/user/:userId/active", ctrl.getActiveForUser);

// use-view
router.post("/:id/use-view", ctrl.useView);

// subscribe, end, upgrade
router.post("/subscribe", ctrl.subscribe);
router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.get("/active/:userId", ctrl.getActiveForUser);
router.get("/:id", ctrl.get);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.put("/:id/end", ctrl.endSubscription);
router.put("/:id/upgrade", ctrl.upgradeSubscription);

module.exports = router;

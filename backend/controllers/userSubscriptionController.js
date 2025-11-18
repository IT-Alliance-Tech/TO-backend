const mongoose = require("mongoose");
const UserSubscription = require("../models/UserSubscription");
const User = require("../models/User");
const Subscription = require("../models/Subscription");

async function setUserCurrentSubscription(
  userId,
  userSubscriptionId = null,
  session = null
) {
  await User.findByIdAndUpdate(
    userId,
    { currentUserSubscription: userSubscriptionId },
    { session }
  );
}

/**
 * create (existing create) - expects full dates
 */
exports.create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      userId,
      subscriptionId,
      startDate,
      endDate,
      available,
      accessDate,
    } = req.body;
    if (!userId || !subscriptionId || !startDate || !endDate) {
      throw new Error(
        "userId, subscriptionId, startDate and endDate are required"
      );
    }
    const [user, subscription] = await Promise.all([
      User.findById(userId).session(session),
      Subscription.findById(subscriptionId).session(session),
    ]);
    if (!user) throw new Error("User not found");
    if (!subscription) throw new Error("Subscription not found");

    let startingAvailable = 0;
    if (typeof available !== "undefined" && available !== null)
      startingAvailable = Number(available);
    else if (typeof subscription.accessibleSlots === "number")
      startingAvailable = subscription.accessibleSlots;
    else startingAvailable = subscription.features?.views ?? 0;

    const us = new UserSubscription({
      userId,
      subscriptionId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      available: startingAvailable,
      accessDate: accessDate || {},
      accessLevel:
        UserSubscription.computeAccessLevelFromRemaining(startingAvailable),
    });

    us.active = us.computeActive(new Date());
    await us.save({ session });

    if (us.active) await setUserCurrentSubscription(userId, us._id, session);

    await session.commitTransaction();
    session.endSession();

    const populated = await UserSubscription.findById(us._id)
      .populate("subscriptionId", "name accessibleSlots price durationDays")
      .populate("userId", "name email");

    return res.status(201).json(populated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const list = await UserSubscription.find()
      .populate("userId", "name email")
      .populate("subscriptionId", "name price durationDays")
      .lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const us = await UserSubscription.findById(req.params.id)
      .populate("userId", "name email")
      .populate("subscriptionId", "name price")
      .exec();
    if (!us) return res.status(404).json({ error: "Not found" });
    return res.json(us);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const id = req.params.id;
    const payload = req.body;
    let us = await UserSubscription.findById(id).session(session);
    if (!us) throw new Error("Not found");

    if (payload.startDate) us.startDate = new Date(payload.startDate);
    if (payload.endDate) us.endDate = new Date(payload.endDate);
    if (payload.available) us.available = payload.available;
    if (payload.viewedProperties)
      us.viewedProperties = payload.viewedProperties;
    if (payload.accessDate) us.accessDate = payload.accessDate;
    if (typeof payload.active !== "undefined") us.active = !!payload.active;
    else us.active = us.computeActive(new Date());

    await us.save({ session });

    const user = await User.findById(us.userId).session(session);
    if (us.active) {
      await setUserCurrentSubscription(us.userId, us._id, session);
    } else {
      if (
        user &&
        user.currentUserSubscription &&
        user.currentUserSubscription.toString() === us._id.toString()
      ) {
        await setUserCurrentSubscription(us.userId, null, session);
      }
    }

    await session.commitTransaction();
    session.endSession();

    us = await UserSubscription.findById(id)
      .populate("userId", "name email")
      .populate("subscriptionId", "name price");

    return res.json(us);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const id = req.params.id;
    const us = await UserSubscription.findById(id).session(session);
    if (!us) throw new Error("Not found");

    const user = await User.findById(us.userId).session(session);
    if (
      user &&
      user.currentUserSubscription &&
      user.currentUserSubscription.toString() === us._id.toString()
    ) {
      await setUserCurrentSubscription(us.userId, null, session);
    }

    await UserSubscription.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ error: err.message });
  }
};

exports.getActiveForUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const now = new Date();
    const list = await UserSubscription.find({
      userId,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate("subscriptionId", "name price features")
      .lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.useView = async (req, res) => {
  try {
    const id = req.params.id;
    const { propertyId } = req.body;
    if (!propertyId)
      return res.status(400).json({ error: "propertyId required" });

    const us = await UserSubscription.findById(id);
    if (!us)
      return res.status(404).json({ error: "UserSubscription not found" });

    const updated = await us.usePropertyView(propertyId);

    if (!updated) {
      if (us.hasViewedProperty(propertyId)) {
        return res
          .status(409)
          .json({ error: "Property already viewed for this subscription" });
      }
      if (!us.active || us.available <= 0) {
        return res
          .status(403)
          .json({ error: "No remaining views or subscription not active" });
      }
      return res.status(400).json({ error: "Could not register view" });
    }

    return res.json({
      success: true,
      userSubscription: updated,
      remainingViews: updated.getRemainingViews
        ? updated.getRemainingViews()
        : updated.available,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Subscribe endpoint (atomic) - POST /api/user-subscriptions/subscribe
 * Body: { userId, subscriptionId, startDate?, endDate? }
 */
exports.subscribe = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      userId,
      subscriptionId,
      startDate,
      endDate: clientEndDate,
    } = req.body;
    if (!userId || !subscriptionId)
      throw new Error("userId and subscriptionId are required");

    const [user, plan] = await Promise.all([
      User.findById(userId).session(session),
      Subscription.findById(subscriptionId).session(session),
    ]);
    if (!user) throw new Error("User not found");
    if (!plan) throw new Error("Subscription plan not found");

    const start = startDate ? new Date(startDate) : new Date();
    let end;
    if (clientEndDate) {
      end = new Date(clientEndDate);
    } else if (typeof plan.durationDays === "number" && plan.durationDays > 0) {
      end = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    } else {
      end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const startingAvailable =
      typeof plan.accessibleSlots === "number"
        ? plan.accessibleSlots
        : plan.features?.views ?? 0;

    const us = new UserSubscription({
      userId: user._id,
      subscriptionId: plan._id,
      startDate: start,
      endDate: end,
      available: startingAvailable,
      viewedProperties: [],
      accessLevel:
        UserSubscription.computeAccessLevelFromRemaining(startingAvailable),
      active: start <= new Date() && new Date() <= end && startingAvailable > 0,
    });

    await us.save({ session });

    if (us.active) {
      await User.findByIdAndUpdate(
        user._id,
        { currentUserSubscription: us._id },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    const populated = await UserSubscription.findById(us._id)
      .populate("subscriptionId", "name accessibleSlots price durationDays")
      .populate("userId", "name email");

    return res.status(201).json(populated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ error: err.message });
  }
};

/**
 * End subscription - PUT /api/user-subscriptions/:id/end
 */
exports.endSubscription = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const id = req.params.id;
    const us = await UserSubscription.findById(id).session(session);
    if (!us) throw new Error("UserSubscription not found");

    const now = new Date();
    us.endDate = now;
    us.active = false;
    await us.save({ session });

    const user = await User.findById(us.userId).session(session);
    if (
      user &&
      user.currentUserSubscription &&
      user.currentUserSubscription.toString() === us._id.toString()
    ) {
      await User.findByIdAndUpdate(
        user._id,
        { currentUserSubscription: null },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    const populated = await UserSubscription.findById(id)
      .populate("subscriptionId", "name accessibleSlots price durationDays")
      .populate("userId", "name email");

    return res.json({ success: true, userSubscription: populated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Upgrade subscription - PUT /api/user-subscriptions/:id/upgrade
 * Body: { newSubscriptionId, inheritRemaining?: boolean }
 */
exports.upgradeSubscription = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const id = req.params.id;
    const { newSubscriptionId, inheritRemaining = true } = req.body;
    if (!newSubscriptionId) throw new Error("newSubscriptionId is required");

    const [us, newPlan] = await Promise.all([
      UserSubscription.findById(id).session(session),
      Subscription.findById(newSubscriptionId).session(session),
    ]);
    if (!us) throw new Error("UserSubscription not found");
    if (!newPlan) throw new Error("New subscription plan not found");

    const newPlanSlots =
      typeof newPlan.accessibleSlots === "number"
        ? newPlan.accessibleSlots
        : newPlan.features?.views ?? 0;

    let resultingAvailable;
    if (inheritRemaining)
      resultingAvailable = (us.available || 0) + newPlanSlots;
    else resultingAvailable = newPlanSlots;

    const now = new Date();
    const duration =
      typeof newPlan.durationDays === "number" && newPlan.durationDays > 0
        ? newPlan.durationDays
        : 30;
    const newEndDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

    us.subscriptionId = newPlan._id;
    us.available = resultingAvailable;
    us.startDate = now;
    us.endDate = newEndDate;
    us.accessLevel =
      UserSubscription.computeAccessLevelFromRemaining(resultingAvailable);
    us.active = now <= newEndDate && resultingAvailable > 0;

    await us.save({ session });

    const user = await User.findById(us.userId).session(session);
    if (!user) throw new Error("Associated user not found");

    if (us.active) {
      await User.findByIdAndUpdate(
        user._id,
        { currentUserSubscription: us._id },
        { session }
      );
    } else {
      if (
        user.currentUserSubscription &&
        user.currentUserSubscription.toString() === us._id.toString()
      ) {
        await User.findByIdAndUpdate(
          user._id,
          { currentUserSubscription: null },
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    const populated = await UserSubscription.findById(us._id)
      .populate("subscriptionId", "name accessibleSlots price durationDays")
      .populate("userId", "name email");

    return res.json({ success: true, userSubscription: populated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({ error: err.message });
  }
};

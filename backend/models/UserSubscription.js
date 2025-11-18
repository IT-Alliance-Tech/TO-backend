const mongoose = require("mongoose");
const { Schema } = mongoose;

const ViewedPropertySchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, required: true },
    viewedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const UserSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // available starts from subscription.accessibleSlots (number)
    available: { type: Number, required: true, default: 0 },

    // list of viewed properties to prevent double-view and keep timestamps
    viewedProperties: { type: [ViewedPropertySchema], default: [] },

    accessDate: { type: Schema.Types.Mixed, default: {} },

    // 'full'|'limited'|'none'
    accessLevel: {
      type: String,
      enum: ["full", "limited", "none"],
      default: "full",
    },

    // active boolean (true if currently active and available > 0)
    active: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * computeActive: active if within date range and available > 0
 */
UserSubscriptionSchema.methods.computeActive = function (asOf = new Date()) {
  return this.startDate <= asOf && asOf <= this.endDate && this.available > 0;
};

/**
 * computeAccessLevelFromRemaining
 */
UserSubscriptionSchema.statics.computeAccessLevelFromRemaining = function (
  remaining
) {
  if (remaining <= 0) return "none";
  if (remaining <= 10) return "limited";
  return "full";
};

UserSubscriptionSchema.methods.getRemainingViews = function () {
  return this.available;
};

UserSubscriptionSchema.methods.hasViewedProperty = function (propertyId) {
  return this.viewedProperties.some(
    (vp) => vp.propertyId.toString() === propertyId.toString()
  );
};

UserSubscriptionSchema.methods.isValid = function (asOf = new Date()) {
  return this.computeActive(asOf);
};

/**
 * usePropertyView(propertyId)
 * Atomic: uses findOneAndUpdate with conditions so concurrent calls do not double-decrement.
 * Returns the updated document (with new accessLevel/active) or null on failure.
 */
UserSubscriptionSchema.methods.usePropertyView = async function (propertyId) {
  const Model = this.constructor;

  const query = {
    _id: this._id,
    active: true,
    available: { $gte: 1 },
    "viewedProperties.propertyId": { $ne: mongoose.Types.ObjectId(propertyId) },
  };

  const update = {
    $inc: { available: -1 },
    $push: {
      viewedProperties: {
        propertyId: mongoose.Types.ObjectId(propertyId),
        viewedAt: new Date(),
      },
    },
  };

  const updated = await Model.findOneAndUpdate(query, update, {
    new: true,
  }).exec();

  if (!updated) {
    // failed because either already viewed, no available left, or not active
    return null;
  }

  const newAccessLevel = Model.computeAccessLevelFromRemaining(
    updated.available
  );
  const sets = { accessLevel: newAccessLevel };

  if (updated.available <= 0) sets.active = false;

  const final = await Model.findByIdAndUpdate(
    updated._id,
    { $set: sets },
    { new: true }
  ).exec();
  return final;
};

UserSubscriptionSchema.virtual("activeNumeric").get(function () {
  return this.active ? 1 : 0;
});

module.exports = mongoose.model("UserSubscription", UserSubscriptionSchema);

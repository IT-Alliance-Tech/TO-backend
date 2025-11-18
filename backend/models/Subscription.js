const mongoose = require("mongoose");
const { Schema } = mongoose;

const TimeWindowSchema = new Schema(
  {
    startTime: { type: String, default: null }, // "08:00"
    endTime: { type: String, default: null }, // "20:00"
  },
  { _id: false }
);

const SubscriptionSchema = new Schema(
  {
    name: { type: String, required: true },
    timeLabel: { type: String, default: "" }, // e.g., "Monthly"
    durationDays: { type: Number, default: 30 }, // numeric duration in days
    accessibleSlots: { type: Number, required: true, default: 0 }, // e.g., 16
    price: { type: Number, required: true, default: 0 },
    planStartDate: { type: Date, default: null },
    planEndDate: { type: Date, default: null },
    features: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

SubscriptionSchema.virtual("isTimeLimited").get(function () {
  return !!(this.planStartDate || this.planEndDate);
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);

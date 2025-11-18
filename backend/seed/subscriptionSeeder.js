// seed/subscriptionSeeder.js
const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
require("dotenv").config();

function withGST(basePrice, gstPercent = 18) {
  const gstAmount = Number(((basePrice * gstPercent) / 100).toFixed(2));
  const total = Number((basePrice + gstAmount).toFixed(2));
  return { basePrice, gstPercent, gstAmount, totalPrice: total };
}

async function seedSubscriptions() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("MONGO_URI not set in .env — set it and re-run.");
      process.exit(1);
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to DB");

    const plans = [
      {
        name: "Silver",
        timeLabel: "15 Days",
        durationDays: 15,
        accessibleSlots: 6, // includes 6 houses
        basePrice: 599,
      },
      {
        name: "Gold",
        timeLabel: "15 Days",
        durationDays: 15,
        accessibleSlots: 19, // includes 19 houses
        basePrice: 1199,
      },
      {
        name: "Diamond",
        timeLabel: "15 Days",
        durationDays: 15,
        accessibleSlots: 25, // includes 25 houses
        basePrice: 1799,
      },
    ];

    for (const p of plans) {
      const exists = await Subscription.findOne({ name: p.name });
      if (exists) {
        console.log(`Skipping (already exists): ${p.name} → ${exists._id}`);
        continue;
      }

      const priceInfo = withGST(p.basePrice, 18);
      const doc = {
        name: p.name,
        timeLabel: p.timeLabel,
        durationDays: p.durationDays,
        accessibleSlots: p.accessibleSlots,
        price: priceInfo.totalPrice, // store final price as "price"
        features: {
          housesIncluded: p.accessibleSlots,
        },
        meta: {
          pricing: {
            basePrice: priceInfo.basePrice,
            gstPercent: priceInfo.gstPercent,
            gstAmount: priceInfo.gstAmount,
            totalPrice: priceInfo.totalPrice,
            note: `${priceInfo.basePrice} + ${priceInfo.gstPercent}% GST`,
          },
        },
        isActive: true,
      };

      const created = await Subscription.create(doc);
      console.log(
        `Created: ${p.name} → id: ${created._id} (totalPrice: ${priceInfo.totalPrice})`
      );
    }

    console.log("Subscription seeding completed.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error while seeding subscription:", err);
    process.exit(1);
  }
}

seedSubscriptions();

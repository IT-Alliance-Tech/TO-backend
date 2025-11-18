// backend/controllers/adminPropertyController.js
const Property = require("../models/Property");

async function adminCreateProperty(req, res) {
  try {
    const {
      title,
      description,
      rent,
      deposit,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      location,
      images,
      amenities,
      ownerName,
    } = req.body;

    if (
      !title ||
      !description ||
      typeof rent === "undefined" ||
      !propertyType
    ) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: {
          message: "title, description, rent and propertyType are required",
        },
        data: null,
      });
    }
    if (!ownerName || ownerName.trim() === "") {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: { message: "ownerName is required when admin posts property" },
        data: null,
      });
    }

    const doc = {
      title,
      description,
      rent,
      deposit,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      location,
      images: images || [],
      amenities: amenities || [],
      ownerId: null,
      ownerName: ownerName.trim(),
      createdByRole: "admin",
      status: "PENDING",
    };

    const property = await Property.create(doc);

    return res.status(201).json({
      statusCode: 201,
      success: true,
      error: null,
      data: { message: "Property posted by admin successfully", property },
    });
  } catch (err) {
    console.error("adminCreateProperty error:", err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: { message: "Internal server error", details: err.message },
      data: null,
    });
  }
}

module.exports = { adminCreateProperty };

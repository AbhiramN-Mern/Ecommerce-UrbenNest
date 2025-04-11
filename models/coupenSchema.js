const mongoose = require("mongoose");

// Define the schema for coupons
const couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true, // Removes extra spaces
    unique: true, // Ensures coupon names are unique
  },
  offerPrice: {
    type: Number,
    required: true,
    min: 0, // Ensures the discount is not negative
  },
  expireOn: {
    type: Date,
    required: true, // Expiration date for the coupon
  },
  minimumPrice: {
    type: Number,
    required: true, // Minimum order value required to apply the coupon
    min: 0,
  },
  isList: {
    type: Boolean,
    default: true, // Indicates whether the coupon is active and listed
  },
  userId: {
    type: [mongoose.Schema.Types.ObjectId], // Tracks users who have used the coupon
    ref: "User", // Reference to the User model
    default: [],
  },
  createdOn: {
    type: Date,
    default: Date.now, // Automatically sets the creation date
  },
});

// Export the Coupon model
module.exports = mongoose.model("Coupon", couponSchema);
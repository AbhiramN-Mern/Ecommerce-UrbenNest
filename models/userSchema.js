const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  phone: { type: String, default: null },
  googleId: { type: String, unique: true, sparse: true, default: undefined },
  password: { type: String },
  isBlocked: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  cart: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "cart",
  }],
  wallet: { type: Number, default: 0 },
  orderHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "order"
  }],
  createOn: { type: Date, default: Date.now },
  referralCode: {
    type: String,
    unique: true,
    // Generate a referral code as an uppercase alphanumeric string.
    default: function () {
      // For example, use the first 4 letters of the name (if provided) plus a random number.
      const namePart = this.name ? this.name.slice(0, 4).toUpperCase() : crypto.randomBytes(2).toString('hex').toUpperCase();
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `${namePart}${randomPart}`;
    }
  },
  redeemed: { type: Boolean },
  redeemUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
  }],
  searchHistory: [{
      category: { type: mongoose.Schema.Types.ObjectId, ref: 'catrgory' },
      brand: { type: String },
      searchOn: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
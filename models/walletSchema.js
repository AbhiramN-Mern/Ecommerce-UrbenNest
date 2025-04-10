const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  balance: {
    type: Number,
    default: 0, // Initial wallet balance
  },
  history: [
    {
      amount: Number,
      status: { type: String, enum: ["credit", "debit"] },
      date: { type: Date, default: Date.now },
      description: String,
    },
  ],
});

module.exports = mongoose.model("Wallet", walletSchema);
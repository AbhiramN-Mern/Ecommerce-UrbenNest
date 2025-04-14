const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  user: {   // changed from userId to user
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true  // if you want it to be unique 
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
const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
  product: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      productStatus: { type: String, required: true },
      name: { type: String },
      image: { type: String },
      returnStatus: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", null],
        default: null,
      },
    },
  ],
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  orderedItems: [{
    Product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      default: 0,
    }
  }],
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  deliveryCharge: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  address: [
    {
      name: { type: String },
      phone: { type: String },
      landMark: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
  ],
  invoiceDate: {
    type: Date
  },
  status: {
    type: String,
    required: true,
    enum: [
      "Pending", 
      "Processing", 
      "Shipped", 
      "Delivered", 
      "Cancelled", 
      "Return Request", 
      "Returned", 
      "Confirmed", 
      "Payment Pending",
      "Payment Failed",
      "Paid" 
    ],
    default: "Pending"
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  couponApplied: {
    type: Boolean,
    default: false
  },
  payment: {
    type: String,
    required: true,
    enum: ["COD", "Razorpay", "Wallet", "PayPal", "cod", "wallet"] 
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Pending'
  },
  
  // Razorpay payment fields
  razorpayPaymentId: {
    type: String,
    default: null
  },
  razorpayOrderId: {
    type: String,
    default: null
  },
  razorpaySignature: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
  },
  reviewText: {
    type: String,
    required: false,
  },
  ratings: {
    type: Number,
    min: 1,
    max: 5,
    default: 1,
  },
  deliveryDate: {
    type: Date,
  },
  originalTotalPrice: {
    type: Number,
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
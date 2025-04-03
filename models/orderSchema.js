const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  name: { type: String },
  image: { type: String },
  productStatus: { type: String, default: "Confirmed" },
  user: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const orderSchema = new Schema({
  orderId: { type: String, unique: true, index: true },
  product: [orderItemSchema],
  originalTotalPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  deliveryCharge: { type: Number },
  finalAmount: { type: Number, required: true },
  address: { 
    type: Schema.Types.Mixed,  // if address is stored as a subdocument
    required: true
  },
  payment: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'processing', 'shipped', 'Delivered', 'cancel', 'Return Request', 'returned', 'Confirmed']
  },
  createdOn: { type: Date, default: Date.now, required: true },
  CoupenApplied: { type: Boolean, default: false }
});

module.exports = mongoose.model("Order", orderSchema);
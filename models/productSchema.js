const mongoose = require('mongoose');
const { Schema } = mongoose;

const offerSchema = new mongoose.Schema({
  discount: { type: Number, default: 0 },
  offerDescription: { type: String, default: "" },
  startDate: { type: Date },
  endDate: { type: Date }
});

const productSchema = new Schema({
    productName: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        ref: "Brand",
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    regularPrice: {
        type: Number,
        required: true
    },
    salePrice: {
        type: Number,
        required: true,
    },
    productOffer: {
        type: Number,
        default: 0,
    },
    quantity: {               
        type: Number,
        default: 0,
    },
    color: {
        type: String,
        required: true
    },
    productImage: {
        type: [String],
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'Available'],
        required: true,
        default: 'active'
    },
    offer: offerSchema
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
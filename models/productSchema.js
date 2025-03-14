const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
    productName: {
        type: String,
        required: true
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
    productOffer: {           // fixed spelling here
        type: Number,
        default: 0,
    },
    quantity: {               // renamed field and fixed default
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
        enum: ['available', 'Out Of Stock', 'Discountinued'],
        required: true,
        default: 'Availble'
    },
}, { timeStamp: true });

const Product = mongoose.model('product', productSchema);
module.exports = Product;
const mongoose = require('mongoose');
const product = require('./productSchema')
const { Schema } = mongoose;

const wishListSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        addOne: {
            type: Date,
            default: Date.now
        }
    }]
});

const wishlist = mongoose.model('wishList', wishListSchema);
module.exports = wishlist;
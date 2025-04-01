const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        },
        price: {
            type: Number,
            required: true
        },
        totalPrice: {  // corrected field name
            type: Number,
            default: 0
        },
        cancellationReason: {
            type: String,
            default: 'none'
        }
    }]
});

const Cart = mongoose.model('cart', cartSchema);
module.exports = Cart;
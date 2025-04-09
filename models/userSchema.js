const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        // required:true,
        unique: true
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
        default: undefined
    },
    password: {
        type: String,
        required: false,
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart: [{
        type: Schema.Types.ObjectId,
        ref: "cart",
    }],
    
    wallet: {
        type: Number,
        default: 0
    },


    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "order"
    }],
    createOn: {
        type: Date,
        default: Date.now
    },
    referalcode: {
        type: String,
        unique: true,
        sparse: true
    },
    redeemed: {
        type: Boolean
    },
    redeemUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'user'
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: 'catrgory',
        },
        brand: {
            type: String
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
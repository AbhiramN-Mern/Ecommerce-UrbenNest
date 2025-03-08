const mongoose=require('mongoose')
const product = require('./productSchema')
const {schema}=mongoose

const wishlistschema=new mongoose.Schema({
    userId:{
        type:Schema.Types.objectId,
        ref:'User',
        required:true
    },
    products:[{
        productId:{
            type:Scheema.Types.objectId,
            ref:'product',
            required:true
        },
        addOne:{
            type:Date,
            default:Date.now
        }
    }]
})
const wishlist=mongoose.model('wishList',wishlistschema)
module.exports=wishlist
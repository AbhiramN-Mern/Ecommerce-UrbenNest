const mongoose=require('mongoose')
const {Schema}=mongoose

const cartSchema=new schema({
    userId:{
        type:schema.Types.ObjectId,
        ref:'user',
        requierd:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'product',
            required:true
        },
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        totelPrice:{
            type:String,
            default:'placed'
        },
        cancellationReason:{
            type:String,
            default:'none'
        }

    }]
})
const cart=mongoosr=mongoose.model('cart',cartSchema)
module.exports=cart;
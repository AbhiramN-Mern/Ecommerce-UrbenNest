const { default: mongoose, Schema } = require("mongoose")

const orderSchema=new Schema({
    orderItems:[{
        price:{

        }
    }],
    totelPrice:{
        type:Number,
        required:true,
    },
    discount:{
        type:Number,
        default:true
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:'User',
        requier:true
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['pending','processing','shipped','Deliverd','cancell','Return Requst','returned']
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    CoupenApplied:{
        type:Boolean,
        default:false
    }
})

const order=mongoose.model('order',orderSchema)
module.exports=order;
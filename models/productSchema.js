// const { default: mongoose } = require('mongoose')
// const { timeStamp } = require('console');
// const { default: mongoose } = require('mongoose');
const monogoose=require('mongoose')
const {schema}=mongoose;

const productSchema=new Schema({
    productName:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true,

    },
    brand:{
        type:String,
        required:true
    },
    category:{
        type:String,
        ref:'category',
        required:true
    },
    regularPrice:{
        type:Number,
        required:true
    },
    productOffeer:{
        type:Number,
        default:0,

    },
    Quantity:{
        type:Number,
        default:true
    },
    color:{
        type:String,
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:['available','Out Of Stock','Discountinued'],
        required:true,
        default:'Availble'
    },
},{timeStamp:true})

const product=mongoose.model('product',productSchema)
module.exports=product
const mongoose=require('mongoose')
const {schema}=mongoose

const brandSchema=new Schema({
    brandName:{
        type:String,
        required:true
    },
    brandImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    createAt:{
        type:Date,
        default:Date.now
    }
})

const Brand=mongoose.model("brand",brandSchema)
module.exports=brand
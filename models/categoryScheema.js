const mongoose=require('mongoose')
const {Schema}=mongoose
const categorySchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true,
    },
    isListed:{
        type:Boolean,
        default:0
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    createAt:{
        type:Date,
        default:Date.now
    }
},{timestamps:true})

const category=mongoose.model('category',categorySchema)

module.exports=category
const mongoose=require('mongoose')
const {schema}=mongoose
const categorySchema=new schema({
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
})

const category=mongoose.model('category',categorySchema)

module.exports=category
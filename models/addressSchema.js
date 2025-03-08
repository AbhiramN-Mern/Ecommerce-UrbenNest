const mongoose=require('mongoose')
const { Schema } = mongoose
const AddressSchema = new Schema({
    userId:{
        type:mongoose.Schema.types.ObjectId,
        ref:'user',
        required:true
    },
    address:[{
        addressType:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required:true

        },
        city:{
            type:String,
            required:true,
        },
        landMark:{
            type:String,
            required:true,
        },
        state:{
            type:String,
            required:true
        },
        pinCode:{
            type:Number,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        altPhone:{
            type:String,
            required:true
        }
    }]
})

const address=mongoose.model('address',AddressSchema)

module.exports=address;
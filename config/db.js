const mongoose=require('mongoose')
const env =require('dotenv').config()

const connectdb=async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Db Connected')
    }catch(error){
        console.log('DB connection Error',error.message)
        process.exit(1)
    }
}


module.exports=connectdb
const multer=require('multer')
const path=require('path')

const storege=multer.diskStorage({
    destination:(req,res,cb)=>{
        cb(null,path.join(__dirname,"../public/uplods/re-image"))
    },
    filename:(req,res,cb)=>{
        cb(null,Date.now()+"-"+file.orginal)

    }
})
module.exports=storege;
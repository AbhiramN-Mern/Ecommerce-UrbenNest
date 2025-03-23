const User=require('../models/userSchema');

const userAuth=(req,res,next)=>{
    if(req.session.user){
       return  res.redirect('/')
    }
    next()
}

const adminAuth = (req, res, next) => {
    if(!req.session.admin){
        return res.redirect('/admin/login')
     }
     next()

}
module.exports={
    userAuth,
    adminAuth
}
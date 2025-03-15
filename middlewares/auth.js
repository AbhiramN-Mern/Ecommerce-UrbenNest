const User=require('../models/userSchema');

const userAuth=(req,res,next)=>{
    if(req.session.user){
        res.redirect('/')
    }
    next()
}


// const adminAuth=(req,res,next)=>{
//     User.findOne({isAdmin:true})
//         .then(data=>{
//             if(data){
//                 next()
//             }else{
//                 res.redirect('/login')
//             }
//         })
//         .catch(error=>{
//             console.log('Error in AdminAuth Middleware'),error;
//             res.status(500).send({message:"Internal Server Error"})

//         })
// }

const adminAuth = (req, res, next) => {
    if(!req.session.admin){
        res.redirect('/admin/login')
     }
     next()

}
module.exports={
    userAuth,
    adminAuth
}
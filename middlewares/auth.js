const { error } = require('console');
const User=require('../models/userSchema');
const userAuth=(req,res,next)=>{
    if(req.session.user){
        UserfindById(req.session.user)
            .then(data=>{
                if(data&&!data.isBlocked){
                    next()
                }else{
                    res.redirect('/login')
                }

            })
            .catch(error=>{
                console.log("Error In USer Auth Middlewere");
                res.status(500).send({message:"Internal Server Error"})
                
            })
        }else{
            res.redirect('/login')
        }
}

const adminAuth=(req,res,next)=>{
    User.findOne({isAdmin:true})
        .then(data=>{
            if(data){
                next()
            }else{
                res.redirect('/login')
            }
        })
        .catch(error=>{
            console.log('Error in AdminAuth Middleware'),error;
            res.status(500).send({message:"Internal Server Error"})

        })
}
module.exports={
    userAuth,
    adminAuth
}
const User=require('../../models/userSchema')
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')

const loadlogin=async(req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin/dashbord')
    }
    res.render('adminlogin',{message:null})

}
const login=async(req,res)=>{
try {
    const {email,password}=req.body;
    console.log(req.body)
    const admin=await User.findOne({email,isAdmin:true})
    if(admin){
        const passwordMatch=await bcrypt.compare(password,admin.password)
        if(passwordMatch){
            req.session.admin=true
            
            return res.redirect('/admin/dashbord')
        }else{
            return res.redirect('/admin/login')
        }
    }else{
        return res.redirect('/admin/login')
    }
    
} catch (error) {
    console.log('login error',error)
        return res.redirect('/pageNotFound')
}
}
const loadDashbord=async (req,res)=>{
    if (req.session.admin){
        try{
            res.render('dashboard')
        }catch{
            req.redirect('/pageNotFound')
        }
    }
}
const logout=async(req,res)=>{
    console.log("kasar");
    
   try {
    req.session.destroy(err=>{
        if(err){
            console.log("god");
            
        console.log('Error in Admin Logout',err)
        return res.redirect('/pageNotFound');
        }
        res.redirect('/admin/login')
        console.log('Admin Logout Successfully')
    })
    
   } catch (error) {
    console.log('Unexpected Error in Admin Logout',error);
    res.redirect('/pageNotFound')
    
    
   }
}



module.exports={
loadlogin,
login,
loadDashbord,
logout
}

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
    try {
        delete req.session.admin; 
        res.redirect('/admin/login');
    } catch (error) {
        console.error('Unexpected Error in Admin Logout:', error.message);
        res.redirect('/pageNotFound');
    }
};



module.exports={
loadlogin,
login,
loadDashbord,
logout
}

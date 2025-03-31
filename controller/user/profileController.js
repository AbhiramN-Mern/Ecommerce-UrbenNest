const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require('dotenv').config();
const session = require("express-session");
const { log } = require("console");




function generateOtp(){
    const digits = "1234567890";
    let otp = "";
    for(let i=0;i<4;i++){
        otp+=digits[Math.floor(Math.random()*10)];
    }
    return otp;
}


const sendVerificationEmail = async (email,otp)=>{
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD,

            }
        })

        const mailOptions = {
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP : ${otp}</h4><br></b>`
        }

        const info  = await transporter.sendMail(mailOptions);
        console.log("Email sent:",info.messageId);
        return true;



    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }
}


const getForgetPassPage = async (req,res) =>{
    try {
         
        res.render("forgot-password");

    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
}


const forgotEmailValid = async (req, res) => {
    try {
        console.log(req.body)
      const { email } = req.body;
      const findUser = await User.findOne({ email: email });
      if(findUser){
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if(emailSent){
            req.session.userOtp = otp;
            req.session.email = email;
            console.log("OTP:", otp);
            return res.json({ success: true });
        } else {
            return res.json({ success: false, message: "Failed to send OTP. Please try again" });
        }
      } else {
        return res.json({ success: false, message: "User with this email does not exist" });
      }
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "An error occurred. Please try again later." });
    }
};


const verifyForgotPassOtp = async (req,res) =>{
    try {
        
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"});

        }else{
            res.json({success:false,message:"OTP not matching"});
        }

    } catch (error) {
         res.status(500).json({success:false, message:"An error occured. Please try again"});

    }
}


const getResetPassPage = async (req,res) =>{

    try {
        
        res.render("reset-password") 

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}


const resendOtp = async (req,res) =>{
    try {
        
     const otp = generateOtp();
     req.session.userOtp = otp;
     const email = req.session.email;
     console.log("Resending OTP to email:",email);
     const emailSent = await sendVerificationEmail(email,otp);
     if(emailSent){
        console.log("Resend OTP:",otp);
        res.status(200).json({success:true,message:"Resent OTP Successful"});

        
     }
     

    } catch (error) {
        console.error("Error in resend otp",error);
        res.status(500).json({success:false,message:"Internal Server Error"});

    }
}


const seccurePassword = async(password) =>{
    try {
        
       const passwordHash = await bcrypt.hash(password,10);
       return passwordHash;

    } catch (error) {
        
    }
}





  


const verifyEmailOtp = async (req,res) =>{
    try {
        
        const  enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            req.session.userData = req.body.userData;
            res.render("new-email",{
                userData: req.session.userData,
            })
        }else{
            res.render("change-email-otp",{
                message : "OTP not matching ",
                userData :req.session.userData
            })
        }

    } catch (error) {
        

        res.redirect("/pageNotFound");
    }
}



const changePassword = async (req,res) =>{

    try {
        
         res.render("change-password")

    } catch (error) {
        res.redirect("/pageNotFound");
    }
}



const changePasswordValid = async (req,res) =>{

    try {
        
        const {email} = req.body;

        const userExists = await User.findOne({email});
        if(userExists){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp");
                console.log("OTP:",otp);
                
            }else{
                res.json({
                    success:false,
                    message:"Failed to send OTP, Please try again",
                })
            }
        }else{
            res.render("change-password",{
                message:"User with this email does not exist"
            })
        }

    } catch (error) {
        
        
          console.log("Error in change password validation", Error);
          res.redirect("/pageNotFound");
    }
}

const verifyChangePassOtp = async (req,res) =>{
    try {
        
      const enteredOtp = req.body.otp;
      if(enteredOtp === req.session.userOtp){

          res.json({success:true,redirectUrl:"/reset-password"})

      }else{
         res.json({success:false,message:"OTP not matching"})
      }

    } catch (error) {
        
       res.status(500).json({success:false, message:"An error occured. Please try again later"})

    }
}


const postNewPassword  = async(req,res) =>{
    try {
        
       const {newPass1, newPass2} = req.body;
       const  email = req.session.email;
       if(newPass1 === newPass2){
        const passwordHash = await seccurePassword(newPass1);
        await User.updateOne(
            {email:email},
            {$set:{password:passwordHash}}
        )
        res.redirect('/login');
       }else{
        res.render("reset-password",{message:"Password's do not match"})
       }

    } catch (error) {
        
         res.redirect("/pageNotFound");
    }
}


const getVerifyForgotOTPPage = async (req, res) => {
  try {
      res.render("forgotPass-otp"); // Ensure this view exists.
  } catch (error) {
      res.redirect("/pageNotFound");
  }
};
const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        if (!userData) {
            console.error("No user found for ID:", userId);
            return res.redirect('/login');
        }
        // Override currentPage here for the header
        res.render('profile', { user: userData, currentPage: 'profile' });
    } catch (error) {
        console.error("Error in ProfileData", error);
        res.redirect('/pageNotFound');
    }
};

const changeEmail=async(req,res)=>{
    try {
        res.render('change-email')
    } catch (error) {
        res.redirect('pageNotFound')
        
    }
}
const changeEmailValid=async(req,res)=>{
    try {
        const {email}=req.body
        const userExists=await User.findOne({email})

        if(userExists){
            const otp=generateOtp()
            const emailSent=await sendVerificationEmail(email,otp)
            if(emailSent){
                req.session.userOtp=otp;
                req.session.userData=req.body;
                req.session.email=email;
                res.render('change-email-otp')
                console.log("email-send to",email);
                console.log('OTP: ',otp)
                
            }else{
                res.json('email-error')
            }
        }else{
            res.render('change-email',{
                message:"User With This Email NOt Exixt"
            })
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const updateEmail=async(req,res)=>{
    try {
        
    const newEmail=req.body.newEmail
    const userId=req.session.user
    await User.findByIdAndUpdate(userId,{email:newEmail})
    res.redirect('/userProfile')
    } catch (error) {
        console.error(error)
        res.redirect('/pageNotFound')
    }
}


module.exports = {
    getForgetPassPage,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    verifyEmailOtp,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    postNewPassword,
    getVerifyForgotOTPPage,
    userProfile,
    changeEmail,
    changeEmailValid,
    updateEmail
    
    
}
const User = require("../../models/userSchema");
const Address=require('../../models/addressSchema')
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require('dotenv').config();
const session = require("express-session");
const { log } = require("console");
const address = require("../../models/addressSchema");




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
        const addressData=await Address.findOne({userId:userId})
        if (!userData) {
            console.error("No user found for ID:", userId);
            return res.redirect('/login');
        }
        // Override currentPage here for the header
        res.render('profile', { user: userData,userAddress:addressData, currentPage: 'profile' });
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
const addAddress=async(req,res)=>{
    try {
        const user=req.session.user
        res.render('add-address',{user:user})


    } catch (error) {
        res.redirect('pageNotFound')
    }
}
const postAddAddress = async (req, res) => {
    try {
        // Log the request body for debugging
        console.log("Address form submission:", req.body);
        
        // Build the new address object using the proper field names
        const newAddress = {
            addressType: req.body.addressType,
            name: req.body.name,
            city: req.body.city,
            landMark: req.body.landMark,
            state: req.body.state,
            pinCode: req.body.pinCode,
            phone: req.body.phone,
            altPhone: req.body.altPhone
        };

        // Find an existing address document for the current user
        let addressDoc = await Address.findOne({ userId: req.session.user });
        if (addressDoc) {
            // Push the new address into the existing addresses array
            addressDoc.address.push(newAddress);
            await addressDoc.save();
        } else {
            // Otherwise, create a new document with the address array
            addressDoc = await Address.create({ userId: req.session.user, address: [newAddress] });
        }
        res.redirect('/userProfile');
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};
const editAddress = async (req, res) => {
    try {
        console.log("Session data:", req.session);
        const addressId = req.query.id;
        console.log("Editing address with id:", addressId);
        const user = req.session.user;
        if (!user) {
            console.error("No user found in session.");
            return res.redirect("/login");
        }
        // Filter by userId as well as the subdocument's _id
        const currAddress = await Address.findOne({ 
            userId: req.session.user, 
            "address._id": addressId 
        });
        console.log("Found address document:", currAddress);
        if (!currAddress) {
            return res.redirect('/pageNotFound');
        }
        const addressData = currAddress.address.find((item) => {
            return item._id.toString() === addressId.toString();
        });
        if (!addressData) {
            return res.redirect('/pageNotFound');
        }
        res.render('edit-address', { address: addressData, user: user });
    } catch (error) {
        console.error("Error in edit address", error);
        res.redirect('/pageNotFound');
    }
};
    const postEditAddress=async(req,res)=>{
        try {
            const data=req.body
            const addressId=req.query.id
            const findAddress=await Address.findOne({"address._id":addressId})
            if(!findAddress){
                res.redirect('/pageNotFound')
            }
            await Address.updateOne(
                {"address._id":addressId},
                {$set:{
                    "address.$":{
                        _id:addressId,
                        addressType:data.addressType,
                        name:data.name,
                        city:data.city,
                        landMark:data.landMark,
                        state:data.state,
                        pinCode:data.pinCode,
                        phone:data.phone,
                        altPhone:data.altPhone

                    }
                }}
            )
            res.redirect('/userProfile')
        } catch (error) {
            console.error("Error In Edit Address",error);
            res.redirect('/pageNotFound')
            
            
        }
    }

    const deleteAddress = async (req, res) => {
        try {
          const addressId = req.query.id;
          console.log("Address ID:", addressId); // Log to verify the ID
      
          // Validate addressId
          if (!addressId) {
            return res.status(400).send("Address ID is required");
          }
      
          // Find the document containing the address subdocument
          const findAddress = await Address.findOne({ "address._id": addressId });
          console.log("Found Address:", findAddress); // Log to debug
      
          if (!findAddress) {
            return res.status(404).send("Address Not Found");
          }
      
          // Remove the specific address from the array
          const updateResult = await Address.updateOne(
            { "address._id": addressId }, // Match the document
            { $pull: { address: { _id: addressId } } } // Pull the matching subdocument
          );
      
          console.log("Update Result:", updateResult); // Log the result
      
          if (updateResult.modifiedCount === 0) {
            return res.status(500).send("Failed to delete address");
          }
      
          res.redirect('/userProfile');
        } catch (error) {
          console.error("Error in Delete Address:", error);
          res.redirect('/pageNotFound');
        }
      };

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
    updateEmail,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress
    
}
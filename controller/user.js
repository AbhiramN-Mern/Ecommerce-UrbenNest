const { log, Console, error } = require('console')
const User=require('../models/userSchema')
const nodemailer=require('nodemailer')
const env=require('dotenv').config()
const bcrypt=require('bcrypt')
const { json } = require('stream/consumers')


const loadhomepage=async(req,res)=>{
    try{
        return res.render('home')
    }catch(error){
        console.log('Home Page NOt Found')
        res.status(500).send('server Error')
    }
}
const pageNotFound=async(req,res)=>{
    try{
        res.render('page-404')
    }catch(error){
        res.redirect('/pageNotFound')
    }
}

const loadsignup=async(req,res)=>{
    try{
        return res.render('signup')
    }catch(error){
        console.log('signup page not loading ')
        res.status(500).send('server error')
    }
}

function genarateOTP(){
    return Math.floor(1000+Math.random()*9000).toString();

}
async function sendVerificationEmail(email,otp){
    try {
        
        
        const transpoter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }

        })

        

    const info=await transpoter.sendMail({
        from:process.env.NODEMAILER_EMAIL,
        to:email,
        subject: 'Your OTP Code for Verification',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #007bff;">OTP Verification</h2>
                <p style="font-size: 16px;">Your One-Time Password (OTP) for verification is:</p>
                <p style="font-size: 24px; font-weight: bold; color: #333; background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px;">${otp}</p>
                <p style="font-size: 14px; color: #555;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
                <hr style="margin: 20px 0;">
                <p style="font-size: 12px; color: #888;">If you did not request this OTP, please ignore this email.</p>
            </div>
        `,
    })
    // console.log(info);
    return info.accepted.length>0
    
        
    } catch (error) {
        console.error('Error sending email',error)
        return false;
    }
}


const signup = async (req, res) => {
    try {
        console.log("Received signup request:", req.body);

        const { email,phone,name, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            console.log("Passwords do not match:", password, confirmPassword);
            return res.render('signup', { message: 'Passwords do not match' });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            console.log("User already exists:", email);
            return res.render('signup', { message: "User with this email already exists" });
        }

        
        const otp = genarateOTP();
        console.log("Generated OTP:", otp);

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            console.log("Email sending failed.");
            return res.render('signup', { message: 'Failed to send OTP. Try again!' });
        }

        // Store OTP and user data in session
        req.session.userOtp = otp;
        req.session.userData = { name,phone,email, password };
        // console.log("Session Data:", req.session);
        // res.send(req.session.userOtp)

        res.render("verifyOTP"); // Redirect to OTP verification page
    } catch (error) {
        console.error('Signup error:', error);
        res.redirect('/pageNotFound');
    }
};


const securePassword=async(password)=>{
    try{
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash
        
    }catch(error){

    }
}

const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("Entered OTP:", otp);

        // Use the correct session variable key: userOtp
        if (otp === req.session.userOtp) {
            console.log('one');
            
            const userData = req.session.userData;
            const passwordHash = await securePassword(userData.password);

            const saveUserData = new User({
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                password: passwordHash,
            });
            console.log('two');
            
            await saveUserData.save();

            req.session.user = saveUserData._id;
            
            res.redirect('/')
        } else {
            console.error("Invalid OTP entered:", otp);
            // return res.status(400).json({ success: false, message: "Invalid OTP, Please Try Again" });
        }
    } catch (error) {
        console.error("Error in verifyOTP:", error);
        return res.redirect('/pageNotFound');
    }
};

module.exports={
    loadhomepage,
    pageNotFound,
    loadsignup,signup,
    verifyOTP
}
const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const env=require('dotenv').config();
const bcrypt = require('bcrypt');
const Category = require('../../models/categoryScheema');
const Product = require('../../models/productSchema');


const loadhomepage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });
        let productData=await Product.find({
            isBlocked:false,
            category:{$in:categories.map((cat)=>cat._id)},quantity:{$gt:0}
        })

        productData.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
        productData=productData.slice(0,4)

        if (user) {
            const userData = await User.findOne({ _id: user });
            res.render('home', { user: userData,products:productData });
            console.log(userData);
        } else {
            res.render('home', {products:productData });
        }
    } catch (error) {
        console.log('Home Page Not Found');
        res.status(500).send('Server Error');
    }
};

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404');
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

const loadsignup = async (req, res) => {
    try {
        return res.render('signup');
    } catch (error) {
        console.log('Signup page not loading');
        res.status(500).send('Server error');
    }
};

function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
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
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

const signup = async (req, res) => {
    try {
        console.log("Received signup request:", req.body);

        const { email, phone, name, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            console.log("Passwords do not match:", password, confirmPassword);
            return res.render('signup', { message: 'Passwords do not match' });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            console.log("User already exists:", email);
            return res.render('signup', { message: "User with this email already exists" });
        }

        const otp = generateOTP();
        console.log("Generated OTP:", otp);

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            console.log("Email sending failed.");
            return res.render('signup', { message: 'Failed to send OTP. Try again!' });
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };

        res.render("verifyOTP");
    } catch (error) {
        console.error('Signup error:', error);
        res.redirect('/pageNotFound');
    }
};

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error; // Throw error to handle it in the calling function
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("Entered OTP:", otp);
        if (otp === req.session.userOtp) {
            const userData = req.session.userData;
            const passwordHash = await securePassword(userData.password);

            const saveUserData = new User({
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                password: passwordHash,
            });

            await saveUserData.save();
            req.session.user = saveUserData._id;
            
            // Respond based on the request type
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, redirectUrl: '/' });
            } else {
                return res.redirect('/');
            }
        } else {
            console.error("Invalid OTP entered:", otp);
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: false, message: 'Invalid OTP, please try again' });
            } else {
                return res.render('verifyOTP', { message: 'Invalid OTP, please try again' });
            }
        }
    } catch (error) {
        console.error("Error in verifyOTP:", error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: false, message: 'Server error' });
        } else {
            return res.redirect('/pageNotFound');
        }
    }
};

const resendOTP = async (req, res) => {
    try {
        const userData = req.session.userData;
        if (!userData || !userData.email) {
            return res.status(400).json({ success: false, message: 'No user data found in session' });
        }

        const newOtp = generateOTP();
        console.log("Resent OTP:", newOtp);

        const emailSent = await sendVerificationEmail(userData.email, newOtp);
        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Failed to resend OTP' });
        }

        req.session.userOtp = newOtp; // Update OTP in session
        res.status(200).json({ success: true, message: 'OTP resent successfully' });
    } catch (error) {
        console.error('Error in resendOTP:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const loadlogin=async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render('login')
        }else{
            res.redirect('/home')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}

const login=async(req,res)=>{
    try {
        const {email,password}=req.body
        const findUser=await User.findOne({isAdmin:0,email:email})
    if(!findUser){
        return res.render('login',{message:"User Not Found"})
        
        

    }
    if(findUser.isBlocked){
        console.log('User is Blocked by Admin ');
        return res.render('login',{message:'User is Blocked by Admin '})
    }
    const passwordMatch=await bcrypt.compare(password,findUser.password)
    
    
    

    if(!passwordMatch){
        console.log("incorrect Password");
        
        return res.render('login',{message:"incorrect Password"})
    }
    req.session.user=findUser._id
    res.redirect('/')

    } catch (error) {
        console.log('login error',error)
        res.render('login',{message:'login failed Please Try Again Later'})
    }
}
const logout=async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('Error in logout',err.message);
                return res.redirect('/pageNotFound')
                
            }else{
                console.log('User Logged Out');
                return res.redirect('/login')
               
                
            }
        })
    } catch (error) {
        console.log('Logout Error',error);
        res.redirect('/pageNotFound')
        
    }
}





module.exports = {
    loadhomepage,
    pageNotFound,
    loadsignup,
    signup,
    verifyOTP,
    resendOTP,
    loadlogin,
    login,
    logout
};
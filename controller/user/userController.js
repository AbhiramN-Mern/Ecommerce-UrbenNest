const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const twilio = require("twilio");
const env=require('dotenv').config();
const bcrypt = require('bcrypt');
const Brand=require('../../models/brandSchema')
const Category = require('../../models/categoryScheema');
const Product = require('../../models/productSchema');
const category = require('../../models/categoryScheema');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const mongoose = require("mongoose");
const axios = require('axios');
const Coupon = require('../../models/coupenSchema'); // Assume you have a coupon model
const Wallet = require('../../models/walletSchema');

const loadhomepage = async (req, res) => {
    try {
        const user = req.session.user;
        
        const categories = await Category.find({ isListed: true }).select('_id');

        const productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(cat => cat._id) }
        })
        .sort({ createdAt: -1 }) 
        .limit(3);

        res.render('home', { user: user ? await User.findById(user) : req.user, products: productData });
    } catch (error) {
        console.error("Error loading home page:", error);
        res.status(500).send("Server Error");
    }
};

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

// const loadsignup = async (req, res) => {
//     try {
//         return res.render("signup");
//     } catch (error) {
//         console.error("Signup page not loading:", error);
//         res.status(500).send("Server error");
//     }
// };

const loadsignup=async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render('signup')
        }else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}



function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
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
            subject: "Your OTP Code for Verification",
            html: `<div style="font-family: Arial, sans-serif; text-align: center;">
                    <h2>OTP Verification</h2>
                    <p>Your One-Time Password (OTP) is:</p>
                    <p style="font-size: 24px; font-weight: bold;">${otp}</p>
                    <p>This OTP is valid for 10 minutes.</p>
                </div>`
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}

function formatPhoneNumber(phone) {
    if (!phone.startsWith("+")) {
        return "+91" + phone;
    }
    return phone;
}

async function sendVerificationSMS(phone, otp) {
    try {
        const formattedPhone = formatPhoneNumber(phone);

        await twilioClient.messages.create({
            body: `UrbanNest Verification Code: ${otp}. This code is valid for 10 minutes. Do not share it with anyone`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
        });

        console.log("OTP sent via SMS to:", formattedPhone);
        return true;
    } catch (error) {
        console.error("Error sending SMS:", error);
        return false;
    }
}
const signup = async (req, res) => {
    try {
        console.log("Received signup request:", req.body);

        const { email, phone, name, password, confirmPassword, referralCode, "g-recaptcha-response": recaptchaToken } = req.body;

        // [Perform recaptcha check and other validations here]

        if (password !== confirmPassword) {
            return res.render("signup", { message: "Passwords do not match" });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }

        const otp = generateOTP();
        console.log("Generated OTP:", otp);

        const emailSent = await sendVerificationEmail(email, otp);
        const smsSent = await sendVerificationSMS(phone, otp);

        if (!emailSent) {
            return res.render("signup", { message: "Failed to send OTP. Try again!" });
        }

        // Store OTP with expiration timestamp
        req.session.userOtp = {
            code: otp,
            expiresAt: Date.now() + (60 * 1000) // 60 seconds from now
        };

        // Store all signup data, including the optional referral code
        req.session.userData = { name, phone, email, password, referralCode };

        res.render("verifyOTP");
    } catch (error) {
        console.error("Signup error:", error);
        res.redirect("/pageNotFound");
    }
};
const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error("Error hashing password:", error);
        throw error;
    }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("OTP from form:", otp, "Session OTP:", req.session.userOtp);

    // Check if OTP exists and hasn't expired
    if (!req.session.userOtp || !req.session.userOtp.code) {
        return res.render("verifyOTP", { 
            message: "OTP has expired or not found. Please request a new one." 
        });
    }

    // Check if OTP has expired
    if (Date.now() > req.session.userOtp.expiresAt) {
        delete req.session.userOtp;
        return res.render("verifyOTP", { 
            message: "OTP has expired. Please request a new one." 
        });
    }

    // Verify OTP
    if (otp.toString() === req.session.userOtp.code.toString()) {
      const userData = req.session.userData; // Contains name, phone, email, password, referralCode (if any)
      const passwordHash = await securePassword(userData.password);
      
      // Create the new user. The referralCode is auto-generated by userSchema.
      const newUser = new User({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: passwordHash
      });
      await newUser.save();
      
      // Log the newUser to debug the generated _id
      console.log("New user saved:", newUser);
      
      // Check if newUser._id is defined.
      if (!newUser._id) {
        throw new Error("newUser._id is not defined after save");
      }
      
      // Initialize wallet for the new user only if not already created
      let newUserWallet = await Wallet.findOne({ user: newUser._id });
      if (!newUserWallet) {
        newUserWallet = new Wallet({
          user: newUser._id,
          balance: 0,
          history: []
        });
      }
      
      // Add ₹50 signup bonus
      newUserWallet.balance += 50;
      newUserWallet.history.push({
        amount: 50,
        status: "credit",
        description: "Signup bonus"
      });
      await newUserWallet.save();
      
      // Process referral if provided
      if (userData.referralCode) {
        // Normalize referral code (e.g. trim and convert to uppercase)
        const inputReferral = userData.referralCode.trim().toUpperCase();
        const referrer = await User.findOne({ referralCode: inputReferral });
        // Prevent self-referral
        if (referrer && referrer._id.toString() !== newUser._id.toString()) {
          // const couponName = `REF-${referrer.referralCode}-${Date.now()}`;
          // await Coupon.create({
          //   name: couponName,
          //   offerPrice: 100,
          //   expireOn: new Date(new Date().setDate(new Date().getDate() + 30)),
          //   minimumPrice: 200,
          //   isList: true,
          //   userId: [referrer._id]
          // });
  
          // Reward the referrer’s wallet
          let referrerWallet = await Wallet.findOne({ user: referrer._id });
          if (!referrerWallet) {
            referrerWallet = new Wallet({
              user: referrer._id,
              balance: 0,
              history: []
            });
          }
          referrerWallet.balance += 100;
          referrerWallet.history.push({
            amount: 100,
            status: "credit",
            description: `Referral reward for referring ${newUser.email}`
          });
          await referrerWallet.save();
        }
      }
      
      req.session.user = newUser._id;
      delete req.session.userOtp;
      delete req.session.userData;
  
      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.json({ success: true, redirectUrl: "/" });
      }
      return res.redirect("/");
    } else {
      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.json({ success: false, message: "Invalid OTP, please try again" });
      }
      return res.render("verifyOTP", { message: "Invalid OTP, please try again" });
    }
  } catch (error) {
    console.error("Error in verifyOTP:", error);
    return res.redirect("/pageNotFound");
  }
};

const resendOTP = async (req, res) => {
    try {
        const userData = req.session.userData;
        if (!userData || !userData.email) {
            return res.status(400).json({ success: false, message: "No user data found in session" });
        }

        const newOtp = generateOTP();
        console.log("Resent OTP:", newOtp);

        const emailSent = await sendVerificationEmail(userData.email, newOtp);
        const smsSent = await sendVerificationSMS(userData.phone, newOtp);

        if (!emailSent && !smsSent) {
            return res.status(500).json({ success: false, message: "Failed to resend OTP" });
        }

        req.session.userOtp = {
            code: newOtp,
            expiresAt: Date.now() + (60 * 1000) // 60 seconds from now
        };

        res.status(200).json({ success: true, message: "OTP resent successfully" });
    } catch (error) {
        console.error("Error in resendOTP:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



const loadlogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render('login', { error: req.query.error || '' });
    } else {
      res.redirect('/');
    }
  } catch (error) {
    res.redirect('/pageNotFound');
  }
};

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
const logout = (req, res) => {
    try {
        delete req.session.user; 
        console.log('User Logged Out');
        res.redirect('/login');
    } catch (error) {
        console.error('Error in logout:', error.message);
        res.redirect('/pageNotFound');
    }
};
const loadShoppingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = user ? await User.findOne({ _id: user }) : null;
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map((cat) => cat._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const sortOption = req.query.sort || 'created-new';  
        let sortQuery = {};
        switch(sortOption) {
            case "price-high":
              
                sortQuery = { salePrice: -1 };
                break;
            case "price-low":
                sortQuery = { salePrice: 1 };
                break;
            case "name-asc":
                sortQuery = { productName: 1 };
                break;
            case "name-desc":
                sortQuery = { productName: -1 };
                break;
            case "created-new":
                sortQuery = { createdOn: -1 };
                break;
            case "created-old":
                sortQuery = { createdOn: 1 };
                break;
            default:
                sortQuery = { createdOn: -1 };
                break;
        }

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            // quantity: { $gt: 0 }
        }).sort(sortQuery).skip(skip).limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            // quantity: { $gt: 0 }
        });

        const totalPages = Math.ceil(totalProducts / limit);
        const brands = await Brand.find({ isBlocked: false });
        const categoryWithIds = categories.map(cat => ({ _id: cat._id, name: cat.name }));

        res.render('shop', {
            user: userData,
            products: products,
            categories: categoryWithIds,
            brands: brands,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (error) {
        console.error("Error in loadShoppingPage:", error);
        res.redirect('/pageNotFound');
    }
};


// const filterProduct = async (req, res, next) => {
//     try {
//         const user = req.session.user;
//         const category = req.query.category;
//         const brand = req.query.brand;
//         const findCategory = category ? await Category.findOne({ _id: category }) : null;
//         const findBrand = brand ? await Brand.findOne({ _id: brand }) : null;
//         const brands = await Brand.find({}).lean();
//         const query = {
//             isBlocked: false,
//             // quantity: { $gt: 0 }
//         };

//         if (findCategory) {
//             query.category = findCategory._id;
//         }

//         if (findBrand) {
//             query.brand = findBrand.brandName;
//         }

//         let findProducts = await Product.find(query).lean();
//         findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

//         const categories = await Category.find({ isListed: true });

//         let itemsPerPage = 12;
//         let currentPage = parseInt(req.query.page) || 1;
//         let startIndex = (currentPage - 1) * itemsPerPage;
//         let endIndex = startIndex + itemsPerPage;
//         let totalPages = Math.ceil(findProducts.length / itemsPerPage);
//         const currentProduct = findProducts.slice(startIndex, endIndex);

//         let userData = null;
//         let wishlist = [];
//         if (user) {
//             userData = await User.findOne({ _id: user });
//             wishlist = userData.wishlist || []; 
//             if (userData) {
//                 const searchEntry = {
//                     category: findCategory ? findCategory._id : null,
//                     brand: findBrand ? findBrand.brandName : null,
//                     searchedOn: new Date(),
//                 };
//                 userData.searchHistory.push(searchEntry);
//                 await userData.save();
//             }
//         }

//         req.session.filteredProducts = currentProduct;

//         res.render("shop", {
//             user: userData,
//             products: currentProduct,
//             categories: categories,
//             brands: brands,
//             totalPages,
//             currentPage,
//             selectedCategory: category || null,
//             selectedBrand: brand || null,
//             wishlist: wishlist 
//         });
//     } catch (error) {
//         next(error);
//     }
// };
// const filterByPrice = async (req, res, next) => {
//     try {
//         const user = req.session.user;
//         let userData = null;
//         let wishlist = [];
//         if (user) {
//             userData = await User.findOne({ _id: user });
//             wishlist = userData.wishlist || [];
//         }

//         // Get price filter values from query parameters
//         // 'gt' means minimum price, and 'lt' means maximum price
//         const minPrice = req.query.gt ? Number(req.query.gt) : 0;
//         const maxPrice = req.query.lt ? Number(req.query.lt) : Number.MAX_SAFE_INTEGER;

//         const brands = await Brand.find({}).lean();
//         const categories = await Category.find({ isListed: true }).lean();

//         // Find products that are not blocked, available, and within the price range.
//         let findProducts = await Product.find({
//             isBlocked: false,
//             // quantity: { $gt: 0 },
//             // Use salePrice if you want to filter by sale, or regularPrice if desired.
//             salePrice: { $gte: minPrice, $lte: maxPrice }
//         }).lean();

//         findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

//         let itemsPerPage = 12;
//         let currentPage = parseInt(req.query.page) || 1;
//         let startIndex = (currentPage - 1) * itemsPerPage;
//         let endIndex = startIndex + itemsPerPage;
//         let totalPages = Math.ceil(findProducts.length / itemsPerPage);
//         const currentProduct = findProducts.slice(startIndex, endIndex);
//         req.session.filteredProducts = findProducts;

//         res.render("shop", {
//             user: userData,
//             products: currentProduct,
//             categories: categories,
//             brands: brands,
//             totalPages,
//             currentPage,
//             wishlist: wishlist 
//         });
//     } catch (error) {
//         next(error);
//     }
// };
// const searchProducts = async (req, res) => {
//   try {
//     const query = req.query.query;
//     console.log('Server search query:', query);
//     if (!query) {
//       return res.json([]); // return empty array if no query
//     }
//     // Using case-insensitive search on productName field
//     const products = await Product.find({
//       isBlocked: false,
//       productName: { $regex: query, $options: 'i' },
//     //   quantity: { $gt: 0 }
//     }).lean();

//     console.log('Found products:', products.length);
//     return res.json(products);
//   } catch (error) {
//     console.error("Error searching products:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };




const filterProducts = async (req, res) => {
    try {
        console.log('Filter request received with query:', req.query);

        const {
            query = '',
            sort = 'created-new',
            minPrice = '',
            maxPrice = '',
            category = '',
            brand = ''
        } = req.query;

        let filterQuery = { isBlocked: false };
        console.log('Base filter query:', filterQuery);

        if (query) {
            filterQuery.productName = { $regex: query, $options: 'i' };
            console.log('Added search filter:', filterQuery);
        }

        if (minPrice || maxPrice) {
            filterQuery.salePrice = {};
            if (minPrice) filterQuery.salePrice.$gte = Number(minPrice);
            if (maxPrice) filterQuery.salePrice.$lte = Number(maxPrice);
            console.log('Added price filter:', filterQuery);
        }

        if (category) {
            filterQuery.category = category;
            console.log('Added category filter:', filterQuery);
        } else {
            const categories = await Category.find({ isListed: true });
            filterQuery.category = { $in: categories.map(cat => cat._id) };
            console.log('Added all categories filter:', filterQuery);
        }

        

        if (brand) {
        
            const brandDoc = await Brand.findById(brand);
            if (!brandDoc) {
                return res.json({ products: [] }); 
            }
            filterQuery.brand = brandDoc.brandName; 
        }

        let sortQuery = {};
        switch(sort) {
            case "price-high": sortQuery = { salePrice: -1 }; break;
            case "price-low": sortQuery = { salePrice: 1 }; break;
            case "name-asc": sortQuery = { productName: 1 }; break;
            case "name-desc": sortQuery = { productName: -1 }; break;
            case "created-new": sortQuery = { createdOn: -1 }; break;
            case "created-old": sortQuery = { createdOn: 1 }; break;
            default: sortQuery = { createdOn: -1 }; break;
        }
        console.log('Sort query:', sortQuery);

        const products = await Product.find(filterQuery)
            .sort(sortQuery)
            .limit(9);
        console.log('Found products:', products.length);

        res.json({ products });
    } catch (error) {
        console.error('Error in filterProducts:', error.message, error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

const googleAuthCallback = (req, res) => {
  const user = req.user;
  if (user.isBlocked) {
    // Clear any session data for the blocked user
    delete req.session.user;
    // Log the user out with a callback
    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
      }
      return res.redirect('/login?error=User%20is%20Blocked%20by%20Admin');
    });
  } else {
    req.session.user = user._id;
    res.redirect('/');
  }
};
const loadContact=(req,res)=>{
    try {
        res.render('contact')
    } catch (error) {
        console.log(error)
        res.redirect('pageNotFound')
        
    }
}
const loadAbout=(req,res)=>{
    try {
    res.render('about')        
    } catch (error) {
        console.log(error)
        res.redirect('pageNotFound')

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
    logout,
    loadShoppingPage,
    filterProducts,
    googleAuthCallback ,
    loadContact,
    loadAbout
    
};




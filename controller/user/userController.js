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

const loadhomepage = async (req, res) => {
    try {
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });

        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map((cat) => cat._id) },
            quantity: { $gt: 0 }
        });

        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0, 3);

        if (user) {
            const userData = await User.findOne({ _id: user });
            res.render('home', { user: userData, products: productData });
        } else {
            res.render('home', { products: productData, user: req.user });
        }
    } catch (error) {
        console.error("Home Page Not Found:", error);
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

const loadsignup = async (req, res) => {
    try {
        return res.render("signup");
    } catch (error) {
        console.error("Signup page not loading:", error);
        res.status(500).send("Server error");
    }
};

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
        return "+91" + phone; // Add +91 for India
    }
    return phone;
}

async function sendVerificationSMS(phone, otp) {
    try {
        const formattedPhone = formatPhoneNumber(phone);

        await twilioClient.messages.create({
            body: `Your OTP is: ${otp}`,
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

        const { email, phone, name, password, confirmPassword } = req.body;
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

        if (!emailSent && !smsSent) {
            return res.render("signup", { message: "Failed to send OTP. Try again!" });
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };

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
        if (otp === req.session.userOtp) {
            const userData = req.session.userData;
            const passwordHash = await securePassword(userData.password);

            const saveUserData = new User({
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                password: passwordHash
            });

            await saveUserData.save();
            req.session.user = saveUserData._id;

            return res.redirect("/");
        } else {
            return res.render("verifyOTP", { message: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("Error in verifyOTP:", error);
        res.redirect("/pageNotFound");
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

        req.session.userOtp = newOtp;
        res.status(200).json({ success: true, message: "OTP resent successfully" });
    } catch (error) {
        console.error("Error in resendOTP:", error);
        res.status(500).json({ success: false, message: "Server error" });
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

const loadShoppingPage = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({_id: user});
        const categories = await Category.find({isListed: true});
        const categoryIds = categories.map((cat) => cat._id.toString());
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;

        const sortOption = req.query.sort || 'createdOn';
        const sortOrder = sortOption.includes('desc') ? -1 : 1;
        const sortField = sortOption.replace('-desc', '').replace('-asc', '');

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 }
        }).sort({ [sortField]: sortOrder }).skip(skip).limit(limit);

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 }
        });

        const totalPages = Math.ceil(totalProducts / limit);
        const brands = await Brand.find({isBlocked: false});

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

const filterProduct = async (req, res) => {
    try {
        const user = req.session.user;
        const categoryParam = req.query.category;
        const brandParam = req.query.brand;
        console.log("Brand param received:", brandParam);

        const findCategory = categoryParam ? await Category.findOne({ _id: categoryParam }) : null;
        const findBrand = brandParam ? await Brand.findOne({ _id: brandParam }) : null;
        console.log("Found brand:", findBrand);

        const brands = await Brand.find({}).lean();
        const query = {
            isBlocked: false,
            quantity: { $gt: 0 }
        };
        if (findCategory) {
            query.category = findCategory._id;
        }
        if (findBrand) {
            query.brand = findBrand._id;
        }
        let findProducts = await Product.find(query).lean();
        findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        const categories = await Category.find({ isListed: true });
        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProducts = findProducts.slice(startIndex, startIndex + itemsPerPage);

        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                            
                const searchEntry = {
                    category: findCategory ? findCategory._id : null,
                    brand: findBrand ? findBrand.brandName : null,
                    searchOn: new Date()
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        req.session.filterProduct = currentProducts;
        res.render('shop', {
            user: userData,
            products: currentProducts,
            categories: categories,
            brands: brands,
            totalProducts: findProducts.length,
            currentPage: currentPage,
            totalPages: totalPages,
            selectedCategory: categoryParam || null,
            selectedBrand: brandParam || null
        });
    } catch (error) {
        console.error("Error in filterProduct:", error);
        res.redirect('/pageNotFound');
    }
};

const filterByPrice = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();

        const findProducts = await Product.find({
            salePrice: { $gt: req.query.gt, $lt: req.query.lt },
            isBlocked: false,
            quantity: { $gt: 0 }
        }).lean();

        findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

        const itemsPerPage = 6;
        const currentPage = parseInt(req.query.page) || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProducts = findProducts.slice(startIndex, startIndex + itemsPerPage);

        req.session.filterProduct = findProducts;

        res.render('shop', {
            user: userData,
            products: currentProducts,
            categories: categories,
            brands: brands,
            totalPages: totalPages,
            currentPage: currentPage
        });
    } catch (error) {
        console.error("Error in filterByPrice:", error);
        res.redirect('/pageNotFound');
    }
};

const searchProducts = async (req, res, next) => {
    try {
        const user = req.session.user;
        let userData = null;
        if (user) {
            userData = await User.findOne({ _id: user });
        }
        let search = req.query.query;

        const brands = await Brand.find({}).lean();
        const categories = await Category.find({ isListed: true }).lean();
        const categoryIds = categories.map(category => category._id.toString());
        let searchResult = [];

        if (req.session.filteredProducts && req.session.filteredProducts.length > 0) {
            searchResult = req.session.filteredProducts.filter(product =>
                product.productName.toLowerCase().includes(search.toLowerCase())
            );
        } else {
            searchResult = await Product.find({
                productName: { $regex: ".*" + search + ".*", $options: "i" },
                isBlocked: false,
                quantity: { $gt: 0 },
                category: { $in: categoryIds }
            }).lean();
        }

        searchResult = searchResult.map(product => ({
            ...product,
            reviews: product.reviews || []
        }));

        searchResult.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        res.json(searchResult);
    } catch (error) {
        console.error('Error in searchProducts:', error);
        next(error);
    }
};

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
    filterProduct,
    filterByPrice,
    searchProducts
};
const express = require('express');
const router = express.Router();
const usercontroller = require('../controller/user/userController');
const Passport = require('passport');
const { userAuth, adminAuth } = require('../middlewares/auth');
const customerController = require('../controller/admin/customerController');
const productController = require('../controller/user/productController');
const profileController = require('../controller/user/profileController');

router.get('/pageNotFound', usercontroller.pageNotFound);

router.get('/', usercontroller.loadhomepage);
router.get('/signup', usercontroller.loadsignup);
router.post('/signup', usercontroller.signup);
router.post('/verify-otp', usercontroller.verifyOTP);
router.post('/resend-Otp', usercontroller.resendOTP);

router.get('/auth/google', Passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
    Passport.authenticate('google', { failureRedirect: '/signup' }),
    usercontroller.googleAuthCallback 
);

router.get('/login', usercontroller.loadlogin);
router.post('/login', usercontroller.login);
router.get('/logout', usercontroller.logout);
router.get('/users', adminAuth, customerController.customerInfo);

router.get('/', usercontroller.loadhomepage);
router.get('/shop', usercontroller.loadShoppingPage);
router.get('/filter', usercontroller.filterProducts);

//product Management
router.get('/product-details',productController.productDetails)

//profile management
router.get("/forgot-password", profileController.getForgetPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/verify-passForgot-otp", profileController.getVerifyForgotOTPPage);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/reset-password", profileController.postNewPassword);
router.post("/resend-forgot-otp", profileController.resendOtp);
// router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.get("/change-password", userAuth, profileController.changePassword);
router.post("/change-password", userAuth, profileController.changePasswordValid);
router.post("/verify-changepassword-otp", userAuth, profileController.verifyChangePassOtp);
router.get("/userProfile",profileController.userProfile)
router.get('/change-email',profileController.changeEmail)
router.post('/change-email',profileController.changeEmailValid)
router.post('/verify-email-otp',profileController.verifyEmailOtp)
router.post('/update-email',profileController.updateEmail)

module.exports = router;
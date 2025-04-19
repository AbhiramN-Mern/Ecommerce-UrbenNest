const express = require('express');
const router = express.Router();
const usercontroller = require('../controller/user/userController');
const Passport = require('passport');
const { userAuth, adminAuth } = require('../middlewares/auth');
const customerController = require('../controller/admin/customerController');
const productController = require('../controller/user/productController');
const profileController = require('../controller/user/profileController');
const wishlistController=require("../controller/user/wishlistcontroller")
const CartController=require("../controller/user/cartController")
const orderController = require('../controller/user/orderController');
require('dotenv').config();

const razorpay = require("../config/razorpay");



router.get('/pageNotFound', usercontroller.pageNotFound);
router.get('/contact',usercontroller.loadContact)


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
router.get("/change-password",  profileController.changePassword);
router.post("/change-password", profileController.changePasswordValid);
router.post("/verify-changepassword-otp", profileController.verifyChangePassOtp);
router.get("/userProfile",profileController.userProfile)
router.get('/change-email',profileController.changeEmail)
router.post('/change-email',profileController.changeEmailValid)
router.post('/verify-email-otp',profileController.verifyEmailOtp)
router.post('/update-email',profileController.updateEmail)
// router.get('/change-password',profileController.changePassword)

//Address Managememnt
router.get("/addAddress",profileController.addAddress)
router.post('/addAddress',profileController.postAddAddress)
router.get('/editAddress',profileController.editAddress)
router.post('/editAddress',profileController.postEditAddress)
router.get('/deleteAddress',profileController.deleteAddress)

router.post("/wallet/addMoney", profileController.addMoneyToWallet);
router.post("/wallet/paymentSuccess", profileController.walletPaymentSuccess);

//wishList Management
router.get('/wishlist',wishlistController.loadWishList)
router.post("/addTOWishlist",wishlistController.addToWishlist)
router.get('/removeFromWishlist',wishlistController.removeProduct)


//cart Management

router.get("/cart", CartController.getCartPage);
router.post("/addToCart", CartController.addToCart);
router.delete("/deleteItem", CartController.deleteItem);
router.post("/changeQuantity", CartController.changeQuantity);
router.post("/checkProductInCart", CartController.checkProductInCart);
router.get("/getCartCount", CartController.getCartCount); 


//Order Management
router.get("/checkout", orderController.getCheckoutPage);
router.get("/deleteItem", orderController.deleteProduct); 
router.post("/orderPlaced", orderController.orderPlaced);
router.post("/applyCoupon", orderController.applyCoupon);
router.get("/orderDetails", orderController.getOrderDetailsPage);
router.put("/cancelOrder", orderController.cancelOrder); 
router.put("/returnrequestOrder", orderController.returnorder); 
router.put("/singleProductId", orderController.changeSingleProductStatus); 
router.get("/downloadInvoice/:orderId", orderController.downloadInvoice);
router.post("/create-razorpay-order",orderController. createRazorpayOrder);
router.post("/verify-razorpay-payment", orderController.verifyRazorpayPayment);
router.get('/availableCoupons', orderController.getAvailableCoupons);
router.post('/removeCoupon', orderController.removeCoupon);


module.exports = router;
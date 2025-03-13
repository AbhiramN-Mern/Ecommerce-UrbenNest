const express = require('express');
const router = express.Router();
const usercontroller = require('../controller/user/userController');
const Passport = require('passport');
const {userAuth,adminAuth}=require('../middlewares/auth')
const customerController = require('../controller/admin/customerController')

router.get('/pageNotFound', usercontroller.pageNotFound);

router.get('/', usercontroller.loadhomepage);
router.get('/signup', usercontroller.loadsignup);
router.post('/signup', usercontroller.signup);
router.post('/verify-otp', usercontroller.verifyOTP);
router.post('/resend-Otp', usercontroller.resendOTP);

// router.get('/auth/google',Passport.authenticate('google',{scope:['prof','email']}))
router.get('/auth/google', Passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback',Passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})

router.get('/login',usercontroller.loadlogin);
router.post('/login',usercontroller.login)
router.get('/logout',usercontroller.logout)
router.get('/users', adminAuth, customerController.customerInfo)

//shopPage&&homePage
router.get('/',usercontroller.loadhomepage)
router.get('/shop', usercontroller.loadShoppingPage);
router.get('/filter', usercontroller.filterProduct);
router.get('/filterByPrice', usercontroller.filterByPrice);
router.get("/search", usercontroller.searchProducts);

module.exports = router;
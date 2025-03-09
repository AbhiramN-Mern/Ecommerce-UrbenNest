const express = require('express');
const router = express.Router();
const usercontroller = require('../controller/user');
const Passport = require('passport');

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
module.exports = router;
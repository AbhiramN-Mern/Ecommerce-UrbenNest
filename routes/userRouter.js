const express = require('express');
const router = express.Router();
const usercontroller = require('../controller/user');

router.get('/pageNotFound', usercontroller.pageNotFound);

router.get('/', usercontroller.loadhomepage);
router.get('/signup', usercontroller.loadsignup);
router.post('/signup', usercontroller.signup);
router.post('/verify-otp', usercontroller.verifyOTP);
router.post('/resend-Otp', usercontroller.resendOTP);

module.exports = router;
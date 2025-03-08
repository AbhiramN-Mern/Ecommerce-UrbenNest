const express=require('express')
const router=express.Router()
const usercontroller=require('../controller/user')

router.get('/pageNotFound',usercontroller.pageNotFound)
router.get('/',usercontroller.loadhomepage)
router.get('/signup',usercontroller.loadsignup)
router.post('/signup',usercontroller.signup)

module.exports=router
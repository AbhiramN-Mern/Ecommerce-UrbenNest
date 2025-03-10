const express=require('express')
const router=express.Router()
const adminController=require('../controller/adminController')
const {userAuth,adminAuth}=require('../middlewares/auth')

router.get('/login',adminController.loadlogin)
router.post('/login',adminController.login)
router.get('/dashbord',adminAuth,adminController.loadDashbord)


module.exports=router
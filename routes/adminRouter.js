const express=require('express')
const router=express.Router()
const adminController=require('../controller/adminController')

router.get('/login',adminController.loadlogin)
router.post('/login',adminController.login)
router.get('/dashbord',adminController.loadDashbord)


module.exports=router
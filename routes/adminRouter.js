const express = require('express')
const router = express.Router()
const adminController = require('../controller/admin/adminController')
const { userAuth, adminAuth } = require('../middlewares/auth')
const categoryController=require('../controller/admin/categoryController')
const { customerInfo, customerBlocked, customerUnblocked } = require('../controller/admin/customerController')

router.get('/login', adminController.loadlogin)
router.post('/login', adminController.login)
router.get('/dashbord', adminAuth, adminController.loadDashbord)
router.get('/logout', adminController.logout)

// customerManagement
router.get('/customers',adminAuth, customerInfo);
router.patch('/customers/:id/block', customerBlocked);
router.patch('/customers/:id/unblock', customerUnblocked);

//catogery management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/Category',adminAuth,categoryController.addCategory)
router.get('/listCategory',adminAuth,categoryController.getlisteCategory)
router.get('/unlistCategory',adminAuth,categoryController.getunlisteCategory)
router.get('/editCategory/:id',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)
module.exports = router;
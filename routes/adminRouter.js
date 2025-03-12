const express = require('express')
const router = express.Router()
const adminController = require('../controller/admin/adminController')
const { userAuth, adminAuth } = require('../middlewares/auth')
const brandController=require('../controller/admin/brandController')
const categoryController=require('../controller/admin/categoryController')
const { customerInfo, customerBlocked, customerUnblocked } = require('../controller/admin/customerController')
const multer=require('multer')
const storege=require("../helpers/multer")
const getBrandPage = require('../controller/admin/brandController')
const upload = require('../helpers/multer');  // Import the multer instance directly

const uplods=multer({storage:storege})

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

//Brand Management
router.get('/brands',adminAuth,brandController.getBrandPage)
router.post('/addBrand',adminAuth,upload.single('image'),brandController.addBrand)

module.exports = router;
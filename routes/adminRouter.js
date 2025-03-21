const express = require('express')
const router = express.Router()
const adminController = require('../controller/admin/adminController')
const { userAuth, adminAuth } = require('../middlewares/auth')
const brandController=require('../controller/admin/brandController')
const categoryController=require('../controller/admin/categoryController')
const { customerInfo, customerBlocked, customerUnblocked } = require('../controller/admin/customerController')
const prouctControllr=require('../controller/admin/productController')
const multer=require('multer')
const storege=require("../helpers/multer")
const getBrandPage = require('../controller/admin/brandController')
const upload = require('../helpers/multer'); 
const product = require('../models/productSchema')

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
router.get('/blockBrand',adminAuth,brandController.blockBrand)
router.get('/unblockBrand',adminAuth,brandController.unblockBrand)
router.get('/deleteBrand',adminAuth,brandController.deleteBrand)

//prodect ManageMent
router.get('/product-add', adminAuth,prouctControllr.getProductAddPage);
router.post('/product-add',adminAuth, upload.array("images", 4), prouctControllr.addProducts);
router.get('/products',adminAuth,prouctControllr.getAllProducts)
router.get('/blockProduct',adminAuth,prouctControllr.blockProdeucts)
router.get('/unblockProduct',adminAuth,prouctControllr.unblockProdeucts)
router.get("/editProduct", adminAuth, prouctControllr.getEditProduct);
router.post("/editProduct/:id", adminAuth, upload.array("images", 4), prouctControllr.editProduct);
router.post("/deleteImage", adminAuth, prouctControllr.deleteSingleImage);
module.exports = router
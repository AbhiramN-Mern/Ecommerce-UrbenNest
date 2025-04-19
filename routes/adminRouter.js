const express = require('express')
const router = express.Router()
const adminController = require('../controller/admin/adminController')
const { userAuth, adminAuth } = require('../middlewares/auth')
const brandController=require('../controller/admin/brandController')
const categoryController=require('../controller/admin/categoryController')
const couponController=require('../controller/admin/coupenController')
const { customerInfo, customerBlocked, customerUnblocked } = require('../controller/admin/customerController')
const productController=require('../controller/admin/productController')
const orderController=require('../controller/admin/orderController')
const multer=require('multer')
const storege=require("../helpers/multer")
const getBrandPage = require('../controller/admin/brandController')
const upload = require('../helpers/multer'); 
const product = require('../models/productSchema')
const walletController = require('../controller/admin/walletController');

// Remove the following line:
// const uploads = multer({ storage: storege });

router.get('/login', adminController.loadlogin)
router.post('/login', adminController.login)
router.get('/dashbord', adminAuth, adminController.loadDashbord)
router.get('/logout', adminController.logout)
router.get("/export-excel", adminAuth, adminController.generateExcelReport);
router.get("/export-pdf", adminAuth, adminController.generatePdfReport);

// customerManagement
router.get('/customers',adminAuth, customerInfo);
router.patch('/customers/:id/block', customerBlocked);
router.patch('/customers/:id/unblock', customerUnblocked);

//catogery management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/category", adminAuth, categoryController.addCategory); 
router.patch("/category/:id/offer", adminAuth, categoryController.addCategoryOffer); 
router.delete("/category/:id/offer", adminAuth, categoryController.removeCategoryOffer); 
router.patch("/category/:id/unlist", adminAuth, categoryController.getListCategory); 
router.patch("/category/:id/list", adminAuth, categoryController.getUnlistCategory); 
router.get("/category/:id/edit", adminAuth, categoryController.getEditCategory); 
router.patch("/category/:id", adminAuth, categoryController.editCategory); 




//Brand Management
router.get('/brands',adminAuth,brandController.getBrandPage)
router.post('/addBrand',adminAuth,upload.single('image'),brandController.addBrand)
router.get('/blockBrand',adminAuth,brandController.blockBrand)
router.get('/unblockBrand',adminAuth,brandController.unblockBrand)
router.get('/deleteBrand',adminAuth,brandController.deleteBrand)

//prodect ManageMent
// router.get("/product-add", adminAuth, productController.getProductAddPage);
// router.post("/product-add", adminAuth, uploads.array("images", 4), productController.addProducts);
// router.get("/products", adminAuth, productController.getAllProducts);
// router.post("/addProductOffer", adminAuth, productController.addProductOffer);
// router.post("/removeProductOffer", adminAuth, productController.removeProductOffer);
// router.get("/blockProduct", adminAuth, productController.blockProduct);
// router.get("/unblockProduct", adminAuth, productController.unblockProduct);
// router.get("/editProduct", adminAuth, productController.getEditProduct);
// router.post("/editProduct/:id", adminAuth, uploads.array("images", 4), productController.editProduct);
// router.post("/deleteImage", adminAuth, productController.deleteSingleImage);
router.get("/product-add", adminAuth, productController.getProductAddPage);
router.post("/product-add", adminAuth, upload.array("images", 4), productController.addProducts);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addProductOffer", adminAuth, productController.addProductOffer);
router.post("/removeProductOffer", adminAuth, productController.removeProductOffer);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post("/editProduct/:id", adminAuth, upload.array("images", 4), productController.editProduct);
router.post("/deleteImage", adminAuth, productController.deleteSingleImage);


// Order Management
router.get("/order-list", adminAuth, orderController.getOrderListPageAdmin);
router.get("/orderDetailsAdmin", adminAuth, orderController.getOrderDetailsPageAdmin);
router.get("/changeStatus", adminAuth, orderController.changeOrderStatus);
router.post("/approveReturn", adminAuth, orderController.approveReturn);
router.post("/rejectReturn", adminAuth, orderController.rejectReturn);
router.post("/shipProduct", adminAuth, orderController.shipProduct);
router.post("/cancelProduct", adminAuth, orderController.cancelProduct);
router.post("/deliverProduct", adminAuth, orderController.deliverProduct);
router.post("/returnProduct", adminAuth, orderController.returnProduct);

// Wallet Management Routes
router.get('/wallet-transactions', adminAuth, walletController.getAllTransactions);
router.get('/wallet-transaction/:transactionId', adminAuth, walletController.getTransactionDetails);
router.get('/wallet-stats', adminAuth, walletController.getWalletStats);

//coupen Management

router.get("/coupon", adminAuth, couponController.loadCoupon);
router.post("/createCoupon", adminAuth, couponController.createCoupon);
router.get("/editCoupon", adminAuth, couponController.editCoupon);
router.post("/updateCoupon", adminAuth, couponController.updateCoupon);
router.patch("/coupon/:id/list", adminAuth, couponController.listCoupon); 
router.patch("/coupon/:id/unlist", adminAuth, couponController.unlistCoupon)


module.exports = router
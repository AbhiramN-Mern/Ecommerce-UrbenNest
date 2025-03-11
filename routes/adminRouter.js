const express = require('express')
const router = express.Router()
const adminController = require('../controller/admin/adminController')
const { userAuth, adminAuth } = require('../middlewares/auth')
const { customerInfo, customerBlocked, customerUnblocked } = require('../controller/admin/customerController')

router.get('/login', adminController.loadlogin)
router.post('/login', adminController.login)
router.get('/dashbord', adminAuth, adminController.loadDashbord)
router.get('/logout', adminController.logout)

// customerManagement
router.get('/customers',adminAuth, customerInfo);
router.patch('/customers/:id/block', customerBlocked);
router.patch('/customers/:id/unblock', customerUnblocked);

module.exports = router;
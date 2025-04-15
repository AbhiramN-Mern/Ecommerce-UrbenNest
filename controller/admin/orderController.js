const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const mongodb = require("mongodb");
const mongoose = require('mongoose');
const env = require("dotenv").config();
const crypto = require("crypto");
const Wallet=require('../../models/walletSchema')
const { v4: uuidv4 } = require('uuid');

const getOrderListPageAdmin = async (req, res, next) => {
    try {
        const orders = await Order.find({}).sort({ createdOn: -1 }).populate('userId', 'email');
        let itemsPerPage = 3;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(orders.length / 3);
        const currentOrder = orders.slice(startIndex, endIndex);
        currentOrder.forEach(order => {
            order.orderId = uuidv4();
        });

        res.render("order-list", { orders: currentOrder, totalPages, currentPage });
    } catch (error) {
        next(error);
    }
};

const changeOrderStatus = async (req, res, next) => {
    try {
        const { orderId, status } = req.query;
        let userId = req.query.userId;

        if (userId.includes('ObjectId')) {
            try {
                userId = userId.match(/ObjectId\('(.+?)'\)/)[1];
            } catch (error) {
                console.error('Error extracting userId:', error);
                return res.status(400).json({ success: false, message: "Invalid user ID format" });
            }
        }

        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID or user ID" });
        }

        const order = await Order.findOneAndUpdate(
            { _id: orderId },
            { $set: { status: status } },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        return res.redirect(`/admin/orderDetailsAdmin?id=${orderId}`);

    } catch (error) {
        console.error('Error in changeOrderStatus:', error);
        next(error);
    }
};

const getOrderDetailsPageAdmin = async (req, res, next) => {
    try {
        const orderId = req.query.id;
        console.log("Order ID:", orderId);

        if (!orderId) {
            throw new Error('Order ID is required');
        }

        const findOrder = await Order.findOne({ _id: orderId })
            .populate('userId', 'email name')
            .sort({ createdOn: 1 });

        if (!findOrder) {
            throw new Error('Order not found');
        }

        console.log("Order Details:", JSON.stringify(findOrder, null, 2));

        
        let totalGrant = 0; 
        findOrder.product.forEach((val) => {
            totalGrant += val.price * val.quantity;
        });

        const totalPrice = findOrder.totalPrice; 
        const discount = findOrder.discount || 0;
        const deliveryCharge = findOrder.deliveryCharge || 0;
        const finalAmount = findOrder.finalAmount; 

        res.render("order-details-admin", {
            orders: findOrder,
            orderId: orderId,
            totalGrant: totalGrant,
            totalPrice: totalPrice,
            discount: discount,
            deliveryCharge: deliveryCharge,
            finalAmount: finalAmount,
        });
    } catch (error) {
        console.error("Error in getOrderDetailsPageAdmin:", error);
        next(error);
    }
};


const orderDetailsAdmin = async (req, res, next) => {
    try {
        const orderId = req.query.id;
        if (!orderId) {
            return res.status(400).send('Order ID is required');
        }

        const findOrder = await Order.findOne({ _id: orderId }).sort({ createdOn: 1 });

        if (!findOrder) {
            return res.status(404).send('Order not found');
        }

        
        let totalGrant = 0;
        findOrder.product.forEach((val) => {
            totalGrant += val.price * val.quantity;
        });

        const totalPrice = findOrder.totalPrice;
        const discount = totalGrant - totalPrice;
        const finalAmount = totalPrice; 

        
        findOrder.product.forEach((product) => {
            product.quantity = product.quantity || 1; 
        });

        res.render("orderDetails", {
            order: findOrder,
            orderId: orderId,
            finalAmount: finalAmount,
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};



const approveReturn = async (req, res, next) => {
  try {
    const { orderId, productId } = req.body;
    
    // Validate order and product IDs
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID or product ID" });
    }
    
    // Find the order
    const order = await Order.findOne({ _id: orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    
    // Locate the product in the order
    const productIndex = order.product.findIndex(p => p._id.toString() === productId);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: "Product not found in order" });
    }
    
    const productData = order.product[productIndex];
    
    // Check that return was requested
    if (productData.productStatus !== "Return Requested") {
      return res.status(400).json({ success: false, message: "Return request is not pending for this product" });
    }
    
    // Mark product as Returned and approved
    order.product[productIndex].productStatus = "Returned";
    order.product[productIndex].returnStatus = "Approved";
    
    // Save order changes first
    await order.save();
    
    // Calculate refund as full product price (coupon discount is NOT subtracted)
    const refundAmount = productData.price * productData.quantity;
    
    // Refund to user's wallet regardless of payment method
    const userId = order.userId;
    let userWallet = await Wallet.findOne({ user: userId });
    if (!userWallet) {
      // Create a new Wallet if one doesn't exist
      userWallet = new Wallet({
        user: userId,
        balance: refundAmount,
        history: [{
          amount: refundAmount,
          status: "credit",
          date: new Date(),
          description: `Refund for returned order ${orderId} product ${productId}`
        }]
      });
      await userWallet.save();
    } else {
      // Update existing wallet
      userWallet.balance += refundAmount;
      userWallet.history.push({
        amount: refundAmount,
        status: "credit",
        date: new Date(),
        description: `Refund for returned order ${orderId} product ${productId}`
      });
      await userWallet.save();
    }
    
    // Optionally update product stock
    if (productData.productId) {
      await Product.findByIdAndUpdate(
        productData.productId,
        { $inc: { quantity: productData.quantity } }
      );
    }
    
    return res.status(200).json({ success: true, message: "Return approved successfully and refund credited to wallet" });
  } catch (error) {
    console.error("Error in approveReturn:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
  
const rejectReturn = async (req, res, next) => {
    try {
        console.log('Return rejection request received:', req.body);
        const { orderId, productId } = req.body;

        // Validate MongoDB ObjectIds
        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID or product ID"
            });
        }

        // Find order and update product status atomically
        const order = await Order.findOneAndUpdate(
            {
                _id: orderId,
                'product._id': productId,
                'product.productStatus': 'Return Requested'
            },
            {
                $set: {
                    'product.$.productStatus': 'Delivered',
                    'product.$.returnStatus': 'Rejected'
                }
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found or product not in return requested status"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Return request rejected successfully"
        });

    } catch (error) {
        console.error('Error in rejectReturn:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const shipProduct = async (req, res, next) => {
    try {
        console.log('Ship product request received:', req.body);
        const { orderId, productId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID or product ID"
            });
        }

        const order = await Order.findOneAndUpdate(
            {
                _id: orderId,
                'product._id': productId,
                'product.productStatus': 'Confirmed'
            },
            {
                $set: {
                    'product.$.productStatus': 'Shipped',
                    'product.$.shippedDate': new Date()
                }
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found or product not in confirmed status"
            });
        }

        // Check if all products are shipped
        const allShipped = order.product.every(p => p.productStatus === 'Shipped');
        if (allShipped) {
            order.status = 'Shipped';
            await order.save();
        }

        return res.status(200).json({
            success: true,
            message: "Product shipped successfully"
        });

    } catch (error) {
        console.error('Error in shipProduct:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const cancelProduct = async (req, res, next) => {
    try {
        console.log('Cancel product request received:', req.body);
        const { orderId, productId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID or product ID"
            });
        }

        const order = await Order.findOne({ _id: orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const productIndex = order.product.findIndex(p => p._id.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Product not found in order"
            });
        }

        const productData = order.product[productIndex];
        if (productData.productStatus === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: "Product is already cancelled"
            });
        }

        // Calculate refund amount
        const refundAmount = productData.price * productData.quantity;

        // Update product status
        productData.productStatus = 'Cancelled';
        order.totalPrice -= refundAmount;
        order.finalAmount -= refundAmount;

        // If payment was made, refund to wallet
        if (order.payment !== 'cod') {
            await User.findByIdAndUpdate(
                order.userId,
                {
                    $inc: { wallet: refundAmount },
                    $push: {
                        history: {
                            amount: refundAmount,
                            status: "credit",
                            date: new Date(),
                            description: `Refund for cancelled product in order ${order.orderId}`
                        }
                    }
                }
            );
        }

        // Restore product stock
        if (productData.productId) {
            await Product.findByIdAndUpdate(
                productData.productId,
                { $inc: { quantity: productData.quantity } }
            );
        }

        // Check if all products are cancelled
        const allCancelled = order.product.every(p => p.productStatus === 'Cancelled');
        if (allCancelled) {
            order.status = 'Cancelled';
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Product cancelled successfully"
        });

    } catch (error) {
        console.error('Error in cancelProduct:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const deliverProduct = async (req, res, next) => {
    try {
        console.log('Deliver product request received:', req.body);
        const { orderId, productId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID or product ID"
            });
        }

        const order = await Order.findOneAndUpdate(
            {
                _id: orderId,
                'product._id': productId,
                'product.productStatus': 'Shipped'
            },
            {
                $set: {
                    'product.$.productStatus': 'Delivered',
                    'product.$.deliveredDate': new Date()
                }
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found or product not in shipped status"
            });
        }

        // Check if all products are delivered
        const allDelivered = order.product.every(p => p.productStatus === 'Delivered');
        if (allDelivered) {
            order.status = 'Delivered';
            await order.save();
        }

        return res.status(200).json({
            success: true,
            message: "Product delivered successfully"
        });

    } catch (error) {
        console.error('Error in deliverProduct:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const returnProduct = async (req, res, next) => {
    try {
        console.log('Return product request received:', req.body);
        const { orderId, productId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID or product ID"
            });
        }

        const order = await Order.findOneAndUpdate(
            {
                _id: orderId,
                'product._id': productId,
                'product.productStatus': 'Delivered'
            },
            {
                $set: {
                    'product.$.productStatus': 'Return Requested',
                    'product.$.returnRequestedDate': new Date()
                }
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found or product not in delivered status"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Return request submitted successfully"
        });

    } catch (error) {
        console.error('Error in returnProduct:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    getOrderListPageAdmin,
    changeOrderStatus,
    getOrderDetailsPageAdmin,
    orderDetailsAdmin,
    approveReturn,
    rejectReturn,
    shipProduct,
    cancelProduct,
    deliverProduct,
    returnProduct
};
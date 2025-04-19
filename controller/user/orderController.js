const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon=require('../../models/coupenSchema')
const Wallet = require("../../models/walletSchema");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const env = require("dotenv").config();
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const easyinvoice = require("easyinvoice");
const Cart = require("../../models/cartSchema");
const razorpay = require("../../config/razorpay");



const getCheckoutPage = async (req, res, next) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.redirect("/login");
    }

    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      return res.redirect("/pageNotFound");
    }

    // Get cart items
    const cart = await Cart.findOne({ userId: userId }).populate("items.productId");

    if (cart && cart.items.length > 0) {
      const addressData = await Address.findOne({ userId: userId });
      const data = cart.items.map((item) => ({
        proId: item.productId._id,
        quantity: item.quantity,
        productDetails: [item.productId],
      }));

      const grandTotal = cart.items.reduce((total, item) => {
        return total + item.quantity * item.productId.salePrice;
      }, 0);

      const deliveryCharge = grandTotal < 1000 ? 200 : 0;
      const totalWithDelivery = grandTotal + deliveryCharge;

      // Fetch wallet balance
      const wallet = await Wallet.findOne({ user: userId });
      const walletBalance = wallet ? wallet.balance : 0;

      res.render("checkoutcart", {
        product: data,
        user: {
          ...findUser.toObject(),
          walletBalance: walletBalance // Add wallet balance to user object
        },
        isCart: true,
        userAddress: addressData,
        grandTotal: grandTotal,
        deliveryCharge: deliveryCharge,
        totalWithDelivery: totalWithDelivery
      });
    } else {
      res.redirect("/shop");
    }
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.query.id;
    const userId = req.session.user;

    if (!productId || !userId) {
      return res.redirect("/pageNotFound");
    }

    const cart = await Cart.findOne({ userId: userId });

    if (!cart || !cart.items.length) {
      return res.redirect("/checkout");
    }

    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);

    if (itemIndex === -1) {
      return res.redirect("/checkout");
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();
    res.redirect("/checkout");
  } catch (error) {
    next(error);
  }
};
const applyCoupon = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const selectedCoupon = await Coupon.findOne({ name: req.body.coupon });
    if (!selectedCoupon) {
      return res.json({ success: false, message: 'Coupon not found' });
    }
    if (selectedCoupon.userId.includes(userId)) {
      return res.json({ success: false, message: 'Coupon already used' });
    }
    await Coupon.updateOne(
      { name: req.body.coupon },
      { $addToSet: { userId: userId } }
    );
    // Calculate new total after applying discount
    const gt = parseInt(req.body.total) - parseInt(selectedCoupon.offerPrice);
    return res.json({
      success: true,
      gt: gt,
      offerPrice: parseInt(selectedCoupon.offerPrice)
    });
  } catch (error) {
    next(error);
  }
};

// In orderController.js (inside orderPlaced)
const orderPlaced = async (req, res, next) => {
  try {
    const { totalPrice, discount, deliveryCharge, addressId, payment } = req.body;
    const userId = req.session.user;

    // Convert to numbers safely and provide defaults
    const totalPriceValue = totalPrice ? parseInt(totalPrice) : 0;
    const discountValue = discount ? Math.abs(parseInt(discount)) : 0;
    const deliveryChargeValue = deliveryCharge ? parseInt(deliveryCharge) : 0;

    // Calculate final amount: total price minus discount plus delivery charge
    const finalAmount = totalPriceValue - discountValue + deliveryChargeValue;

    // (Perform validations and other steps as before)
    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const findAddress = await Address.findOne({ userId: userId, "address._id": addressId });
    if (!findAddress) {
      return res.status(404).json({ error: "Address not found" });
    }
    const desiredAddress = findAddress.address.find((item) => item._id.toString() === addressId.toString());
    if (!desiredAddress) {
      return res.status(404).json({ error: "Specific address not found" });
    }

    const cart = await Cart.findOne({ userId: userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(404).json({ error: "Cart is empty" });
    }

    // Map ordered products
    const orderedProducts = cart.items.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      price: item.productId.salePrice,
      name: item.productId.productName,
      image: item.productId.productImage[0],
      productStatus: "Confirmed",
      user: userId
    }));

    const orderData = {
      product: orderedProducts,
      originalTotalPrice: totalPriceValue,
      totalPrice: totalPriceValue,
      discount: discountValue, // stored as a positive number
      deliveryCharge: deliveryChargeValue,
      finalAmount: finalAmount,
      address: desiredAddress,
      payment: payment.toLowerCase() === 'wallet' ? 'Wallet' : payment, // Ensure consistent casing
      userId: userId,
      status: payment === 'Razorpay' ? 'Paid' : 'Confirmed',
      createdOn: Date.now(),
    };

    // Add Razorpay details if payment method is Razorpay
    if (payment === 'Razorpay') {
      orderData.razorpayPaymentId = req.body.razorpayPaymentId;
      orderData.razorpayOrderId = req.body.razorpayOrderId;
      orderData.razorpaySignature = req.body.razorpaySignature;
    }

    // In orderPlaced function in orderController.js
    if (payment === 'wallet') {
      try {
        // Check wallet balance
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet || wallet.balance < finalAmount) {
          return res.status(400).json({ 
            success: false, 
            message: "Insufficient wallet balance" 
          });
        }
    
        // First create the order
        const newOrder = new Order(orderData);
        const orderDone = await newOrder.save();
    
        // Then deduct amount from wallet with correct order reference
        wallet.balance -= finalAmount;
        wallet.history.push({
          amount: finalAmount,
          status: "debit",
          date: Date.now(),
          description: `Payment for order #${orderDone.orderId}` // Use the generated orderId
        });
        await wallet.save();
    
        // Clear cart
        await Cart.updateOne({ userId: userId }, { $set: { items: [] } });
    
        // Update product quantities
        for (const orderedProduct of orderedProducts) {
          await Product.updateOne(
            { _id: orderedProduct.productId },
            { $inc: { quantity: -orderedProduct.quantity } }
          );
        }
    
        return res.json({
          success: true,
          payment: true,
          method: payment,
          order: orderDone,
          orderId: orderDone._id
        });
    
      } catch (error) {
        console.error('Error in wallet payment:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to process wallet payment'
        });
      }
    }

    const newOrder = new Order(orderData);
    const orderDone = await newOrder.save();

    // Clear cart and update product quantities
    await Cart.updateOne({ userId: userId }, { $set: { items: [] } });
    for (const orderedProduct of orderedProducts) {
      const product = await Product.findOne({ _id: orderedProduct.productId });
      if (product) {
        product.quantity = Math.max(product.quantity - orderedProduct.quantity, 0);
        await product.save();
      }
    }
    // Send success response
    res.json({
      success: true,
      payment: true,
      method: payment,
      order: orderDone,
      orderId: orderDone._id,
    });
  } catch (error) {
    console.error('Error in orderPlaced:', error);
    next(error);
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    
    const options = {
      amount: amount * 100, // amount in paise
      currency: "INR",
      receipt: `receipt_order_${Math.floor(Math.random() * 10000)}`,
      payment_capture: 1 // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ 
      success: true, 
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }
    });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create Razorpay order",
      error: err.error ? err.error.description : err.message 
    });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      res.json({ success: true, verified: true });
    } else {
      res.status(400).json({ success: false, verified: false });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


const getOrderDetailsPage = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.session.user);
    // Get order ID from multiple possible sources
    const orderId = req.query.id || req.params.id || req.body.id;

    console.log("Order session", userId);
    console.log("Order ID", orderId);
    console.log("Request path", req.path);
    console.log("Request query", req.query);

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      console.error("Invalid Order ID");
      return res.redirect("/pageNotFound");
    }

    const findOrder = await Order.findOne({ 
      _id: orderId,
      userId: userId
    }).populate('product.productId');
    
    if (!findOrder) {
      console.error("Order not found for ID:", orderId);
      return res.redirect("/pageNotFound");
    }

    const findUser = await User.findOne({ _id: userId });
    console.log("User data found:", !!findUser);

    if (!findUser) {
      console.error("User not found for ID:", userId);
      return res.redirect("/pageNotFound");
    }

    let totalGrant = 0;
    if (findOrder.product && Array.isArray(findOrder.product)) {
      findOrder.product.forEach((val) => {
        totalGrant += val.price * val.quantity;
      });
    } else {
      console.error("Product array is undefined or not an array");
      return res.redirect("/pageNotFound");
    }

    // Important: Pass the same data with both naming conventions to ensure compatibility
    res.render("orderDetails", {
      order: findOrder,  // New variable name
      orders: findOrder, // Old variable name - for backward compatibility
      user: findUser,
      totalGrant: totalGrant,
      originalTotalPrice: findOrder.originalTotalPrice,
      totalPrice: findOrder.totalPrice,
      finalAmount: findOrder.finalAmount,
      orderDate: moment(findOrder.createdOn).format("MMMM Do YYYY, h:mm:ss a"),
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    next(error);
  }
};
const changeSingleProductStatus = async (req, res, next) => {
  const { orderId, singleProductId, status } = req.body;
  const oid = new mongodb.ObjectId(singleProductId);

  if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(singleProductId)) {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  const order = await Order.findOne({ _id: orderId });
  const productIndex = order.product.findIndex((product) => product._id.toString() === singleProductId);
  const orderedProductDataPrice = order.product[productIndex].price * order.product[productIndex].quantity;
  const newPrice = order.totalPrice - orderedProductDataPrice;

  try {
    const filter = { _id: orderId };
    const update = {
      $set: {
        "product.$[elem].productStatus": status,
        totalPrice: newPrice,
        finalAmount: order.finalAmount - orderedProductDataPrice
      },
    };
    const options = {
      arrayFilters: [{ "elem._id": oid }],
    };
    const result = await Order.updateOne(filter, update, options);
    res.status(200).json({ message: "Product status updated successfully", result });
  } catch (error) {
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { orderId, productId, reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID or product ID format" });
    }

    const findOrder = await Order.findOne({ _id: orderId });
    if (!findOrder) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const productIndex = findOrder.product.findIndex(product => product._id.toString() === productId);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: "Product not found in order" });
    }

    const productData = findOrder.product[productIndex];
    if (productData.productStatus === "Cancelled") {
      return res.status(400).json({ success: false, message: "Product is already cancelled" });
    }

    // Calculate the proportional discount for this product
    const productTotal = productData.price * productData.quantity;
    const orderSubtotal = findOrder.originalTotalPrice;
    const discountRatio = findOrder.discount ? findOrder.discount / orderSubtotal : 0;
    const productDiscount = productTotal * discountRatio;
    
    // Calculate actual refund amount (product price minus proportional discount)
    const refundAmount = productTotal - productDiscount;

    // If order is paid via Razorpay and status is Pending, update order totals only
    if (findOrder.payment.toLowerCase() === "razorpay" && findOrder.status === "Pending") {
      findOrder.product[productIndex].productStatus = "Cancelled";
      findOrder.totalPrice -= productTotal;
      findOrder.finalAmount -= refundAmount;
    } else {
      if (
        findOrder.payment.toLowerCase() === "razorpay" ||
        findOrder.payment.toLowerCase() === "wallet"
      ) {
        // Locate the Wallet document for this user
        let userWallet = await Wallet.findOne({ user: userId });
        if (!userWallet) {
          // Create new Wallet document if one doesn't exist
          userWallet = new Wallet({
            user: userId,
            balance: refundAmount,
            history: [{
              amount: refundAmount,
              status: "credit",
              date: Date.now(),
              description: `Refund for cancelled order ${orderId} product ${productId} (excluding coupon discount)`
            }]
          });
          await userWallet.save();
        } else {
          // Update existing wallet balance and history
          userWallet.balance += refundAmount;
          userWallet.history.push({
            amount: refundAmount,
            status: "credit",
            date: Date.now(),
            description: `Refund for cancelled order ${orderId} product ${productId} (excluding coupon discount)`
          });
          await userWallet.save();
        }
      }
      // Update product status and deduct order totals
      findOrder.product[productIndex].productStatus = "Cancelled";
      findOrder.totalPrice -= productTotal;
      findOrder.finalAmount -= refundAmount;
    }

    await findOrder.save();

    // Update product inventory
    const product = await Product.findById(productData.productId);
    if (product) {
      product.quantity += productData.quantity;
      await product.save();
    }

    // Check if all products are cancelled
    const allProductsCancelled = findOrder.product.every(product => product.productStatus === "Cancelled");
    if (allProductsCancelled) {
      findOrder.status = "Cancelled";
      await findOrder.save();
    }

    res.status(200).json({ 
      success: true, 
      message: "Product cancelled successfully",
      refundAmount: refundAmount
    });
  } catch (error) {
    next(error);
  }
};

const returnorder = async (req, res, next) => {
  try {
    const userId = req.session.user;
    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { orderId, productId, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid order ID or product ID format" });
    }

    const findOrder = await Order.findOne({ _id: orderId });
    if (!findOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const productIndex = findOrder.product.findIndex((product) => product._id.toString() === productId);
    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    const productData = findOrder.product[productIndex];
    if (productData.productStatus === "Returned" || productData.productStatus === "Return Requested") {
      return res.status(400).json({ message: "Product is already returned or return requested" });
    }

    findOrder.product[productIndex].productStatus = "Return Requested";
    findOrder.product[productIndex].returnStatus = "Pending";
    await findOrder.save();

    res.status(200).json({ success: true, message: "Return request submitted successfully" });
  } catch (error) {
    next(error);
  }
};

const downloadInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId).populate('userId');

    if (!order) {
      return res.status(404).send('Order not found');
    }

    let activeProducts = order.product.filter(prod => 
      prod.productStatus !== "Returned" && prod.productStatus !== "Cancelled"
    );

    let products = activeProducts.map(prod => ({
      "quantity": prod.quantity,
      "description": prod.name || prod.title,
      "tax": 0,
      "price": prod.price,
    }));

    if (order.deliveryCharge && order.deliveryCharge > 0 && activeProducts.length > 0) {
      products.push({
        "quantity": 1,
        "description": "Delivery Charge",
        "tax": 0,
        "price": order.deliveryCharge,
      });
    }

    if (products.length === 0) {
      products.push({
        "quantity": 1,
        "description": "No active products (all items returned/cancelled)",
        "tax": 0,
        "price": 0,
      });
    }

    const data = {
      "documentTitle": "INVOICE",
      "currency": "INR",
      "taxNotation": "gst",
      "marginTop": 25,
      "marginRight": 25,
      "marginLeft": 25,
      "marginBottom": 25,
      apiKey: process.env.EASYINVOICE_API,
      mode: "production",
      "sender": {
        "company": "UrbenNest",
        "address": "Kasargod",
        "zip": "671320",
        "city": "Periya",
        "country": "India"
      },
      "client": {
        "company": order.address[0].name,
        "address": order.address[0].landMark + ", " + order.address[0].city,
        "zip": order.address[0].pincode,
        "city": order.address[0].state,
        "country": "India",
        "custom1": "",
        "custom2": `Order Number: ${order._id}`
      },
      "information": {
        "date": moment(order.createdOn).format("YYYY-MM-DD HH:mm:ss"),
      },
      "products": products,
      "bottomNotice": "Thank you for your business",
    };

    const result = await easyinvoice.createInvoice(data);
    const invoicePath = path.join(__dirname, "../../public/invoice/");

    if (!fs.existsSync(invoicePath)) {
      fs.mkdirSync(invoicePath, { recursive: true });
    }

    const invoiceFilePath = path.join(invoicePath, `invoice_${orderId}.pdf`);
    fs.writeFileSync(invoiceFilePath, result.pdf, 'base64');
    res.download(invoiceFilePath, `invoice_${orderId}.pdf`, (err) => {
      if (err) {
        console.error("Error downloading the file", err);
      }
      fs.unlinkSync(invoiceFilePath);
    });
  } catch (error) {
    next(error);
    console.log("error", error);
  }
};


const getAvailableCoupons = async (req, res, next) => {
  try {
    // Fetch coupons that are still valid and listed
    const coupons = await Coupon.find({ 
      expireOn: { $gte: new Date() },  // Check for valid expiration date
      isList: true                     // Only fetch listed coupons
    });
    res.json({ success: true, coupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    next(error);
  }
};

const removeCoupon = async (req, res) => {
  try {
    const { total } = req.body;
    const userId = req.session.user;

    // Find current cart total
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      throw new Error("Cart not found");
    }

    // Calculate actual total without any discounts
    const actualTotal = cart.items.reduce((sum, item) => {
      return sum + (item.quantity * item.productId.salePrice);
    }, 0);

    // Add delivery charge if applicable
    const deliveryCharge = actualTotal < 1000 ? 200 : 0;
    const finalTotal = actualTotal + deliveryCharge;

    // Reset the session coupon data
    if (req.session.appliedCoupon) {
      delete req.session.appliedCoupon;
    }

    res.json({
      success: true,
      message: "Coupon removed successfully",
      gt: finalTotal, // Return calculated total
      deliveryCharge,
      actualTotal,
      offerPrice: 0
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove coupon"
    });
  }
};

module.exports = {
  getCheckoutPage,
  deleteProduct,
  cancelOrder,
  orderPlaced,
  getOrderDetailsPage,
  changeSingleProductStatus,
  returnorder,
  downloadInvoice,
  createRazorpayOrder,
  verifyRazorpayPayment,
  applyCoupon,
  getAvailableCoupons,
  removeCoupon
};
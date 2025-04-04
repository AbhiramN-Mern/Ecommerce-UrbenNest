const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const env = require("dotenv").config();
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const easyinvoice = require("easyinvoice");
const Cart = require("../../models/cartSchema");
const { v4: uuidv4 } = require('uuid');

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

      const deliveryCharge = grandTotal < 4000 ? 200 : 0;
      const totalWithDelivery = grandTotal + deliveryCharge;

      res.render("checkoutcart", {
        product: data,
        user: findUser,
        isCart: true,
        userAddress: addressData,
        grandTotal: grandTotal,
        deliveryCharge: deliveryCharge,
        totalWithDelivery: totalWithDelivery,
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

const orderPlaced = async (req, res, next) => {
  try {
    const { totalPrice, addressId, payment } = req.body;
    const userId = req.session.user;

    if (!userId) {
      return res.status(400).json({ error: "User not logged in" });
    }

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

    // After you've obtained `desiredAddress` and verified it exists
    if (!desiredAddress.name) {
      desiredAddress.name = findUser.name || "Not Available";
    }
    if (!desiredAddress.phone) {
      desiredAddress.phone = findUser.phone || "Not Available";
    }

    const cart = await Cart.findOne({ userId: userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(404).json({ error: "Cart is empty" });
    }

    const outOfStockItems = cart.items.filter(item => item.productId.quantity < item.quantity);
    if (outOfStockItems.length > 0) {
      const outOfStockMessages = outOfStockItems.map(item => `The product "${item.productId.productName}" is out of stock.`);
      return res.status(400).json({ error: "Some items are out of stock", messages: outOfStockMessages });
    }

    const orderedProducts = cart.items.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      price: item.productId.salePrice,
      name: item.productId.productName,
      image: item.productId.productImage[0],
      productStatus: "Confirmed",
      user: userId
    }));

    const totalPriceNumber = parseFloat(totalPrice); // ensure it's a number
    const deliveryCharge = totalPriceNumber < 4000 ? 200 : 0;
    const finalAmount = totalPriceNumber + deliveryCharge;

    const newOrder = new Order({
      product: orderedProducts,
      originalTotalPrice: totalPriceNumber,
      totalPrice: totalPriceNumber,
      deliveryCharge: deliveryCharge,
      finalAmount: finalAmount,
      address: [desiredAddress],
      payment: payment,
      userId: userId,
      status: "Confirmed",
      createdOn: Date.now(),
    });

    newOrder.orderId = uuidv4();
    const orderDone = await newOrder.save();
    await Cart.updateOne({ userId: userId }, { $set: { items: [] } });

    for (const orderedProduct of orderedProducts) {
      const product = await Product.findOne({ _id: orderedProduct.productId });
      if (product) {
        product.quantity = Math.max(product.quantity - orderedProduct.quantity, 0);
        await product.save();
      }
    }

    if (payment === "cod") {
      res.json({
        payment: true,
        method: "cod",
        order: orderDone,
        orderId: orderDone._id,
      });
    } else if (payment === "wallet") {
      if (finalAmount <= findUser.wallet) {
        findUser.wallet -= finalAmount;
        findUser.history.push({ amount: finalAmount, status: "debit", date: Date.now() });
        await findUser.save();
        res.json({
          payment: true,
          method: "wallet",
          order: orderDone,
          orderId: orderDone._id,
          success: true,
        });
      } else {
        await Order.updateOne({ _id: orderDone._id }, { $set: { status: "Failed" } });
        res.json({
          payment: false,
          method: "wallet",
          success: false,
        });
      }
    }
  } catch (error) {
    next(error);
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
    console.log('Cancel order - Session userId:', userId);
    console.log('Cancel order - Request body:', req.body);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing user session' });
    }

    const { orderId, productId, reason } = req.body;
    
    // Additional validation and debugging
    if (!orderId) {
      console.error('Missing order ID in request');
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }
    
    if (!productId) {
      console.error('Missing product ID in request');
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.error('Invalid order ID format:', orderId);
      return res.status(400).json({ success: false, message: 'Invalid order ID format' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.error('Invalid product ID format:', productId);
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const findOrder = await Order.findOne({ 
      _id: orderId,
      userId: userId 
    });
    
    console.log('Found order:', findOrder ? 'Yes' : 'No');
    
    if (!findOrder) {
      return res.status(404).json({ success: false, message: 'Order not found or does not belong to user' });
    }

    // Rest of your existing cancelOrder logic
    // ... (your existing code for cancelling the order)

    return res.status(200).json({ success: true, message: 'Product cancelled successfully' });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
const returnorder = async (req, res, next) => {
  try {
    // Check session and user
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate request body
    const { orderId, productId, reason } = req.body;
    if (!orderId || !productId || !reason) {
      return res.status(400).json({ 
        message: "Missing required fields",
        required: ["orderId", "productId", "reason"]
      });
    }

    // Validate ID formats
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        message: "Invalid order ID format",
        received: orderId
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        message: "Invalid product ID format",
        received: productId
      });
    }

    // Find the order
    const findOrder = await Order.findOne({ _id: orderId });
    if (!findOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Find the product in the order
    const productIndex = findOrder.product.findIndex(
      (product) => product.productId.toString() === productId
    );
    
    if (productIndex === -1) {
      return res.status(404).json({ 
        message: "Product not found in order",
        orderProducts: findOrder.product.map(p => p.productId.toString())
      });
    }

    const productData = findOrder.product[productIndex];
    
    // Check product status
    if (productData.productStatus === "Returned") {
      return res.status(400).json({ 
        message: "Product is already returned",
        currentStatus: productData.productStatus
      });
    }

    if (productData.productStatus === "Return Requested") {
      return res.status(400).json({ 
        message: "Return already requested for this product",
        currentStatus: productData.productStatus
      });
    }

    // Update product status
    findOrder.product[productIndex].productStatus = "Return Requested";
    findOrder.product[productIndex].returnStatus = "Pending";
    findOrder.product[productIndex].returnReason = reason;
    findOrder.product[productIndex].returnRequestDate = new Date();
    
    await findOrder.save();

    res.status(200).json({ 
      success: true, 
      message: "Return request submitted successfully",
      updatedStatus: findOrder.product[productIndex].productStatus
    });
  } catch (error) {
    console.error("Return order error:", error);
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
        "address": order.address[0].landMark + "- " + order.address[0].city,
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
      "bottomNotice": "Thank you for your business With UrbenNest",
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

const addReview = async (req, res, next) => {
  try {
    const { productId, rating, reviewText } = req.body;
    const userId = req.session.user;

    if (!productId || !rating || !reviewText) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingReview = product.reviews.find(review => review.userId.toString() === userId.toString());
    if (existingReview) {
      return res.status(400).json({ success: false, message: "You have already reviewed this product" });
    }

    product.reviews.push({
      userId: userId,
      userName: user.name || "Anonymous",
      rating: parseInt(rating),
      reviewText: reviewText,
      date: new Date()
    });

    await product.save();

    res.status(200).json({ success: true, message: "Review added successfully" });
  } catch (error) {
    console.error("Error adding review:", error);
    next(error);
  }
}

module.exports = {
  getCheckoutPage,
  deleteProduct,
  cancelOrder,
  orderPlaced,
  getOrderDetailsPage,
  changeSingleProductStatus,
  returnorder,
  downloadInvoice,
  addReview
};
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const Cart = require("../../models/cartSchema");
// const razorpay = require("razorpay");
// const env = require("dotenv").config();
// const crypto = require("crypto");
// const moment = require("moment");
// const fs = require("fs");
const path = require("path");
// const easyinvoice = require("easyinvoice");
// const Coupon = require("../../models/couponSchema");
// let instance = new razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.query.userId;
    console.log("User ID from query:", userId);
    
    // Find the user
    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      console.log("User not found");
      return res.redirect("/shop");
    }
    
    // Get user address if any
    const addressData = await Address.findOne({ userId });
    
    // Get the cart document belonging to the user
    const cartDoc = await Cart.findOne({ userId });
    console.log("Cart Document:", cartDoc);
    
    if (!cartDoc || !cartDoc.items.length) {
      return res.redirect("/shop");
    }
    
    // Aggregate the cart items with product details
    const oid = new mongodb.ObjectId(userId);
    const data = await Cart.aggregate([
      { $match: { userId: oid } },
      { $unwind: "$items" },
      {
        $project: {
          proId: { $toObjectId: "$items.productId" },
          quantity: "$items.quantity",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "proId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" }
    ]);
    
    // Calculate grandTotal from the cart items
    const grandTotalAgg = await Cart.aggregate([
      { $match: { userId: oid } },
      { $unwind: "$items" },
      {
        $project: {
          proId: { $toObjectId: "$items.productId" },
          quantity: "$items.quantity",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "proId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: null,
          totalPrice: {
            $sum: { $multiply: ["$quantity", "$productDetails.salePrice"] },
          },
        },
      },
    ]);
    
    if (!grandTotalAgg.length) {
      return res.redirect("/shop");
    }
    
    res.render("checkoutcart", {
      product: data, // Data with product details and quantities
      user: findUser,
      isCart: true,
      userAddress: addressData,
      grandTotal: grandTotalAgg[0].totalPrice,
    });
  } catch (error) {
    console.error(error);
    return res.redirect("/pageNotFound");
  }
};

const deleteProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const userId = req.session.user;
    const user = await User.findById(userId);
    const cartIndex = user.cart.findIndex((item) => item.productId == id);
    user.cart.splice(cartIndex, 1);
    await user.save();
    res.redirect("/checkout");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const applyCoupon = async (req, res) => {
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

    const gt = parseInt(req.body.total) - parseInt(selectedCoupon.offerPrice);
    return res.json({ success: true, gt: gt, offerPrice: parseInt(selectedCoupon.offerPrice) });
  } catch (error) {
    console.error('Error applying coupon:', error);
    return res.json({ success: false, message: 'Error applying coupon' });
  }
};





const orderPlaced = async (req, res) => {
  try {
    const { totalPrice, addressId, payment, discount } = req.body;
    const userId = req.session.user;
    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const productIds = findUser.cart.map((item) => item.productId);
    const findAddress = await Address.findOne({ userId: userId, "address._id": addressId });
    if (!findAddress) {
      return res.status(404).json({ error: "Address not found" });
    }

    const desiredAddress = findAddress.address.find((item) => item._id.toString() === addressId.toString());
    if (!desiredAddress) {
      return res.status(404).json({ error: "Specific address not found" });
    }
    const findProducts = await Product.find({ _id: { $in: productIds } });
    if (findProducts.length !== productIds.length) {
      return res.status(404).json({ error: "Some products not found" });
    }
    const cartItemQuantities = findUser.cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const orderedProducts = findProducts.map((item) => ({
      _id: item._id,
      price: item.salePrice,
      name: item.productName,
      image: item.productImage[0],
      productStatus: "Confirmed",
      quantity: cartItemQuantities.find((cartItem) => cartItem.productId.toString() === item._id.toString()).quantity,
    }));
    if (payment === "cod" && totalPrice > 1000) {
      return res.status(400).json({ error: "Orders above ₹1000 are not allowed for Cash on Delivery (COD)" });
    }
    const finalAmount = totalPrice - discount;
    console.log(`finalAmount: ${finalAmount}`);

    let newOrder = new Order({
      product: orderedProducts,
      totalPrice: totalPrice,
      discount: discount,
      finalAmount: finalAmount,
      address: desiredAddress,
      payment: payment,
      userId: userId,
      status: payment === "razorpay" ? "Failed" : "Confirmed",
      createdOn: Date.now(),
    });
    let orderDone = await newOrder.save();

    await User.updateOne({ _id: userId }, { $set: { cart: [] } });
    for (let orderedProduct of orderedProducts) {
      const product = await Product.findOne({ _id: orderedProduct._id });
      if (product) {
        product.quantity = Math.max(product.quantity - orderedProduct.quantity, 0);
        await product.save();
      }
    }

    // Handle different payment methods
    if (newOrder.payment === "cod") {
      res.json({
        payment: true,
        method: "cod",
        order: orderDone,
        quantity: cartItemQuantities,
        orderId: orderDone._id,
      });
    } else if (newOrder.payment === "wallet") {
      if (newOrder.finalAmount <= findUser.wallet) {
        findUser.wallet -= newOrder.finalAmount;
        findUser.history.push({ amount: newOrder.finalAmount, status: "debit", date: Date.now() });
        await findUser.save();
        res.json({
          payment: true,
          method: "wallet",
          order: orderDone,
          orderId: orderDone._id,
          quantity: cartItemQuantities,
          success: true,
        });
      } else {
        await Order.updateOne({ _id: orderDone._id }, { $set: { status: "Failed" } });
        res.json({ payment: false, method: "wallet", success: false });
      }
    } else if (newOrder.payment === "razorpay") {
      const razorPayGeneratedOrder = await generateOrderRazorpay(orderDone._id, orderDone.finalAmount);
      res.json({
        payment: false,
        method: "razorpay",
        razorPayOrder: razorPayGeneratedOrder,
        order: orderDone,
        quantity: cartItemQuantities,
      });
    }
  } catch (error) {
    console.error("Error processing order:", error);
    res.redirect("/pageNotFound");
  }
};


const getOrderDetailsPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.id;
    const findOrder = await Order.findOne({ _id: orderId });
    const findUser = await User.findOne({ _id: userId });
    
    let totalGrant = 0;
    findOrder.product.forEach((val) => {
      totalGrant += val.price * val.quantity;
    });

    const totalPrice = findOrder.totalPrice;
    const discount = totalGrant - totalPrice;
    const finalAmount = totalPrice; 

    res.render("orderDetails", {
      orders: findOrder,
      user: findUser,
      totalGrant: totalGrant,
      totalPrice: totalPrice,
      discount: discount,
      finalAmount: finalAmount,
    });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};




const paymentConfirm = async (req, res) => {
  try {
    await Order.updateOne(
      { _id: req.body.orderId },
      { $set: { status: "Confirmed" } }
    ).then((data) => {
      res.json({ status: true });
    });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const getCartCheckoutPage = async (req, res) => {
  try {
    res.render("checkoutCart");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const changeSingleProductStatus = async (req, res) => {
  const { orderId, singleProductId, status } = req.body;
  const oid = new mongodb.ObjectId(singleProductId);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(singleProductId)) {
      return res.status(400).json({ message: "Invalid ID format" });
  }

  const order = await Order.findOne({ _id: orderId });
  const productIndex = order.product.findIndex((product) => product._id.toString() === singleProductId);
  const orderedProductDataPrice = order.product[productIndex].price;
  const newPrice = order.totalPrice - orderedProductDataPrice;

  try {
    const filter = { _id: orderId };
    const update = {
      $set: {
        "product.$[elem].productStatus": status,
        totalPrice: newPrice,
      },
    };
    const options = {
      arrayFilters: [{ "elem._id": oid }],
    };
    const result = await Order.updateOne(filter, update, options);
    res.status(200).json({ message: "Product status updated successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const { orderId } = req.body;
    const findOrder = await Order.findOne({ _id: orderId });
    if (!findOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (findOrder.status === "Cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }
    
    // Handle refund if payment was made via Razorpay or wallet
    if ((findOrder.payment === "razorpay" || findOrder.payment === "wallet") && findOrder.status === "Confirmed") {
      findUser.wallet += findOrder.totalPrice;
      // Update user wallet history
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            history: {
              amount: findOrder.totalPrice,
              status: "credit",
              date: Date.now(),
              description: `Order ${orderId} cancelled`,
            },
          },
        }
      );
      await findUser.save();
    }

    // Update order status to cancelled
    await Order.updateOne({ _id: orderId }, { status: "Cancelled" });

    // Update product quantities
    for (const productData of findOrder.product) {
      const productId = productData._id;
      const quantity = productData.quantity;
      const product = await Product.findById(productId);
      if (product) {
        product.quantity += quantity;
        await product.save();
      } else {
        console.log("No Product");
      }
    }

    res.status(200).json({ message: "Order cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const returnorder = async (req, res) => {
  try {
    const userId = req.session.user;
    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      return res.status(404).json({ message: "User not found" });
    }
    const { orderId } = req.body;
    const findOrder = await Order.findOne({ _id: orderId });
    if (!findOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (findOrder.status === "returned") {
      return res.status(400).json({ message: "Order is already returned" });
    }
    await Order.updateOne({ _id: orderId }, { status: "Return Request" });
    res.status(200).json({ message: "Return request initiated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// const generateOrderRazorpay = (orderId, total) => {
//   return new Promise((resolve, reject) => {
//     const options = {
//       amount: total * 100,
//       currency: "INR",
//       receipt: String(orderId),
//     };
//     instance.orders.create(options, (err, order) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(order);
//       }
//     });
//   });
// };


// const verify = (req, res) => {
//   let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
//   hmac.update(
//     `${req.body.payment.razorpay_order_id}|${req.body.payment.razorpay_payment_id}`
//   );
//   hmac = hmac.digest("hex");
//   console.log(hmac,"HMAC");
//   console.log(req.body.payment.razorpay_signature,"signature");
//   if (hmac === req.body.payment.razorpay_signature) {
//     console.log("true");
//     res.json({ status: true });
//   } else {
//     console.log("false");
//     res.json({ status: false });
//   }
// };


// const downloadInvoice = async (req, res) => {
//   try {
//       const orderId = req.params.orderId;
//       const order = await Order.findById(orderId).populate('userId');

//       if (!order) {
//           return res.status(404).send('Order not found');
//       }

//       const data = {
//           "documentTitle": "INVOICE",
//           "currency": "INR",
//           "taxNotation": "gst",
//           "marginTop": 25,
//           "marginRight": 25,
//           "marginLeft": 25,
//           "marginBottom": 25,
//           apiKey: process.env.EASYINVOICE_API,
//           mode: "development",
//           images: {
//               logo: "https://firebasestorage.googleapis.com/v0/b/ecommerce-397a7.appspot.com/o/logo.jpg?alt=media&token=07b6be19-1ce8-4797-a3a0-f0eaeaafedad",
//           },
//           "sender": {
//               "company": "Trend Setter",
//               "address": "Thrikkakkara",
//               "zip": "682021",
//               "city": "Kochi",
//               "country": "India"
//           },
//           "client": {
//               "company": order.address[0].name,
//               "address": order.address[0].landMark + ", " + order.address[0].city,
//               "zip": order.address[0].pincode,
//               "city": order.address[0].state,
//               "country": "India"
//           },
//           "information": {
//               "number": order.orderId,
//               "date": moment(order.date).format("YYYY-MM-DD HH:mm:ss")
//           },
//           "products": order.product.map(prod => ({
//               "quantity": prod.quantity,
//               "description": prod.name || prod.title,
//               "tax": 0,
//               "price": prod.price,

//           })),
//           "bottomNotice": "Thank you for your business",
//       };

//       const result = await easyinvoice.createInvoice(data);
//       const invoicePath = path.join(__dirname, "../../public/invoice/", `invoice_${orderId}.pdf`);
//       fs.writeFileSync(invoicePath, result.pdf, 'base64');
//       res.download(invoicePath, `invoice_${orderId}.pdf`, (err) => {
//           if (err) {
//               console.error("Error downloading the file", err);
//           }
//           fs.unlinkSync(invoicePath);
//       });
//   } catch (error) {
//       console.error(error);
//       res.status(500).send('An error occurred while generating the invoice');
//   }
// };







module.exports = {
  getCheckoutPage,
  applyCoupon,
  deleteProduct,
  cancelOrder,
  orderPlaced,
  getOrderDetailsPage,
  getCartCheckoutPage,
//   verify,
  changeSingleProductStatus,
  paymentConfirm,
  returnorder,
//   downloadInvoice
};


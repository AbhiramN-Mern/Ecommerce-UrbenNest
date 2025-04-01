const Wishlist = require('../../models/wishListSchema');
const Product = require('../../models/productSchema');
const User=require('../../models/userSchema')
const loadWishList = async (req, res) => {
    try {
        // Use the correct session key; if you store it as req.session.userId make sure it's set.
        const userId = req.session.userId || req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }
        // Find the wishlist document using the userId field
        const wishlistDoc = await Wishlist.findOne({ userId: userId });
        // If no wishlist document exists, render an empty wishlist.
        if (!wishlistDoc) {
            return res.render('wishlist', { user: userId, wishlist: [] });
        }
        // Extract product IDs from the wishlist document's products array.
        const productIds = wishlistDoc.products.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } }).populate('category');
        res.render('wishlist', {
            user: userId,
            wishlist: products
        });
    } catch (error) {
        console.error('Error loading wishlist:', error);
        res.redirect('/pageNotFound');
    }
};

const addToWishlist = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.user; // or req.session.userId
        if (!userId) {
            return res.status(401).json({ status: false, message: "Please login to add to wishlist" });
        }

        // Find the user's wishlist document; if none exists, create one.
        let wishlistDoc = await Wishlist.findOne({ userId: userId });
        if (!wishlistDoc) {
            wishlistDoc = new Wishlist({ userId: userId, products: [] });
        }
        // Check if product is already in the wishlist
        if (wishlistDoc.products.some(item => item.productId.toString() === productId.toString())) {
            return res.status(200).json({ status: false, message: "Product already in wishlist" });
        }
        // Add product to the wishlist
        wishlistDoc.products.push({ productId: productId });
        await wishlistDoc.save();
        return res.status(200).json({ status: true, message: "Product added to wishlist" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Server Error" });
    }
};

const removeProduct = async (req, res) => {
    try {
        const productId = req.query.productId;
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }
        // Find the user's wishlist document
        const wishlistDoc = await Wishlist.findOne({ userId: userId });
        if (!wishlistDoc) {
            return res.status(404).json({ status: false, message: "Wishlist not found" });
        }
        // Find the index in the products array
        const index = wishlistDoc.products.findIndex(
            item => item.productId.toString() === productId.toString()
        );
        if (index === -1) {
            return res.status(404).json({ status: false, message: "Product not in wishlist" });
        }
        // Remove the product
        wishlistDoc.products.splice(index, 1);
        await wishlistDoc.save();
        return res.redirect('/wishlist')
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Server Error" });
    }
};

module.exports = {
    loadWishList,
    addToWishlist,
    removeProduct
};
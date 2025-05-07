const Wishlist = require('../../models/wishListSchema');
const Product = require('../../models/productSchema');
const User=require('../../models/userSchema')
const loadWishList = async (req, res) => {
    try {
        const userId = req.session.userId || req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }
        const wishlistDoc = await Wishlist.findOne({ userId: userId });
        if (!wishlistDoc) {
            return res.render('wishlist', { user: userId, wishlist: [] });
        }
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
        const userId = req.session.user; 

        // Check if user is logged in
        if (!userId) {
            return res.json({ 
                status: false, 
                message: "Please login to add to wishlist",
                requireLogin: true 
            });
        }

        let wishlistDoc = await Wishlist.findOne({ userId: userId });
        
        // If wishlist doesn't exist, create new one
        if (!wishlistDoc) {
            wishlistDoc = new Wishlist({ userId: userId, products: [] });
        }

        // Check if product already exists in wishlist
        if (wishlistDoc.products.some(item => item.productId.toString() === productId.toString())) {
            return res.json({ 
                status: false, 
                message: "Product is already in your wishlist" 
            });
        }

        // Add product to wishlist
        wishlistDoc.products.push({ productId: productId });
        await wishlistDoc.save();
        
        // Get updated wishlist count
        const wishlistCount = wishlistDoc.products.length;
        
        return res.json({ 
            status: true, 
            message: "Product has been added to your wishlist",
            wishlistCount: wishlistCount
        });

    } catch (error) {
        console.error('Wishlist error:', error);
        return res.json({ 
            status: false, 
            message: "Something went wrong while adding to wishlist" 
        });
    }
};

const removeProduct = async (req, res) => {
    try {
        const productId = req.query.productId;
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }
        const wishlistDoc = await Wishlist.findOne({ userId: userId });
        if (!wishlistDoc) {
            return res.status(404).json({ status: false, message: "Wishlist not found" });
        }
        const index = wishlistDoc.products.findIndex(
            item => item.productId.toString() === productId.toString()
        );
        if (index === -1) {
            return res.status(404).json({ status: false, message: "Product not in wishlist" });
        }
        wishlistDoc.products.splice(index, 1);
        await wishlistDoc.save();
        return res.redirect('/wishlist')
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Server Error" });
    }
};

const getWishlistCount = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.json({ count: 0 });
        }

        const wishlist = await Wishlist.findOne({ userId: userId });
        const count = wishlist ? wishlist.products.length : 0;
        
        res.json({ count: count });
    } catch (error) {
        console.error('Error getting wishlist count:', error);
        res.json({ count: 0 });
    }
};

module.exports = {
    loadWishList,
    addToWishlist,
    removeProduct,
    getWishlistCount
};
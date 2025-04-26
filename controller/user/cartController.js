const User = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const mongodb = require("mongodb");

const getUserIdFromSession = (session) => {
    return (session.user && session.user._id) ? session.user._id : session.user;
};

const getCartPage = async (req, res) => {
    try {
        const userId = getUserIdFromSession(req.session);
        if (!userId) {
            return res.redirect('/login');
        }

        const [user, cart] = await Promise.all([
            User.findById(userId),
            Cart.findOne({ userId }).populate("items.productId")
        ]);

        if (!user) {
            return res.redirect('/login');
        }

        if (!cart || !cart.items.length) {
            return res.render('cart', {
                data: [],
                grandTotal: 0,
                outOfStockMessages: [],
                user
            });
        }

        const cartItems = cart.items.map(item => {
            const product = item.productId;

            
            return {
                productId: product._id.toString(),
                name: product.productName,
                price: product.salePrice,
                quantity: item.quantity,
                image: product.productImage?.[0] || '',
                total: item.quantity * product.salePrice,
                stock: product.quantity,
                category: product.category,
                brand: product.brand
            };
        });

        const grandTotal = cartItems.reduce((acc, item) => acc + item.total, 0);
        const outOfStockItems = cartItems.filter(item => item.stock < item.quantity);
        const outOfStockMessages = outOfStockItems.map(item => 
            `The product "${item.name}" is out of stock.`);

        res.render("cart", {
            data: cartItems,
            grandTotal,
            user,
            outOfStockMessages
        });
    } catch (error) {
        console.error('Error in getCartPage:', error.stack);
        res.redirect('/pageNotFound');
    }
};

const addToCart = async (req, res) => {
    try {
        const userId = getUserIdFromSession(req.session);
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const { productId, quantity = 1 } = req.body;
        const qtyToAdd = parseInt(quantity);

        if (!mongodb.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Invalid product ID" });
        }

        const [product, cart] = await Promise.all([
            Product.findById(productId),
            Cart.findOne({ userId })
        ]);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (product.quantity < qtyToAdd) {
            return res.status(400).json({ success: false, message: "Insufficient stock" });
        }

        const newCart = cart || new Cart({ userId, items: [] });
        const existingItem = newCart.items.find(item => 
            item.productId.toString() === productId);

        if (existingItem) {
            const newTotalQty = existingItem.quantity + qtyToAdd;
            if (newTotalQty > 3) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Maximum limit of 3 items per product reached" 
                });
            }
            existingItem.quantity = newTotalQty;
            existingItem.totalPrice = existingItem.quantity * product.salePrice;
        } else {
            if (qtyToAdd > 3) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Cannot add more than 3 items of this product" 
                });
            }
            newCart.items.push({
                productId,
                quantity: qtyToAdd,
                price: product.salePrice,
                totalPrice: qtyToAdd * product.salePrice
            });
        }

        await newCart.save();
        res.json({ success: true, message: "Product added to cart successfully" });
    } catch (error) {
        console.error('Error in addToCart:', error.stack);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const deleteItem = async (req, res) => {
    try {
        const userId = getUserIdFromSession(req.session);
        if (!userId) {
            console.log('No userId found in session');
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const { productId } = req.body;
        if (!productId || !mongodb.ObjectId.isValid(productId)) {
            console.log(`Invalid or missing productId: ${productId}`);
            return res.status(400).json({ success: false, message: "Invalid or missing product ID" });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            console.log(`Cart not found for userId: ${userId}`);
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const itemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId);
        if (itemIndex === -1) {
            console.log(`Item not found in cart for productId: ${productId}`);
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        const grandTotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        console.log(`Item removed. New grandTotal: ${grandTotal}, Remaining items: ${cart.items.length}`);

        res.status(200).json({ 
            success: true, 
            message: "Item removed from cart successfully",
            grandTotal,
            remainingItems: cart.items.length
        });
    } catch (error) {
        console.error('Error in deleteItem:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: "Failed to remove item from cart",
            error: error.message 
        });
    }
};

const changeQuantity = async (req, res) => {
    try {
        const userId = getUserIdFromSession(req.session);
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const { productId, quantity } = req.body;
        const parsedQuantity = parseInt(quantity);

        if (!mongodb.ObjectId.isValid(productId) || isNaN(parsedQuantity)) {
            return res.status(400).json({ success: false, message: "Invalid input" });
        }

        if (parsedQuantity > 3) {
            return res.status(400).json({ 
                success: false, 
                message: "Maximum limit of 3 items per product reached" 
            });
        }

        const cart = await Cart.findOne({ userId }).populate("items.productId");
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const cartItem = cart.items.find(item => 
            item.productId._id.toString() === productId);
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Product not found in cart" });
        }

        if (cartItem.productId.quantity < parsedQuantity) {
            return res.status(400).json({ success: false, message: "Insufficient stock" });
        }

        cartItem.quantity = parsedQuantity;
        cartItem.totalPrice = parsedQuantity * cartItem.productId.salePrice;
        await cart.save();

        const grandTotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        res.json({ success: true, message: "Quantity updated successfully", grandTotal });
    } catch (error) {
        console.error('Error in changeQuantity:', error.stack);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const checkProductInCart = async (req, res) => {
    try {
        const userId = getUserIdFromSession(req.session);
        if (!userId) {
            return res.json({ exists: false });
        }

        const { productId } = req.body;
        const cart = await Cart.findOne({ userId });
        
        const exists = cart?.items.some(item => 
            item.productId.toString() === productId) || false;
        
        res.json({ exists });
    } catch (error) {
        console.error('Error in checkProductInCart:', error.stack);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getCartCount = async (req, res) => {
    try {
        const userId = getUserIdFromSession(req.session);
        if (!userId) {
            return res.json({ count: 0 });
        }

        const cart = await Cart.findOne({ userId });
        const count = cart?.items.length || 0;
        res.json({ count });
    } catch (error) {
        console.error('Error in getCartCount:', error.stack);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    getCartPage,
    addToCart,
    deleteItem,
    changeQuantity,
    checkProductInCart,
    getCartCount
};
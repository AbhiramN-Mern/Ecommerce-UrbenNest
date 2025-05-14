const Product = require("../../models/productSchema");
const Category = require("../../models/categoryScheema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const cloudinary = require('cloudinary').v2;

const fs = require("fs");
const path = require("path");
const sharp = require("sharp")
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const getProductAddPage = async (req, res, next) => {
    try {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        res.render("product-add", {
            cat: category,
            brand: brand
        });
    } catch (error) {
        next(error);
    }
};

const addProducts = async (req, res, next) => {
    try {
        const products = req.body;

        // Check if the product already exists
        const productExists = await Product.findOne({
            productName: products.productName,
        });

        if (productExists) {
            return res.status(400).json("Product already exists, please try with another name");
        }

        const images = [];

        // Handle multiple image uploads
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];

                // Upload to Cloudinary with resizing
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: "re-image",
                    width: 440,
                    height: 440,
                    crop: "fill",  // Ensures the image is exactly 440x440
                });

                // Push the secure URL (https) to the images array
                images.push(result.secure_url);
            }
        }

        // Validate category
        const categoryId = await Category.findOne({ name: products.category });
        if (!categoryId) {
            return res.status(400).send("Invalid category name");
        }

        // Create new product
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: products.brand,
            category: categoryId._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            createdOn: new Date(),
            quantity: products.quantity,
            size: products.size,
            color: products.color,
            productImage: images,  // Use Cloudinary URLs
            status: "Available",
        });

        await newProduct.save();
        return res.redirect("/admin/product-add");

    } catch (error) {
        console.log(error);
        next(error);
    }
};


const getAllProducts = async (req, res, next) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ],
        }).limit(limit * 1).skip((page - 1) * limit).sort({ createdAt: -1 }).populate('category').exec();
    

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        }).countDocuments();

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        if (category && brand) {
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                brand: brand,
            });
        } else {
            res.render("page-404");
        }
    } catch (error) {
        next(error);
    }
};

const addProductOffer = async (req, res, next) => {
    try {
        const { productId, percentage } = req.body;
        const productOffer = parseInt(percentage);

        const findProduct = await Product.findById(productId);
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const findCategory = await Category.findById(findProduct.category);
        // If category does not exist, then use only product offer
        const categoryOffer = (findCategory && findCategory.categoryOffer) ? findCategory.categoryOffer : 0;
        
        // Choose the highest discount between the product offer and the category offer
        const finalOffer = Math.max(productOffer, categoryOffer);

        // Update the sale price based on the regular price using finalOffer
        const discountAmount = Math.floor(findProduct.regularPrice * (finalOffer / 100));
        findProduct.salePrice = findProduct.regularPrice - discountAmount;
        
        // Save the product offer value (store product's offered discount only if needed,
        // or you might want to store the final applied discount)
        findProduct.productOffer = productOffer;

        await findProduct.save();

        // Optionally, you might choose to update or reset the category offer if required.
        // For example:
        // findCategory.categoryOffer = 0;
        // await findCategory.save();

        res.json({ status: true, message: "Offer applied successfully", appliedOffer: finalOffer });
    } catch (error) {
        next(error);
    }
};

const removeProductOffer = async (req, res, next) => {
    try {
        const { productId } = req.body;
        const findProduct = await Product.findOne({ _id: productId });
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({ status: true });
    } catch (error) {
        next(error);
    }
};

const blockProduct = async (req, res, next) => {
    try {
        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/products");
    } catch (error) {
        next(error);
    }
};

const unblockProduct = async (req, res, next) => {
    try {
        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/products");
    } catch (error) {
        next(error);
    }
};
const deleteProduct =async (req,res,next)=>{
    try {
        let id =req.params.id
        await Product.deleteOne({_id:id})
        return res.json({ status: true, message: "Product deleted successfully" });
        res.redirect('/admin/product')
    } catch (error) {
        console.log(error);
        
        
    }
}

const getEditProduct = async (req, res, next) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("edit-product", {
            product: product,
            cat: category,
            brand: brand,
        });
    } catch (error) {
        next(error);
    }
};

const editProduct = async (req, res, next) => {
    try {
        const id = req.params.id;
        const data = req.body;
        
        // Check for existing product with same name
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try with another name" });
        }

        // Get existing product to preserve current images
        const currentProduct = await Product.findById(id);
        let productImages = [...currentProduct.productImage]; // Keep existing images

        // Upload new images to Cloudinary if any
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: "re-image",
                        width: 440,
                        height: 440,
                        crop: "fill"
                    });
                    productImages.push(result.secure_url);
                } catch (uploadError) {
                    console.error("Cloudinary upload error:", uploadError);
                    continue;
                }
            }
        }

        // Find category ID from category name
        const categoryId = await Category.findOne({ name: data.category });
        if (!categoryId) {
            return res.status(400).json({ error: "Invalid category selected" });
        }

        // Update fields including the new category
        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: categoryId._id,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color,
            productImage: productImages // Update with both existing and new images
        };

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        
        // Send success response instead of redirecting
        res.json({
            success: true,
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating product'
        });
    }
};

const deleteSingleImage = async (req, res, next) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer, { $pull: { productImage: imageNameToServer } });
        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        } else {
            console.log(`Image ${imageNameToServer} not found`);
        }
        res.send({ status: true });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    deleteProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
};
const Product=require("../../models/productSchema")
const Category=require('../../models/categoryScheema')
const Brand=require('../../models/brandSchema')
const User=require('../../models/userSchema')
const fs=require('fs')
const path=require('path')
const sharp=require('sharp')
// const Category = require("../../models/categoryScheema")
const { count } = require("console")
// const category = require("../../models/categoryScheema")

const getProductAddPage = async (req, res, next) => {
    try {

        console.log('1')
        const category = await Category.find({ isListed: true });
        console.log(category)
        const brand = await Brand.find({ isBlocked: false });
        console.log('render')
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
        
        // Check for duplicate product (case-insensitive)
        const productExists = await Product.findOne({
            productName: { $regex: new RegExp("^" + products.productName.trim() + "$", "i") }
        });
        console.log('1');

        if (productExists) {
            return res.status(400).json({ error: "Product already exists, please try with another name" });
        }

        const images = [];
        console.log('2');
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedFilename = "resized-" + req.files[i].filename;
                const resizedImagePath = path.join('public', 'uploads', 're-image', resizedFilename);
                await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                images.push(resizedFilename);
            }
        }

        console.log('3');

        const categoryId = await Category.findOne({ name: products.category });
        if (!categoryId) {
            return res.status(400).send("Invalid category name");
        }

        console.log('34');

        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: products.brand,
            category: categoryId,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            createdOn: new Date(),
            quantity: products.quantity,
            size: products.size,
            color: products.color,
            productImage: images,
            status: "available",
        });

        try {
            await newProduct.save();
            return res.redirect("/admin/product-add");
        } catch (error) {
            // Catch duplicate key errors due to race conditions
            if (error.code === 11000) {
                return res.status(400).json({ error: "Product already exists, please try with another name" });
            }
            throw error;
        }
    } catch (error) {
        console.log(error);
        next(error);
    }
};

const getAllProducts = async (req, res) => {  // Renamed the function from gertAllProducts
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp("." + search + ".*", 'i') } },
                { brand: { $regex: new RegExp("." + search + ".*", 'i') } },
            ]
        }).limit(limit).skip((page - 1) * limit).populate('category').exec();

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp("." + search + ".", "i") } },
                { brand: { $regex: new RegExp("." + search + ".*", "i") } }
            ]
        }).countDocuments();

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        if (category && brand) {
            res.render("prodects", {
                data: productData,
                currentPage: page,
                totelPages: Math.ceil(count / limit),
                cat: category,
                brand: brand,
            });
        } else {
            res.render('pageNotFound');
        }
    } catch (error) {
        res.redirect("/pageNotFound");       
    }
};
const blockProdeucts=async(req,res)=>{
    try {
        let id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
         res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}
const unblockProdeucts=async(req,res)=>{
    try {
        const id=req.query.id
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    blockProdeucts,
    unblockProdeucts
};
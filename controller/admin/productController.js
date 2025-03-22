const Product=require("../../models/productSchema")
const Category=require('../../models/categoryScheema')
const Brand=require('../../models/brandSchema')
const User=require('../../models/userSchema')
const fs=require('fs')
const path=require('path')
const sharp=require('sharp')
// const Category = require("../../models/categoryScheema")
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
            category: categoryId._id,
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

const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp("." + search + ".*", 'i') } },
                { brand: { $regex: new RegExp("." + search + ".*", 'i') } },
            ]
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp("." + search + ".", "i") } },
                { brand: { $regex: new RegExp("." + search + ".*", "i") } }
            ]
        }).countDocuments();

        const totelPages = Math.ceil(count / limit);
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        console.log("Fetched products:", productData.length);
        console.log("Total pages:", totelPages);

        res.render("admin/prodects", {
            data: productData,
            currentPage: page,
            totelPages: totelPages,
            cat: category,
            brand: brand,
        });
    } catch (error) {
        console.error("Error in getAllProducts:", error);
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
        const product = await Product.findOne({ _id: id });
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try with another name" });
        }

        const images = [];

        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedFilename = "resized-" + req.files[i].filename;
                const resizedImagePath = path.join('public', 'uploads', 're-image', resizedFilename);
                await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
                images.push(resizedFilename);
            }
        }

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: product.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color
        };
        if (req.files.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        next(error);
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
    blockProdeucts,
    unblockProdeucts,
    getEditProduct,
    editProduct,
    deleteSingleImage
};
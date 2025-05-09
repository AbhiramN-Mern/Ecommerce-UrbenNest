const Category = require("../../models/categoryScheema");
const Product = require("../../models/productSchema");

const categoryInfo = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
        });
    } catch (error) {
        next(error);
    }
};

const addCategory = async (req, res, next) => {
    const { name, description } = req.body;
    try {
        const lowerCaseName = name.toLowerCase();
        const existingCategory = await Category.findOne({
            name: { $regex: `^${lowerCaseName}$`, $options: "i" },
        });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const newCategory = new Category({
            name,
            description,
        });

        await newCategory.save();
        return res.json({ message: "Category added successfully" });
    } catch (error) {
        next(error);
    }
};
const addCategoryOffer = async (req, res, next) => {
    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.params.id;
        
        // Validate percentage
        if (percentage < 0 || percentage > 100) {
            return res.json({
                status: false,
                message: "Invalid offer percentage. Must be between 0 and 100"
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        // Apply category offer and update product prices
        await Category.updateOne(
            { _id: categoryId }, 
            { $set: { categoryOffer: percentage } }
        );

        // Update each product's sale price based on the higher offer
        for (const product of products) {
            const productOffer = product.productOffer || 0;
            const highestOffer = Math.max(productOffer, percentage);
            
            // Calculate new sale price using the highest offer
            const newSalePrice = Math.floor(product.regularPrice - (product.regularPrice * highestOffer / 100));
            
            // Update product
            await Product.updateOne(
                { _id: product._id },
                { 
                    $set: { 
                        salePrice: newSalePrice,
                        // Keep existing productOffer if it's higher, otherwise it remains unchanged
                        ...(productOffer < percentage && { productOffer: 0 })
                    }
                }
            );
        }

        res.json({ 
            status: true, 
            message: "Category offer applied successfully. Products updated with highest applicable offer." 
        });

    } catch (error) {
        console.error("Error applying category offer:", error);
        next(error);
    }
};


const removeCategoryOffer = async (req, res, next) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        // Update each product's sale price based on product offer only
        for (const product of products) {
            const productOffer = product.productOffer || 0;
            
            // Calculate new sale price using only product offer
            const newSalePrice = productOffer > 0 
                ? Math.floor(product.regularPrice - (product.regularPrice * productOffer / 100))
                : product.regularPrice;

            await Product.updateOne(
                { _id: product._id },
                { $set: { salePrice: newSalePrice } }
            );
        }

        // Remove category offer
        category.categoryOffer = 0;
        await category.save();

        res.json({ 
            status: true,
            message: "Category offer removed successfully. Products updated based on their individual offers."
        });
    } catch (error) {
        next(error);
    }
};

const getListCategory = async (req, res, next) => {
    try {
        const id = req.params.id; 
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        res.json({ status: true, message: "Category unlisted" }); 
    } catch (error) {
        next(error);
    }
};

const getUnlistCategory = async (req, res, next) => {
    try {
        const id = req.params.id; 
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        res.json({ status: true, message: "Category listed" }); 
    } catch (error) {
        next(error);
    }
};

const getEditCategory = async (req, res, next) => {
    try {
        const id = req.params.id; 
        const category = await Category.findOne({ _id: id });
        if (!category) {
            return res.status(404).send("Category not found");
        }
        res.render("edit-category", { category: category });
    } catch (error) {
        next(error);
    }
};

const editCategory = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;

        const lowerCaseName = categoryName.toLowerCase();
        const existingCategory = await Category.findOne({
            name: { $regex: `^${lowerCaseName}$`, $options: "i" },
            _id: { $ne: id },
        });
        if (existingCategory) {
            return res
                .status(400)
                .json({ error: "Category already exists, please choose another name" });
        }

        const updateCategory = await Category.findByIdAndUpdate(
            id,
            {
                name: categoryName,
                description: description,
            },
            { new: true }
        );

        if (updateCategory) {
            res.json({ status: true, message: "Category updated successfully" });
        } else {
            res.status(404).json({ error: "Category not found" });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
};
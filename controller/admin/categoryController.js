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
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        const products = await Product.find({ category: category._id });

        const hasProductOffer = products.some((product) => product.productOffer > percentage);
        if (hasProductOffer) {
            return res.json({
                status: false,
                message: "Products within this category already have product offers",
            });
        }

        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

        for (const product of products) {
            product.productOffer = 0;
            product.salePrice = product.regularPrice - (product.regularPrice * percentage / 100);
            await product.save();
        }

        res.json({ status: true, message: "Category offer applied successfully" });
    } catch (error) {
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

        const percentage = category.categoryOffer;
        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            for (const product of products) {
                product.salePrice += Math.floor(product.regularPrice * (percentage / 100));
                product.productOffer = 0;
                await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save();
        res.json({ status: true });
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
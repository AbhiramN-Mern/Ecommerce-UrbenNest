const { skip } = require('node:test');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { create } = require('../../models/userSchema');
const category = require('../../models/categoryScheema');
const { error } = require('console');

const categoryInfo=async(req,res)=>{
try{
    const page=parseInt(req.query.page)||1;
    const limit=4
    const skip=(page-1)*limit
    
    const categoryData=await category.find({})
    .sort({createAt:-1})
    .skip(skip)
    .limit(limit)

    const totelCategory=await category.find({}).countDocuments()
    const totalPages=Math.ceil(totelCategory/limit)
    res.render('category',{
        cat:categoryData,
        currentPage:page,
        totalPages:totalPages,
        totelCategory:totelCategory

    })
}catch(error){
    console.error(error)
    res.redirect('/pageNotFound')
    

}
}
const addCategory=async(req,res)=>{
    const {name,description}=req.body;
    try {
        const existCategory=await category.findOne({name})
        if(existCategory){
            return res.status(400).json({error:"Category Already Exist"})
        }
        const newCategory=new category({name,description,
        })
        await newCategory.save()
        return res.json({messege:"Category added Successfully"})
    } catch (error) {
        return res.status(500).json({error:'Internal Server Error'})

        
    }
}

const getlisteCategory=async(req,res)=>{
    try {
        let id=req.query.id
        await category.updateOne(
            { _id: id },
            { $set: { isListed: false } }
        )
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}

const getunlisteCategory=async(req,res)=>{
    try{
    let id=req.query.id
    
    await category.updateOne(
        { _id: id },
        { $set: { isListed: true } }
    )
    res.redirect('/admin/category')
}catch(error){
    res.redirect('/pageNotFound')
}
}

const getEditCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const categoryData = await category.findOne({ _id: id });
        res.render('edit-category', { category: categoryData });
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};

const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        // Note: using the same case as in the fetch payload ("categoryName")
        const { categoryName, description } = req.body;
        const existCategory = await category.findOne({ name: categoryName });
        if (existCategory) {
            return res.status(400).json({ error: 'Category exists, Please choose another name' });
        }
        const updateCategory = await category.findByIdAndUpdate(
            id,
            { name: categoryName, description: description },
            { new: true }
        );
        if (updateCategory) {
            // Return JSON response when using AJAX
            return res.json({ message: "Category updated successfully" });
        } else {
            return res.status(404).json({ error: 'Category not found' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports={
    categoryInfo,
    addCategory,
    getlisteCategory,
    getunlisteCategory,
    getEditCategory,
    editCategory
}
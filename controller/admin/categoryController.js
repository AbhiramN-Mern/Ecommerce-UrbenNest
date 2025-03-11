const { skip } = require('node:test');
const category=require('../../models/categoryScheema');
const { create } = require('../../models/userSchema');
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

module.exports={
    categoryInfo,
    addCategory
}
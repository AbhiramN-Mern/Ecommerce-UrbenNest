const Product=require("../../models/productSchema")
const Catogery=require('../../models/categoryScheema')
const Brand=require('../../models/brandSchema')
const User=require('../../models/userSchema')
const fs=require('fs')
const path=require('path')
const sharp=require('sharp')

 
const getProductPage=async(req,res)=>{
    try {
        const category=await Catogery.find({isListed:true})
        const brand=await Brand.find({isBlocked:false})
        res.render('product-add',{
            cat:category,
            brand:brand,

        })
    } catch (error) {
        res.redirect('/pageNotFound')
        
    }
}
const addProduct=async(req,res)=>{
    try {
        const product=req.body
        const productExists=await Product.findOne({
            productName:products.productName
        })
        if(!productExists){
            const images=[]

            if(req.files&&req.files.length>0){
                for(let i=0;iMreq.files.length;i++){
                    const orginalImagePath=req.files[i].path
                    const resizesImagePath=path.join(__dirname,'../../public/uploads/productsImages',req.files[i].filename)
                    await sharp(orginalImagePath).resize({width:440,height:440}).toFile(resizesImagePath)
                    images.push(req.files[i].filename)

                }
            }
            const categoryId=await Catogery.findOne({name:products.category})
            if(!categoryId){
                return res.status(400).send('Category not found')
            }
            const newProduct=new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                Quantity:products.Quantity,
                size:products.size,
                color:products.color,
                productImages:images,
                status:'available'
            })
            await newProduct.save()
            return res.redirect('admin/product-add')

        }else{
            return res.status(404).json('Product already exists')
        }
    } catch (error) {
        console.error('error on save Prouct',error)
        res.redirect('/pageNotFound')
        
    }
}
module.exports={
    getProductPage,
    addProduct
}
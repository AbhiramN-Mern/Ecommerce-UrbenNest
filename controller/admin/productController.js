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
module.exports={
    getProductPage
}
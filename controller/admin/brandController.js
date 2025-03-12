const { reverse } = require('dns')
const Brand=require('../../models/brandSchema')
const product=require('../../models/productSchema')

const getBrandPage=async(req,res)=>{
    try {
        const page=parseInt(req.query.page)||1
        const limit=4
        const skip=(page-1)*limit
        const BrandData=await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit)
        const totelBrand=await Brand.countDocuments()
        const totelpages=Math.ceil(totelBrand/limit)
        const reverseBrand=BrandData.reverse()
        res.render('brand',{
            data:reverseBrand,
            currentPage:page,
            totelPages:totelpages,
            totelBrands:totelBrand
        })


    } catch (error) {
        res.redirect('/pageNotFound')
    }
}
module.exports=getBrandPage
const Brand = require('../../models/brandSchema');
const product = require('../../models/productSchema');
const { updateOne } = require('../../models/userSchema');

const getBrandPage = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        // Get brands with pagination
        const brands = await Brand.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);

        // Render the page with pagination data
        res.render('brand', {
            data: brands,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            lastPage: totalPages
        });

    } catch (error) {
        console.error('Error fetching brands:', error);
        res.redirect('/pageNotFound');
    }
}

const addBrand = async (req, res) => {
    try {
        const brandName = req.body.name;
        const findBrand = await Brand.findOne({ brandName: brandName });
        
        if (findBrand) {
            return res.status(400).json({ error: 'Brand already exists' });
        }

        const newBrand = new Brand({
            brandName: brandName,
            brandImage: req.file ? [req.file.filename] : []
        });
        
        await newBrand.save();
        res.status(200).json({ message: 'Brand added successfully' });

    } catch (error) {
        console.error('Error adding brand:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const blockBrand=async (req,res)=>{
    try {
        const {id}=req.query
    await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
    res.redirect('/admin/brands')
    } catch (error) {
        console.error('Eror IN Block Brand',error)
        res.status(500).json({error:'internel server error'})
        
    }
}
const unblockBrand=async(req,res)=>{
    try {
        const {id}=req.query
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/brands')
    } catch (error) {
        console.error('Eror IN UnBlock Brand',error)
        res.status(500).json({error:'internel server error'})
    }
}
const deleteBrand=async(req,res)=>{
    try {
        const {id}=req.query
        if(!id){
            return res.status(500).redirect('/pageNotFound')
        }else{
            await Brand.deleteOne({_id:id})
            res.redirect('/admin/brands')
        }
    } catch (error) {
        
    }
}

module.exports={
    getBrandPage,
    addBrand,
    blockBrand,
    unblockBrand,
    deleteBrand
}
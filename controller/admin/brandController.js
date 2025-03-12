const Brand = require('../../models/brandSchema');
const product = require('../../models/productSchema');

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
        
        if (!findBrand) {
            const newBrand = new Brand({
                brandName: brandName,
                brandImage: req.file ? [req.file.filename] : []  // Fixed image handling
            });
            
            await newBrand.save();
            res.redirect('/admin/brands');
        } else {
            res.status(400).json({ error: 'Brand already exists' });
        }
    } catch (error) {
        console.error('Error adding brand:', error);
        res.redirect('/pageNotFound');
    }
};

module.exports={
    getBrandPage,
    addBrand
}
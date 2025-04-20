const { log } = require("console");
const Coupon = require("../../models/coupenSchema");
const mongoose = require("mongoose");

const loadCoupon = async (req, res, next) => {
    try {
        const findCoupons = await Coupon.find({});
        return res.render("coupon", { coupons: findCoupons });
    } catch (error) {
        next(error);
    }
};

const createCoupon = async (req, res, next) => {
    try {
        const data = {
            couponName: req.body.couponName,
            startDate: new Date(req.body.startDate + "T00:00:00"),
            endDate: new Date(req.body.endDate + "T00:00:00"),
            offerPrice: parseInt(req.body.offerPrice),
            minimumPrice: parseInt(req.body.minimumPrice),
        };

        const newCoupon = new Coupon({
            name: data.couponName,
            createdOn: data.startDate,
            expireOn: data.endDate,
            offerPrice: data.offerPrice,
            minimumPrice: data.minimumPrice,
            isList: true 
        });
        await newCoupon.save();
        return res.redirect("/admin/coupon");
    } catch (error) {
        next(error);
    }
};

const editCoupon = async (req, res, next) => {
    try {
        const id = req.query.id;
        const findCoupon = await Coupon.findOne({ _id: id });
        res.render("editCoupon", {
            findCoupon: findCoupon,
        });
    } catch (error) {
        next(error);
    }
};

const updateCoupon = async (req, res, next) => {
    try {
        const couponId = req.body.couponId;
        const oid = new mongoose.Types.ObjectId(couponId);
        const selectedCoupon = await Coupon.findOne({ _id: oid });
        if (selectedCoupon) {
            const startDate = new Date(req.body.startDate);
            const endDate = new Date(req.body.endDate);
            const updatedCoupon = await Coupon.updateOne(
                { _id: oid },
                {
                    $set: {
                        name: req.body.couponName,
                        createdOn: startDate,
                        expireOn: endDate,
                        offerPrice: parseInt(req.body.offerPrice),
                        minimumPrice: parseInt(req.body.minimumPrice),
                    }
                },
                { new: true }
            );

            if (updatedCoupon.modifiedCount > 0) {
                res.send("Coupon updated successfully");
            } else {
                res.status(500).send("Coupon update failed");
            }
        } else {
            res.status(404).send("Coupon not found");
        }
    } catch (error) {
        next(error);
    }
};

const listCoupon = async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await Coupon.updateOne({ _id: id }, { $set: { isList: true } });
        if (result.modifiedCount > 0) {
            res.json({ status: true, message: "Coupon listed successfully" });
        } else {
            res.status(400).json({ status: false, message: "Failed to list coupon" });
        }
    } catch (error) {
        next(error);
    }
};

const unlistCoupon = async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await Coupon.updateOne({ _id: id }, { $set: { isList: false } });
        if (result.modifiedCount > 0) {
            res.json({ status: true, message: "Coupon unlisted successfully" });
        } else {
            res.status(400).json({ status: false, message: "Failed to unlist coupon" });
        }
    } catch (error) {
        next(error);
    }
};
const deleteCoupon=async(req,res,next )=>{
    try {
        const id=req.params.id;
        const result=await Coupon.deleteOne({_id:id});
        if(result.deletedCount>0){
            return res.json({status:true,message:"Coupon Deleted Succsesfully"})
        }else{
            return res.status(400).json({status:false,message:"coupon deleting failed"})
        }

    } catch (error) {
        console.log('error in delete coupon',error);
    
        
        
    }
}




module.exports = {
    loadCoupon,
    createCoupon,
    editCoupon,
    updateCoupon,
    listCoupon,
    unlistCoupon,
    deleteCoupon
    

};
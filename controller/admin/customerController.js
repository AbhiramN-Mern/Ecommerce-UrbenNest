const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .exec();
    
    const count = await User.countDocuments({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } }
      ]
    });
    
    const totalPages = Math.ceil(count / limit);
    
    res.render('customers', { data: userData, totalPages, currentPage: page });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching customers");
  }
};

const customerBlocked = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    if (result.modifiedCount > 0) {
      return res.json({ success: true, message: "Customer blocked successfully" });
    }
    res.json({ success: false, message: "Customer not found or already blocked" });
  } catch (error) {
    res.json({ success: false, message: "An error occurred while blocking the customer" });
  }
};

const customerUnblocked = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    if (result.modifiedCount > 0) {
      return res.json({ success: true, message: "Customer unblocked successfully" });
    }
    res.json({ success: false, message: "Customer not found or already unblocked" });
  } catch (error) {
    res.json({ success: false, message: "An error occurred while unblocking the customer" });
  }
};

module.exports = { 
  customerInfo,
  customerBlocked,
  customerUnblocked
};
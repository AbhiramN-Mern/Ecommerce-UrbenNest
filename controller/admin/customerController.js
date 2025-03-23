const User = require('../../models/userSchema');
const env=require('dotenv').config();
const nodemailer = require("nodemailer");



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

async function sendBlockNotificationEmail(email, name, reason) {
  try {
      const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
              user: process.env.NODEMAILER_EMAIL,
              pass: process.env.NODEMAILER_PASSWORD
          }
      });

      const mailOptions = {
          from: process.env.NODEMAILER_EMAIL,
          to: email,
          subject: "Your Account Has Been Blocked",
    html: `<div style="font-family: Arial, sans-serif; text-align: center;">
            <h2>Account Blocked</h2>
            <p>Dear ${name},</p>
            <p>Your account has been blocked for the following reason:</p>
            <p style="font-size: 18px; font-weight: bold; color: red;">"${reason}"</p>
            <p>If you think this was a mistake, please contact our support team.</p>
            <p>Regards,<br>UrbenNest Admin Team</p>
        </div>`
      };

      await transporter.sendMail(mailOptions);
      return true;
  } catch (error) {
      console.error("Error sending block notification email:", error);
      return false;
  }
}

// Block customer function
const customerBlocked = async (req, res) => {
  try {
      const { reason } = req.body;
      const { id } = req.params;

      if (!reason) {
          return res.status(400).json({ success: false, message: "Block reason is required" });
      }

      const customer = await User.findByIdAndUpdate(id, { isBlocked: true, blockReason: reason }, { new: true });

      if (!customer) {
          return res.status(404).json({ success: false, message: "Customer not found" });
      }

      if (req.session?.user && req.session.user._id?.toString() === id) {
        delete req.session.user; // Force logout
        console.log(`User ${id} session deleted (Blocked)`);
    }

      // Send block notification email
      const emailSent = await sendBlockNotificationEmail(customer.email, customer.name, reason);

      res.status(200).json({ 
          success: true, 
          message: emailSent 
              ? "Customer blocked and notified via email" 
              : "Customer blocked but email notification failed" 
      });

  } catch (error) {
      console.error("Error blocking customer:", error);
      res.status(500).json({ success: false, message: "Error blocking customer" });
  }
};

// Unblock customer function

const customerUnblocked = async (req, res) => {
  try {
      const { id } = req.params;
      const customer = await User.findByIdAndUpdate(id, { isBlocked: false, blockReason: "" }, { new: true });

      if (!customer) {
          return res.status(404).json({ success: false, message: "Customer not found" });
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
              user: process.env.NODEMAILER_EMAIL,
              pass: process.env.NODEMAILER_PASSWORD
          }
      });

      // Email notification
      const mailOptions = {
          from: process.env.NODEMAILER_EMAIL,
          to: customer.email,
          subject: "Your Account Has Been Unblocked",
    html: `<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: auto;">
            <h2 style="color: #28a745;">Your Account Has Been Unblocked</h2>
            <p>Dear <strong>${customer.name}</strong>,</p>
            <p>We have good news! Your account has been successfully unblocked.</p>
            <p>You can now log in and continue using our services.</p>
            <p>If you have any questions, feel free to contact our <strong>UrbenNest</strong> support team.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="margin-top: 20px; font-weight: bold;">Best Regards,<br>UrbenNest Admin Team</p>
        </div>`
      }

      await transporter.sendMail(mailOptions);

      res.status(200).json({ success: true, message: "Customer unblocked and notified via email" });

  } catch (error) {
      console.error("Error unblocking customer:", error);
      res.status(500).json({ success: false, message: "Error unblocking customer" });
  }
};
module.exports = { 
  customerInfo,
  customerBlocked,
  customerUnblocked
};
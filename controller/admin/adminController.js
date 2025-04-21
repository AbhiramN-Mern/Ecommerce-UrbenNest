const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const puppeteer = require('puppeteer');


const generateExcelReport = async (req, res, next) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        
        worksheet.columns = [
            { header: 'Order ID', key: 'orderID', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Items', key: 'items', width: 10 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Final Amount', key: 'finalAmount', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        ];

        
        let { startDate, endDate } = req.query;

        
        if (!startDate || !endDate || isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 1); 
            startDate = start.toISOString().split('T')[0];
            endDate = end.toISOString().split('T')[0];
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1); 

        
        const orders = await Order.find({ createdOn: { $gte: start, $lt: end } })
            .select('orderId createdOn product totalPrice discount finalAmount payment')
            .sort({ createdOn: 1 });

        // console.log('Retrieved Orders:', orders);

        
        orders.forEach(order => {
            // console.log('Order:', order); 
            const itemCount = Array.isArray(order.product) ? order.product.length : 0;
            const amount = order.totalPrice !== undefined ? `₹${order.totalPrice.toFixed(2)}` : '₹0.00';
            const discount = order.discount !== undefined ? `₹${order.discount.toFixed(2)}` : '₹0.00';
            const finalAmount = order.finalAmount !== undefined ? `₹${order.finalAmount.toFixed(2)}` : '₹0.00';
            const paymentMethod = order.payment || 'N/A';

            

            worksheet.addRow({
                orderID: order.orderId,
                date: order.createdOn.toLocaleDateString(),
                items: itemCount,
                amount: amount,
                discount: discount,
                finalAmount: finalAmount,
                paymentMethod: paymentMethod,
            });
        });

        
        worksheet.addRow([]); 
        worksheet.addRow({ orderID: 'Summary' });

        
        const summaryRow = orders.length + 3;
        worksheet.mergeCells(`A${summaryRow}:G${summaryRow}`);
        worksheet.getCell(`A${summaryRow}`).value = 'Summary';
        worksheet.getCell(`A${summaryRow}`).alignment = { horizontal: 'center' };

        worksheet.mergeCells(`A${summaryRow + 1}:B${summaryRow + 1}`);
        worksheet.getCell(`A${summaryRow + 1}`).value = 'Total Orders';
        worksheet.getCell(`C${summaryRow + 1}`).value = orders.length;

        worksheet.mergeCells(`A${summaryRow + 2}:B${summaryRow + 2}`);
        worksheet.getCell(`A${summaryRow + 2}`).value = 'Total Amount';
        worksheet.getCell(`C${summaryRow + 2}`).value = `₹${orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed(2)}`;

        worksheet.mergeCells(`A${summaryRow + 3}:B${summaryRow + 3}`);
        worksheet.getCell(`A${summaryRow + 3}`).value = 'Total Discount';
        worksheet.getCell(`C${summaryRow + 3}`).value = `₹${orders.reduce((sum, order) => sum + (order.discount || 0), 0).toFixed(2)}`;

        worksheet.mergeCells(`A${summaryRow + 4}:B${summaryRow + 4}`);
        worksheet.getCell(`A${summaryRow + 4}`).value = 'Total Final Amount';
        worksheet.getCell(`C${summaryRow + 4}`).value = `₹${orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0).toFixed(2)}`;

        const filePath = path.join(__dirname, 'report.xlsx');
        await workbook.xlsx.writeFile(filePath);

        res.download(filePath, 'report.xlsx', (err) => {
            if (err) {
                console.log("Error downloading file", err);
            }
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.log("Error generating Excel report", error);
        next(error);
    }
};

const generatePdfReport = async (req, res, next) => {
    try {
        let { startDate, endDate } = req.query;

        // Default to yesterday-to-today if no dates are provided
        if (!startDate || !endDate || isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 1);
            startDate = start.toISOString().split('T')[0];
            endDate = end.toISOString().split('T')[0];
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);

        // Fetch orders for the specified date range
        const orders = await Order.find({ createdOn: { $gte: start, $lt: end } })
            .select('orderId createdOn product totalPrice discount finalAmount payment')
            .sort({ createdOn: 1 });

        // Prepare data for the report
        const totalOrders = orders.length;
        const totalAmount = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed(2);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0).toFixed(2);
        const totalFinalAmount = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0).toFixed(2);

        // Generate HTML content for the PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sales Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        width: 90%;
                        margin: 20px auto;
                    }
                    h1, h2 {
                        text-align: center;
                        color: #003087;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    table, th, td {
                        border: 1px solid #ccc;
                    }
                    th, td {
                        padding: 10px;
                        text-align: center;
                    }
                    th {
                        background-color: #f5f5f5;
                    }
                    .summary {
                        margin-top: 20px;
                        padding: 10px;
                        background-color: #f5f5f5;
                        border: 1px solid #ccc;
                    }
                    .summary p {
                        margin: 5px 0;
                        font-size: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Sales Report</h1>
                    <h2>Period: ${startDate} to ${endDate}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Amount</th>
                                <th>Discount</th>
                                <th>Final Amount</th>
                                <th>Payment</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map(order => `
                                <tr>
                                    <td>${order.orderId}</td>
                                    <td>${new Date(order.createdOn).toLocaleDateString()}</td>
                                    <td>${Array.isArray(order.product) ? order.product.length : 0}</td>
                                    <td>₹${order.totalPrice ? order.totalPrice.toFixed(2) : '0.00'}</td>
                                    <td>₹${order.discount ? order.discount.toFixed(2) : '0.00'}</td>
                                    <td>₹${order.finalAmount ? order.finalAmount.toFixed(2) : '0.00'}</td>
                                    <td>${order.payment || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="summary">
                        <p><strong>Total Orders:</strong> ${totalOrders}</p>
                        <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
                        <p><strong>Total Discount:</strong> ₹${totalDiscount}</p>
                        <p><strong>Total Final Amount:</strong> ₹${totalFinalAmount}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Launch Puppeteer and generate the PDF
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Set the HTML content
        await page.setContent(htmlContent, { waitUntil: 'load' });

        // Define the file path for the PDF
        const filePath = path.join(__dirname, 'sales_report.pdf');

        // Generate the PDF
        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
        });

        await browser.close();

        // Send the PDF as a download
        res.download(filePath, 'sales_report.pdf', err => {
            if (err) {
                console.error("Error downloading file:", err);
            }
            fs.unlinkSync(filePath); // Delete the file after download
        });
    } catch (error) {
        console.error("Error generating PDF report:", error);
        next(error);
    }
};


const pageError = async (req, res, next) => {
    try {
        res.render("admin-error");
    } catch (error) {
        next(error);
    }
};

const loadlogin=async(req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin/dashbord')
    }
    res.render('adminlogin',{message:null})

}
const login=async(req,res)=>{
try {
    const {email,password}=req.body;
    console.log(req.body)
    const admin=await User.findOne({email,isAdmin:true})
    if(admin){
        const passwordMatch=await bcrypt.compare(password,admin.password)
        if(passwordMatch){
            req.session.admin=true
            
            return res.redirect('/admin/dashbord')
        }else{
            return res.redirect('/admin/login')
        }
    }else{
        return res.redirect('/admin/login')
    }
    
} catch (error) {
    console.log('login error',error)
        return res.redirect('/pageNotFound')
}
}
const loadDashbord = async (req, res, next) => {
    if (req.session.admin) {
        try {
            let { startDate, endDate } = req.query;

            if (!startDate || !endDate || isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 1);
                startDate = start.toISOString().split('T')[0];
                endDate = end.toISOString().split('T')[0];
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);

            // Modified total discount calculation
            const totalDiscount = await Order.aggregate([
                { 
                    $match: { 
                        createdOn: { $gte: start, $lt: end },
                        discount: { $exists: true }
                    } 
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $cond: [
                                    { $ne: ["$discount", null] },
                                    "$discount",
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            // Rest of your existing aggregations...
            const totalSales = await Order.aggregate([
                { $match: { createdOn: { $gte: start, $lt: end } } },
                { $group: { _id: null, total: { $sum: "$finalAmount" } } }
            ]);

            const dailySales = await Order.aggregate([
                { $match: { createdOn: { $gte: start, $lt: end } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdOn" } }, total: { $sum: "$finalAmount" } } },
                { $sort: { "_id": 1 } }
            ]);

            const dailyOrders = await Order.aggregate([
                { $match: { createdOn: { $gte: start, $lt: end } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdOn" } }, count: { $sum: 1 } } },
                { $sort: { "_id": 1 } }
            ]);

            const dailyDiscounts = await Order.aggregate([
                { $match: { createdOn: { $gte: start, $lt: end } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdOn" } }, total: { $sum: "$discount" } } },
                { $sort: { "_id": 1 } }
            ]);
            

            const totalOrders = await Order.countDocuments({ createdOn: { $gte: start, $lt: end } });
            const returnedOrders = await Order.countDocuments({ status: "Returned", createdOn: { $gte: start, $lt: end } });
            const pendingOrders = await Order.countDocuments({ status: "Pending", createdOn: { $gte: start, $lt: end } });
            const deliveredOrders = await Order.countDocuments({ status: "Delivered", createdOn: { $gte: start, $lt: end } });
            const shippedOrders = await Order.countDocuments({ status: "Shipped", createdOn: { $gte: start, $lt: end } });
            const processingOrders = await Order.countDocuments({ status: "Processing", createdOn: { $gte: start, $lt: end } });
            const totalUsers = await User.countDocuments({ 
                isAdmin: { $ne: true },
                isBlocked: { $ne: true }
            });
            const topProducts = await Order.aggregate([
                { $match: { createdOn: { $gte: start, $lt: end } } },
                { $unwind: "$product" },
                {
                    $group: {
                        _id: "$product.productId",
                        totalSold: { $sum: "$product.quantity" },
                        totalRevenue: { $sum: { $multiply: ["$product.quantity", "$product.price"] } }
                    }
                },
                { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productDetails" } },
                { $unwind: "$productDetails" },
                { $sort: { totalSold: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: "$productDetails.productName", 
                        brand: "$productDetails.brand",
                        totalSold: 1,
                        totalRevenue: 1
                    }
                }
            ]);
            

            const topCategories = await Order.aggregate([
                { $match: { createdOn: { $gte: start, $lt: end } } },
                { $unwind: "$product" },
                { $lookup: { from: "products", localField: "product.productId", foreignField: "_id", as: "productDetails" } },
                { $unwind: "$productDetails" },
                {
                    $group: {
                        _id: "$productDetails.category",
                        totalSold: { $sum: "$product.quantity" },
                        totalRevenue: { $sum: { $multiply: ["$product.quantity", "$product.price"] } }
                    }
                },
                { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "categoryDetails" } },
                { $unwind: "$categoryDetails" },
                { $sort: { totalSold: -1 } },
                { $limit: 10 },
                { $project: { name: "$categoryDetails.name", totalSold: 1, totalRevenue: 1 } }
            ]);

            const topBrands = await Order.aggregate([
                { $match: { createdOn: { $gte: start, $lt: end } } },
                { $unwind: "$product" },
                { $lookup: { from: "products", localField: "product.productId", foreignField: "_id", as: "productDetails" } },
                { $unwind: "$productDetails" },
                {
                    $group: {
                        _id: "$productDetails.brand",
                        totalSold: { $sum: "$product.quantity" },
                        totalRevenue: { $sum: { $multiply: ["$product.quantity", "$product.price"] } }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 10 },
                { $project: { name: "$_id", totalSold: 1, totalRevenue: 1 } }
            ]);

            res.render("dashboard", {
                totalSales: totalSales[0]?.total || 0,
                totalOrders,
                returnedOrders,
                pendingOrders,
                deliveredOrders,
                shippedOrders,
                processingOrders,
                totalUsers,
                totalDiscount: totalDiscount[0]?.total || 0, // Modified this line
                startDate,
                endDate,
                dailySales: JSON.stringify(dailySales),
                dailyOrders: JSON.stringify(dailyOrders),
                dailyDiscounts: JSON.stringify(dailyDiscounts),
                topProducts: JSON.stringify(topProducts),
                topCategories: JSON.stringify(topCategories),
                topBrands: JSON.stringify(topBrands)
            });
        } catch (error) {
            console.log("Dashboard error", error);
            next(error);
        }
    } else {
        res.redirect("/admin/login");
    }
};
const logout=async(req,res)=>{    
    try {
        delete req.session.admin; 
        res.redirect('/admin/login');
    } catch (error) {
        console.error('Unexpected Error in Admin Logout:', error.message);
        res.redirect('/pageNotFound');
    }
};



module.exports={
loadlogin,
login,
loadDashbord,
logout,
generatePdfReport,
generateExcelReport

}

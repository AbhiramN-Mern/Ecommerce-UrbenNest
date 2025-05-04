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
            const amount = order.totalPrice !== undefined ? `${order.totalPrice.toFixed(2)}` : '0.00';
            const discount = order.discount !== undefined ? `${order.discount.toFixed(2)}` : '0.00';
            const finalAmount = order.finalAmount !== undefined ? `${order.finalAmount.toFixed(2)}` : '0.00';
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
        worksheet.getCell(`C${summaryRow + 2}`).value = `${orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed(2)}`;

        worksheet.mergeCells(`A${summaryRow + 3}:B${summaryRow + 3}`);
        worksheet.getCell(`A${summaryRow + 3}`).value = 'Total Discount';
        worksheet.getCell(`C${summaryRow + 3}`).value = `${orders.reduce((sum, order) => sum + (order.discount || 0), 0).toFixed(2)}`;

        worksheet.mergeCells(`A${summaryRow + 4}:B${summaryRow + 4}`);
        worksheet.getCell(`A${summaryRow + 4}`).value = 'Total Final Amount';
        worksheet.getCell(`C${summaryRow + 4}`).value = `${orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0).toFixed(2)}`;

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
        const doc = new PDFDocument({ size: 'A4', autoFirstPage: false, margin: 0 });
        const filePath = path.join(__dirname, 'report.pdf');
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        const colors = {
            primary: '#003087',
            secondary: '#005EB8',
            accent: '#00A859',
            text: '#333333',
            lightGray: '#E0E0E0',
            tableBorder: '#CCCCCC',
            summaryBackground: '#D3D3D3', 
            summaryText: '#000000', 
            summaryHeader: '#000000' 
        };

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

        if (orders.length === 0) {
            doc.addPage();
            doc.font('Helvetica').fontSize(12).fillColor(colors.text)
                .text('No orders found for the selected period.', 50, 50);
            doc.end();
            writeStream.on('finish', () => {
                res.download(filePath, 'report.pdf', (err) => {
                    if (err) console.log("Error downloading file", err);
                    fs.unlinkSync(filePath);
                });
            });
            return;
        }

        const pageWidth = 595;
        const pageHeight = 842;
        const margin = 50;
        
        const columnWidths = [100, 80, 40, 70, 70, 70, 70];
        const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        const headers = ['Order ID', 'Date', 'Items', 'Amount', 'Discount', 'Final Amt', 'Payment'];
        const headerHeight = 100;
        const rowHeight = 25;
        const summaryHeight = 130;
        const tableX = (pageWidth - totalTableWidth) / 2; 
        const maxRowsPerPage = Math.floor((pageHeight - headerHeight - margin * 2) / rowHeight);
        const maxRowsLastPage = Math.floor((pageHeight - headerHeight - margin * 2 - summaryHeight) / rowHeight);

        let y = margin;
        let pageNumber = 0;

        const addHeader = () => {
            doc.fillColor(colors.primary).font('Helvetica-Bold').fontSize(20)
                .text('Sales Report', margin, 20, { align: 'center' });
            doc.fillColor(colors.secondary).fontSize(12)
                .text(`Period: ${startDate} to ${endDate}`, margin, 45, { align: 'center' });
            doc.moveTo(margin, 70).lineTo(pageWidth - margin, 70)
                .strokeColor(colors.lightGray).stroke();
        };

        const addFooter = () => {
            doc.fillColor(colors.text).font('Helvetica').fontSize(10)
                .text(`Page ${pageNumber}`, pageWidth - margin - 30, pageHeight - 30, { align: 'right' });
        };

        const drawTableBorders = (startY, rowCount) => {
            const tableHeight = rowHeight * rowCount;
            let xPos = tableX;

        
            for (let i = 0; i <= columnWidths.length; i++) {
                doc.moveTo(xPos, startY)
                    .lineTo(xPos, startY + tableHeight)
                    .strokeColor(colors.tableBorder)
                    .stroke();
                xPos += columnWidths[i] || 0;
            }

            
            for (let i = 0; i <= rowCount; i++) {
                doc.moveTo(tableX, startY + (i * rowHeight))
                    .lineTo(tableX + totalTableWidth, startY + (i * rowHeight))
                    .strokeColor(colors.tableBorder)
                    .stroke();
            }
        };

        const renderPageContent = (startIndex, endIndex, isLastPage = false) => {
            doc.addPage();
            pageNumber++;
            y = margin;

            addHeader();
            y = 80;

            
            doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.primary)
                .text('Order Details', tableX, y);
            y += 20;

            const tableStartY = y;
            let xPos = tableX;

            
            doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary);
            headers.forEach((header, i) => {
                doc.text(header, xPos + 5, y + 5, { width: columnWidths[i] - 10, align: 'center' });
                xPos += columnWidths[i];
            });
            y += rowHeight;

            
            doc.font('Helvetica').fontSize(8).fillColor(colors.text);
            for (let i = startIndex; i <= endIndex && i < orders.length; i++) {
                const order = orders[i];
                const itemCount = Array.isArray(order.product) ? order.product.length : 0;
                xPos = tableX;

                const rowData = [
                    order.orderId.slice(0, 15),
                    order.createdOn.toLocaleDateString(),
                    itemCount.toString(),
                    order.totalPrice !== undefined ? `${order.totalPrice.toFixed(2)}` : '0.00',
                    order.discount !== undefined ? `${order.discount.toFixed(2)}` : '0.00',
                    order.finalAmount !== undefined ? `${order.finalAmount.toFixed(2)}` : '0.00',
                    order.payment || 'N/A'
                ];

                rowData.forEach((data, j) => {
                    doc.text(data, xPos + 5, y + 5, { width: columnWidths[j] - 10, align: j > 2 ? 'right' : 'left' });
                    xPos += columnWidths[j];
                });
                y += rowHeight;
            }

            
            const rowCount = (endIndex - startIndex + 1) + 1; 
            drawTableBorders(tableStartY, rowCount);

            if (isLastPage) {
                if (y + summaryHeight > pageHeight - margin) {
                    addFooter();
                    doc.addPage();
                    pageNumber++;
                    y = margin;
                    addHeader();
                } else {
                    y += 20;
                }

                
                const summaryTop = y + 20; 
                doc.font('Helvetica-Bold').fontSize(16).fillColor(colors.summaryHeader)
                    .text('Summary', margin, y); 
                y += 35; 

                const totalOrders = orders.length;
                const totalAmount = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed(2);
                const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0).toFixed(2);
                const totalFinalAmount = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0).toFixed(2);

                const summaryWidth = pageWidth - (margin * 2);
                doc.rect(margin, summaryTop, summaryWidth, 80)
                    .fillOpacity(1)
                    .fill(colors.summaryBackground)
                    .stroke(colors.tableBorder);

                doc.font('Helvetica').fontSize(14).fillColor(colors.summaryText);
                doc.text(`Total Orders: ${totalOrders}`, margin + 15, summaryTop + 15);
                doc.text(`Total Amount: ${totalAmount}`, margin + 200, summaryTop + 15);
                doc.text(`Total Discount: ${totalDiscount}`, margin + 15, summaryTop + 40);
                doc.fillColor(colors.accent)
                    .text(`Final Amount: ${totalFinalAmount}`, margin + 200, summaryTop + 40);
            }

            addFooter();
        };

        
        let i = 0;
        const totalOrders = orders.length;
        const totalPages = Math.ceil(totalOrders / maxRowsPerPage);
        const rowsPerPage = Math.min(maxRowsPerPage, Math.ceil(totalOrders / totalPages));

        while (i < orders.length) {
            const startIndex = i;
            const remainingOrders = totalOrders - i;
            const isLastPage = (i + rowsPerPage >= totalOrders || remainingOrders <= maxRowsLastPage);
            const rowsForThisPage = isLastPage ? remainingOrders : rowsPerPage;
            const endIndex = i + rowsForThisPage - 1;

            renderPageContent(startIndex, endIndex, isLastPage);
            i += rowsForThisPage;
            y = margin;
        }

        doc.end();

        writeStream.on('finish', () => {
            res.download(filePath, 'report.pdf', (err) => {
                if (err) console.log("Error downloading file", err);
                fs.unlinkSync(filePath);
            });
        });
    } catch (error) {
        console.log("Error generating PDF report", error);
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
                { $group: { _id: null, total: { $sum: { $round:["$finalAmount",0] } } }}
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
                totalSales:Math.round(totalSales[0]?.total || 0),
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

const Wallet = require('../../models/walletSchema');
const User = require('../../models/userSchema');

const walletController = {
    // Get all wallet transactions
    getAllTransactions: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 10;
            const skip = (page - 1) * limit;

            // Aggregate wallet transactions with user details
            const walletTransactions = await Wallet.aggregate([
                { $unwind: "$history" },
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "userDetails"
                    }
                },
                {
                    $project: {
                        transactionId: "$history._id",
                        date: "$history.date",
                        amount: "$history.amount",
                        status: "$history.status",
                        description: "$history.description",
                        userName: { $arrayElemAt: ["$userDetails.name", 0] },
                        userEmail: { $arrayElemAt: ["$userDetails.email", 0] },
                        currentBalance: "$balance"
                    }
                },
                { $sort: { date: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);

            // Get total count for pagination
            const totalCount = await Wallet.aggregate([
                { $unwind: "$history" },
                { $count: "total" }
            ]);

            const totalPages = Math.ceil((totalCount[0]?.total || 0) / limit);

            res.render('admin/wallet-transactions', {
                transactions: walletTransactions,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });

        } catch (error) {
            console.error('Error in getAllTransactions:', error);
            res.status(500).render('admin/error', {
                message: 'Error fetching wallet transactions'
            });
        }
    },

    // Get transaction details
    getTransactionDetails: async (req, res) => {
        try {
            const { transactionId } = req.params;
            const transaction = await Wallet.findOne(
                { "history._id": transactionId },
                { "history.$": 1 }
            ).populate('user', 'name email');

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            res.json({
                success: true,
                transaction: transaction.history[0],
                user: transaction.user
            });

        } catch (error) {
            console.error('Error in getTransactionDetails:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching transaction details'
            });
        }
    },

    // Get wallet statistics
    getWalletStats: async (req, res) => {
        try {
            const stats = await Wallet.aggregate([
                {
                    $unwind: "$history"
                },
                {
                    $group: {
                        _id: null,
                        totalTransactions: { $sum: 1 },
                        totalCredits: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$history.status", "credit"] },
                                    "$history.amount",
                                    0
                                ]
                            }
                        },
                        totalDebits: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$history.status", "debit"] },
                                    "$history.amount",
                                    0
                                ]
                            }
                        }
                    }
                }
            ]);

            res.json({
                success: true,
                stats: stats[0] || {
                    totalTransactions: 0,
                    totalCredits: 0,
                    totalDebits: 0
                }
            });

        } catch (error) {
            console.error('Error in getWalletStats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching wallet statistics'
            });
        }
    }
};

module.exports = walletController;
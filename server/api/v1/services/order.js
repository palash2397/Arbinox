import orderModel from "../../../models/orderModel";


const orderServices = {

    createOrder: async (insertObj) => {
        return await orderModel.create(insertObj);
    },

    findOrder: async (query) => {
        return await orderModel.findOne(query);
    },

    updateOrder: async (query, updateObj) => {
        return await orderModel.findOneAndUpdate(query, updateObj, { upsert: true, new: true });
    },

    orderList: async (query) => {
        return await orderModel.find(query);
    },
    paginateSearchTransactionHistory: async (validatedBody) => {
        let query = { userId: validatedBody.userId };
        const { search, fromDate, toDate, page, limit } = validatedBody;
        if (search) {
            query.$or = [
                { symbol: { $regex: search, $options: 'i' } },
            ]
        }
        if (fromDate && !toDate) {
            query.createdAt = { $gte: fromDate };
        }
        if (!fromDate && toDate) {
            query.createdAt = { $lte: toDate };
        }
        if (fromDate && toDate) {
            query.$and = [
                { createdAt: { $gte: fromDate } },
                { createdAt: { $lte: toDate } },
            ]
        }
        let options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 15,
            sort: { createdAt: -1 }
        };
        return await orderModel.paginate(query, options);
    },
    orderCount: async (query) => {
        return await orderModel.countDocuments(query);
    },
}

module.exports = { orderServices };
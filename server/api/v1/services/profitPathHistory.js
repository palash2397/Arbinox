import profitPathHistoryModel from "../../../models/profitPathHistory";
import status from '../../../enums/status';

const profitPathHistoryServices = {

    createProfitPathHistory: async (insertObj) => {
        return await profitPathHistoryModel.create(insertObj);
    },

    findProfitPathHistory: async (query) => {
        return await profitPathHistoryModel.findOne(query);
    },

    updateProfitPathHistory: async (query, updateObj) => {
        return await profitPathHistoryModel.findOneAndUpdate(query, updateObj, { new: true });
    },

    listProfitPathHistory: async (query) => {
        return await profitPathHistoryModel.find(query);
    },
    insertManyProfitPathHistory: async (obj) => {
        return await profitPathHistoryModel.insertMany(obj);
    },
    profitPathHistorListPagination: async (validatedBody) => {
        let query = { status: { $ne: status.DELETE } };
        const {page, limit, search,fromDate,toDate } = validatedBody;
        if (search&&search!='') {
            query.arbitrageName = { $regex: search, $options: 'i' } 
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
            limit: parseInt(limit) || 10,
            sort: { createdAt: -1 }
        };
        return await profitPathHistoryModel.paginate(query, options);
    },

}

module.exports = { profitPathHistoryServices };
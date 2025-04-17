import exchangeModel from "../../../models/exchange";
import connectedExchangeModel from "../../../models/connectedExchange";
import triangularModel from "../../../models/triangular";


const triangularServices = {
    triangularCreate: async (insertObj) => {
        return await triangularModel(insertObj).save();
    },
    triangularData: async (query) => {
        return await triangularModel.findOne(query);
    },
    triangularList: async (query) => {
        return await triangularModel.paginate(query);
    },
    triangularAllList: async (query) => {
        return await triangularModel.find(query);
    },
    triangularUpdate: async (query, updateObj) => {
        return await triangularModel.findByIdAndUpdate(query, updateObj, { new: true });
    },
    triangularHighestProfit: async (query) => {
        return await triangularModel.find(query).sort({ profit: -1 }).limit(1);
    },
    triangularArbitrageListWithPaginate: async (validatedBody) => {
        let query = { status: { $ne: "DELETE" }, userId: validatedBody.userId };
        const { fromDate, toDate, page, limit, arbitrageStatus, arbitrageType } = validatedBody;
        if (arbitrageStatus) {
            query.arbitrageStatus = arbitrageStatus
        }
        if (arbitrageType) {
            query.arbitrageType = arbitrageType
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
            sort: { createdAt: -1 },
            populate: ({ path: 'connectedExchangeId', select: { 'secretKey': 1 } })
        };
        return await triangularModel.paginate(query, options);
    },
    multiTriangularUpdate: async (query, updateObj) => {
        return await triangularModel.updateMany(query, updateObj, { multi: true });
    },
}

module.exports = { triangularServices };
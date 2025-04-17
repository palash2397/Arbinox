import exchangeModel from "../../../models/exchange";
import connectedExchangeModel from "../../../models/connectedExchange";
import directArbitrageModel from '../../../models/directarbitrage';

const directServices = {
    directArbitrageCreate: async (insertObj) => {
        return await directArbitrageModel(insertObj).save();
    },
    directArbitrageList: async (query) => {
        return await directArbitrageModel.find(query);
    },
    directArbitrageData: async (query) => {
        return await directArbitrageModel.findOne(query);
    },
    directArbitrageUpdate: async (query, updateObj) => {
        return await directArbitrageModel.findByIdAndUpdate(query, updateObj, { new: true });
    },
    directHighestCount: async (query) => {
        return await directArbitrageModel.find(query).sort({ profit: -1 }).limit(1);
    },
    directArbitrageListWithPaginate: async (validatedBody) => {
        let query = { status: { $ne: "DELETE" }, userId: validatedBody.userId };
        const { search, fromDate, toDate, page, limit, arbitrageStatus,arbitrageType } = validatedBody;
        if (search) {
            query.$or = [
                { base: { $regex: search, $options: 'i' } },
            ]
        }
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
            populate: ({ path: 'connectedExchangeId1 connectedExchangeId2', select: { 'secretKey': 0 } })
        };
        return await directArbitrageModel.paginate(query, options);
    },
}

module.exports = { directServices };
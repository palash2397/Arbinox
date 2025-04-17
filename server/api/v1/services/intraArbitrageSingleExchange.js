import intraArbitrageSingleExchangeModel from "../../../models/intraArbitrageSingleExchange";


const intraAbitrageSingleExchangeServices = {
    intraArbitrageSingleExchangeCreate: async (insertObj) => {
        return await intraArbitrageSingleExchangeModel(insertObj).save();
    },
    intraArbitrageSingleExchangeData: async (query) => {
        return await intraArbitrageSingleExchangeModel.findOne(query);
    },
    intraArbitrageSingleExchangeList: async (query) => {
        return await intraArbitrageSingleExchangeModel.paginate(query);
    },
    intraArbitrageSingleExchangeAllList: async (query) => {
        return await intraArbitrageSingleExchangeModel.find(query);
    },
    intraArbitrageSingleExchangeUpdate: async (query, updateObj) => {
        return await intraArbitrageSingleExchangeModel.findByIdAndUpdate(query, updateObj, { new: true });
    },
    intraArbitrageSingleExchangeHighestProfit: async (query) => {
        return await intraArbitrageSingleExchangeModel.find(query).sort({ profit: -1 }).limit(1);
    },
    intraArbitrageSingleExchangeArbitrageListWithPaginate: async (validatedBody) => {
        let query = { status: { $ne: "DELETE" }, userId: validatedBody.userId };
        const { fromDate, toDate, page, limit, arbitrageStatus,sorting,arbitrageType } = validatedBody;
        let sorts
        if (sorting == 'ASC') {
            sorts = 1
        } else {
            sorts = -1
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
            sort: { createdAt: sorts },
            populate: ({ path: 'connectedExchangeId', select: { 'secretKey': 1 } })
        };
        return await intraArbitrageSingleExchangeModel.paginate(query, options);
    },
    intraArbitrageSingleExchangeHighestCount: async (query) => {
        return await intraArbitrageSingleExchangeModel.find(query).sort({ profit: -1 }).limit(1);
    },
    multiArbitrageSingleExchangeUpdate: async (query, updateObj) => {
        return await intraArbitrageSingleExchangeModel.updateMany(query, updateObj, { multi: true });
    },
}

module.exports = { intraAbitrageSingleExchangeServices };
import exchangeModel from "../../../models/exchange";
import connectedExchangeModel from "../../../models/connectedExchange";
import loopArbitrageModel from '../../../models/interLoopArbitrage';

const loopServices = {
    loopArbitrageCreate:async(insertObj)=>{
        return await loopArbitrageModel(insertObj).save();
    },
    loopArbitrageList: async (query) => {
        return await loopArbitrageModel.find(query);
    },
    loopArbitrageData:async(query)=>{
        return await loopArbitrageModel.findOne(query);
    },
    loopArbitrageUpdate:async(query,updateObj)=>{
        return await loopArbitrageModel.findByIdAndUpdate(query,updateObj,{new:true});
    },
    loopHighestProfit: async (query) => {
        return await loopArbitrageModel.find(query).sort({ profit: -1 }).limit(1);
    },
    loopArbitrageListWithPaginate: async (validatedBody) => {
        let query = { status: { $ne: "DELETE" }, userId: validatedBody.userId };
        const { fromDate, toDate, page, limit, arbitrageStatus } = validatedBody;
        if (arbitrageStatus) {
            query.arbitrageStatus = arbitrageStatus
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
        return await loopArbitrageModel.paginate(query, options);
    },
}

module.exports = { loopServices };
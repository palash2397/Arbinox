import rebalancingTradeMode from '../../../models/rebalancingTrade';

const rebalancingTradeServices = {
    rebalancingTradeCreate:async(insertObj)=>{
        return await rebalancingTradeMode(insertObj).save();
    },
    rebalancingTradeList: async (query) => {
        return await rebalancingTradeMode.find(query);
    },
    rebalancingTradeData:async(query)=>{
        return await rebalancingTradeMode.findOne(query);
    },
    rebalancingTradeUpdate:async(query,updateObj)=>{
        return await rebalancingTradeMode.findByIdAndUpdate(query,updateObj,{new:true});
    }
}
module.exports = { rebalancingTradeServices };
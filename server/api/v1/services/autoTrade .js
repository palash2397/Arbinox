import exchangeModel from "../../../models/exchange";
import connectedExchangeModel from "../../../models/connectedExchange";
import autoTradeModel from '../../../models/autoTrade';

const autoTradeServices = {
    autoTradeCreate:async(insertObj)=>{
        return await autoTradeModel(insertObj).save();
    },
    autoTradeList: async (query) => {
        return await autoTradeModel.find(query);
    },
    autoTradeData:async(query)=>{
        return await autoTradeModel.findOne(query);
    },
    autoTradeUpdate:async(query,updateObj)=>{
        return await autoTradeModel.findByIdAndUpdate(query,updateObj,{new:true});
    }
}
module.exports = { autoTradeServices };
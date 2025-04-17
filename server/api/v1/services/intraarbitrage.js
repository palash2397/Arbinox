import exchangeModel from "../../../models/exchange";
import connectedExchangeModel from "../../../models/connectedExchange";
import intraArbitrageModel from '../../../models/intraarbitrage';

const intraServices = {
    intraArbitrageCreate:async(insertObj)=>{
        return await intraArbitrageModel(insertObj).save();
    },
    intraArbitrageList: async (query) => {
        return await intraArbitrageModel.find(query);
    },
    intraArbitrageData:async(query)=>{
        return await intraArbitrageModel.findOne(query);
    },
    intraArbitrageUpdate:async(query,updateObj)=>{
        return await intraArbitrageModel.findByIdAndUpdate(query,updateObj,{new:true});
    }
}

module.exports = { intraServices };
import sniperBotModel from '../../../models/sniperBot';

const sniperBotServices = {
    sniperCreate:async(insertObj)=>{
        return await sniperBotModel(insertObj).save();
    },
    sniperList: async (query) => {
        return await sniperBotModel.find(query);
    },
    sniperData:async(query)=>{
        return await sniperBotModel.findOne(query);
    },
    sniperUpdate:async(query,updateObj)=>{
        return await sniperBotModel.findByIdAndUpdate(query,updateObj,{new:true});
    },
    multiSniperUpdate: async (query, updateObj) => {
        return await sniperBotModel.updateMany(query, updateObj, { multi: true });
    },
}
module.exports = { sniperBotServices };
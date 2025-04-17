import profitPathModel from '../../../models/getPathModel';

const profitPathServices = {
    profitpathCreate: async (insertObj) => {
        return await profitPathModel(insertObj).save();
    },
    profitpatheList: async (query) => {
        return await profitPathModel.find(query);
    },
    triangularProfitList: async (query,coinArray) => {
        return await profitPathModel.find(query);
    },
    profitpathData: async (query) => {
        return await profitPathModel.findOne(query);
    },
    profitpathUpdate: async (query, updateObj) => {
        return await profitPathModel.findByIdAndUpdate(query, updateObj, { new: true });
    },
    createUpdateProfitPath: async (query, updateObj) => {
        return await profitPathModel.findOneAndUpdate(query, updateObj, { new: true, upsert: true });
    },
}

module.exports = { profitPathServices };
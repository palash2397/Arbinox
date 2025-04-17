import capitalAmountModel from "../../../models/capitalAmount";
import status from '../../../enums/status';

const capitalAmountServices = {

    createCapitalAmount: async (insertObj) => {
        return await capitalAmountModel.create(insertObj);
    },

    findCapitalAmount: async (query) => {
        return await capitalAmountModel.findOne(query);
    },

    updateCapitalAmount: async (query, updateObj) => {
        return await capitalAmountModel.findOneAndUpdate(query, updateObj, { new: true });
    },

    listCapitalAmount: async (query) => {
        return await capitalAmountModel.find(query);
    },

}

module.exports = { capitalAmountServices };
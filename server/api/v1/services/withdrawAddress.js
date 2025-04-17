import withdrawAddressModel from "../../../models/withdrawAddress";
import status from '../../../enums/status';

const withdrawAddressServices = {

    createWithdrawAddress: async (insertObj) => {
        return await withdrawAddressModel.create(insertObj);
    },

    findWithdrawAddress: async (query) => {
        return await withdrawAddressModel.findOne(query);
    },

    updateWithdrawAddress: async (query, updateObj) => {
        return await withdrawAddressModel.findOneAndUpdate(query, updateObj, { new: true });
    },

    listWithdrawAddress: async (query) => {
        return await withdrawAddressModel.find(query);
    },

}

module.exports = { withdrawAddressServices };
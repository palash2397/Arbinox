import ipAddressCheckModel from "../../../models/ipAddressCheck";

const ipAddressCheckServices = {

    findIpAddressCheck: async (query) => {
        return await ipAddressCheckModel.findOne(query);
    },

    updateIpAddressCheck: async (query, updateObj) => {
        return await ipAddressCheckModel.findOneAndUpdate(query, updateObj, { new: true });
    },

}

module.exports = { ipAddressCheckServices };
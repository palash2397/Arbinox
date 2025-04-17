
import discountModel from "../../../models/discountPricing";


const discountServices = {

    addDiscountPricing: async (insertObj) => {
        return await discountModel.create(insertObj);
    },

    findDiscountPricing: async (query) => {
        return await discountModel.findOne(query);
    },

    updateDiscountPricing: async (query, updateObj) => {
        return await discountModel.findOneAndUpdate(query, updateObj, { new: true });
    },

}

module.exports = { discountServices };
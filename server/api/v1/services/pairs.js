import pairsModel from "../../../models/pairs";

const pairsServices = {

    createPairs: async (insertObj) => {
        return await pairsModel.create(insertObj);
    },

    findPairs: async (query) => {
        return await pairsModel.findOne(query);
    },

    updatePairs: async (query, updateObj) => {
        return await pairsModel.findOneAndUpdate(query, updateObj, { new: true });
    },

    listPairs: async (query) => {
        return await pairsModel.find(query);
    },

}

module.exports = { pairsServices };
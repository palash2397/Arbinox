
import userWalletModel from "../../../models/userWallet";
import status from "../../../enums/status";


const userWalletServices = {

    createUserWallet: async (query) => {
        return await userWalletModel.create(query);
    },

    findUserWallet: async (query) => {
        return await userWalletModel.findOne(query);
    },

    updateUserWallet: async (query, updateObj) => {
        return await userWalletModel.findOneAndUpdate(query, updateObj, { new: true });
    },

    userWalletList: async (query) => {
        return await userWalletModel.find(query);
    },
    createUpdateUserWallet: async (query, updateObj) => {
        return await userWalletModel.findOneAndUpdate(query, updateObj, { new: true, upsert: true });
    },
    userWalletCount: async (query) => {
        return await userWalletModel.countDocuments(query);
    },
    userWalletDelete: async (query) => {
        return await userWalletModel.deleteMany(query);
    },

}

module.exports = { userWalletServices };
import addressModel from "../../../models/discountAddresses";
import statuss from '../../../enums/status';

const addressServices = {

    addAddress: async (insertObj) => {
        return await addressModel.create(insertObj);
    },

    findAddress: async (query) => {
        return await addressModel.findOne(query);
    },

    updateAddress: async (query, updateObj) => {
        return await addressModel.findOneAndUpdate(query, updateObj, { new: true });
    },

    listAddress: async (query) => {
        return await addressModel.find(query);
    },
    getAllAddress: async (insertObj) => {
        let query = { status: { $ne: statuss.DELETE } };
        const { search, fromDate, toDate, page, limit, status } = insertObj;

        if (search) {
            query.$or = [
                { address: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) {
            query.status = status
        }
        if (fromDate && !toDate) {
            query.createdAt = { $gte: fromDate };
        }
        if (!fromDate && toDate) {
            query.createdAt = { $lte: toDate };
        }
        if (fromDate && toDate) {
            query.$and = [
                { createdAt: { $gte: fromDate } },
                { createdAt: { $lte: toDate } },
            ]
        }

        let options = {
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            sort: { createdAt: -1 },
        };
        return await addressModel.paginate(query, options);
    },

}

module.exports = { addressServices };
import ipAddressModel from "../../../models/ipAddress";
import status from '../../../enums/status';

const ipAddressServices = {

    createIpAddress: async (insertObj) => {
        return await ipAddressModel.create(insertObj);
    },

    findIpAddress: async (query) => {
        return await ipAddressModel.findOne(query);
    },

    updateIpAddress: async (query, updateObj) => {
        return await ipAddressModel.findOneAndUpdate(query, updateObj, { new: true });
    },

    listIpAddress: async (query) => {
        return await ipAddressModel.find(query);
    },
    ipAddressListPagination: async (validatedBody) => {
        let query = { status: { $ne: status.DELETE } };
        const { page, limit, search } = validatedBody;
        if (search && search != '') {
            query.title = { $regex: search, $options: 'i' }
        }
        let options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            sort: { createdAt: -1 }
        };
        return await ipAddressModel.paginate(query, options);
    },

}

module.exports = { ipAddressServices };
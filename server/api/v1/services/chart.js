import chartModel from "../../../models/chart";
import status from '../../../enums/status';

const chartServices = {

    createChart: async (insertObj) => {
        return await chartModel.create(insertObj);
    },

    findChart: async (query) => {
        return await chartModel.findOne(query);
    },

    updateChart: async (query, updateObj) => {
        return await chartModel.findOneAndUpdate(query, updateObj, { new: true });
    },

    listChart: async (query) => {
        return await chartModel.find(query);
    },
    chartListPagination: async (validatedBody) => {
        let query = { status: { $ne: status.DELETE } };
        const {page, limit, search } = validatedBody;
        if (search&&search!='') {
            query.question = { $regex: search, $options: 'i' } 
        }
        let options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            sort: { createdAt: -1 }
        };
        return await chartModel.paginate(query, options);
    },

}

module.exports = { chartServices };
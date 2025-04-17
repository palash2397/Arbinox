import faqModel from "../../../models/faq";
import status from '../../../enums/status';

const faqServices = {

    createFAQ: async (insertObj) => {
        return await faqModel.create(insertObj);
    },

    findFAQ: async (query) => {
        return await faqModel.findOne(query);
    },

    updateFAQ: async (query, updateObj) => {
        return await faqModel.findOneAndUpdate(query, updateObj, { new: true });
    },

    listFaq: async (query) => {
        return await faqModel.find(query);
    },
    faqListPagination: async (validatedBody) => {
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
        return await faqModel.paginate(query, options);
    },

}

module.exports = { faqServices };
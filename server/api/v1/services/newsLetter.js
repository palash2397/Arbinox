
import subscribeModel from "../../../models/newsLetter";
import statuss from '../../../enums/status';



const subscribeServices = {

  createSubscribe: async (insertObj) => {
    return await subscribeModel.create(insertObj);
  },
  findSubscribe: async (insertObj) => {
    return await subscribeModel.findOne(insertObj);
  },
  updateSubscribe: async (query, updateObj) => {
    return await subscribeModel.findOneAndUpdate(query, updateObj, { new: true, upsert: true });
  },
  deleteAllSubscribe: async () => {
    return await subscribeModel.deleteMany({});
  },
  getAllSubscribe: async (insertObj) => {

    let query = { status: { $ne: statuss.DELETE } };
    const { search, fromDate, toDate, page, limit, status, reply } = insertObj;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    if (status) {
      query.status = status
    }

    if (reply) {
      query.reply = reply
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
      select: '-otp -password -base64 -secretGoogle -emailotp2FA -withdrawOtp'
    };
    return await subscribeModel.paginate(query, options);
  },

  viewSubscribe: async (insertObj) => {
    return await subscribeModel.findOne(insertObj);
  },
  subscribeCount: async (query) => {
    return await subscribeModel.countDocuments(query);
  },

}

module.exports = { subscribeServices };

import exchangeModel from "../../../models/exchange";
import connectedExchangeModel from "../../../models/connectedExchange";
import withdrawHistory from "../../../models/withdrawHistory";
import status from "../../../enums/status";



const walletServices = {

  exchangeList: async (query) => {
    return await exchangeModel.find(query).select(['-withdrawFee', '-assets', '-coins', '-tickers', '-tradeFee']);
  },
  exchangesList: async (query, options) => {
    return await exchangeModel.paginate(query, options);
  },
  coinsData: async (query) => {
    return await exchangeModel.findOne(query).select(['coins']);
  },
  exchangeData: async (query) => {
    return await exchangeModel.findOne(query);
  },
  deleteExchange: async (query) => {
    return await exchangeModel.findByIdAndDelete(query)
  },
  connectedExchangeCreate: async (insertObj) => {
    return await connectedExchangeModel(insertObj).save();
  },
  connectedExchangeData: async (query) => {
    return await connectedExchangeModel.findOne(query);
  },
  connectedExchangeList: async (query) => {
    return await connectedExchangeModel.find(query);
  },
  connectedExchangeUpdate: async (query, updateObj) => {
    return await connectedExchangeModel.findByIdAndUpdate(query, updateObj, { new: true });
  },
  withdrawHistoryList: async (query) => {
    return await withdrawHistory.find(query);
  },

  paginateSearchWithdrawHistory: async (validatedBody) => {
    let query = { status: { $ne: "DELETE" }, userId: validatedBody.userId };
    const { search, fromDate, toDate, page, limit, type } = validatedBody;
    if (search) {
      query.$or = [
        { coin: { $regex: search, $options: 'i' } },
      ]
    }
    if (type) {
      query.type = type;
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
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 15,
      sort: { createdAt: -1 }
    };
    return await withdrawHistory.paginate(query, options);
  },

  findCount: async (query) => {
    return await withdrawHistory.countDocuments(query);
  },
  createWithdrawHistory: async (insertObj) => {
    return await withdrawHistory.create(insertObj);
  },
  withdrawHistoryUpdate: async (query, updateObj) => {
    return await withdrawHistory.findByIdAndUpdate(query, updateObj, { new: true });
  },
  withdrawHistoryFindOneAndUpdate: async (query, updateObj) => {
    return await withdrawHistory.findOneAndUpdate(query, updateObj, { upsert: true, new: true });
  },
  connectedExchangeCount: async (query) => {
    return await connectedExchangeModel.countDocuments(query);
  },
  connectedExchangeUpdateMany: async (query, updateObj) => {
    return await connectedExchangeModel.updateMany(query, updateObj, { new: true });
  },
}

module.exports = { walletServices };
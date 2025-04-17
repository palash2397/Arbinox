
import userModel from "../../../models/user";
import status from '../../../enums/status';
import userType from "../../../enums/userType";


const userServices = {
  userCheck: async (userId) => {
    let query = { $and: [{ status: { $ne: status.DELETE } }, { $or: [{ email: userId }, { mobileNumber: userId }] }] }
    return await userModel.findOne(query);
  },

  checkUserExists: async (email, javaUID) => {
    let query = { $and: [{ status: { $ne: status.DELETE } }, { $or: [{ email: email }, { javaUID: javaUID }] }] }
    return await userModel.findOne(query);
  },
  emailMobileExist: async (email, mobileNumber) => {
    let query = { $and: [{ status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } }, { $or: [{ email: email }, { mobileNumber: mobileNumber }] }] }
    return await userModel.findOne(query);
  },

  emailMobileExist: async (mobileNumber, email, id) => {
    let query = { $and: [{ status: { $ne: status.DELETE } }, { _id: { $ne: id } }, { $or: [{ email: email }, { mobileNumber: mobileNumber }] }] }
    return await userModel.findOne(query);
  },

  checkSocialLogin: async (socialId, socialType) => {
    return await userModel.findOne({ socialId: socialId, socialType: socialType });
  },

  createUser: async (insertObj) => {
    return await userModel.create(insertObj);
  },

  findUser: async (query) => {
    return await userModel.findOne(query);
  },
  findCount: async (query) => {
    return await userModel.countDocuments(query);
  },

  updateUser: async (query, updateObj) => {
    return await userModel.findOneAndUpdate(query, updateObj, { new: true })
      .select('-password -otp');
  },
  multiUpdateUser: async (query, updateObj) => {
    return await userModel.updateMany(query, updateObj, { multi: true });
  },
  updateUserById: async (query, updateObj) => {
    return await userModel.findByIdAndUpdate(query, updateObj, { new: true });
  },

  insertManyUser: async (obj) => {
    return await userModel.insertMany(obj);
  },
  createAddress: async (validatedBody) => {
    return await userModel(validatedBody).save()
  },

  editEmailMobileExist: async (email, mobileNumber, userId) => {
    let query = { $and: [{ status: { $ne: status.DELETE } }, { _id: { $ne: userId } }, { $or: [{ email: email }, { mobileNumber: mobileNumber }] }] }
    return await userModel.findOne(query);
  },

  findAllUser: async (query) => {
    return await userModel.find(query);
  },

  paginateSearch: async (validatedBody) => {
    let query = { status: { $ne: status.DELETE } };
    const { search, fromDate, toDate, page, limit, userType1 } = validatedBody;
    if (userType1) {
      query.userType = userType1
    } else {
      query.userType = userType.USER
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
      ]
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
    return await userModel.paginate(query, options);
  },


  paginateSearchAll: async (validatedBody) => {
    let query = { status: { $ne: status.DELETE }, userType: { $nin: [userType.ADMIN, userType.SUBADMIN] } };
    const { search, fromDate, toDate, page, limit } = validatedBody;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
      ]
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
    return await userModel.paginate(query, options);
  },

  findUserWithOtp: async (query) => {
    return await userModel.findOne(query);
  },
  aggregateSearchList: async (body) => {
    const { search, page, limit, fromDate, toDate, planStatus, type, status1, sort } = body;
    if (search) {
      var filter = search;
    }
    let sorts
    if (sort == 'ASC') {
      sorts = 1
    } else {
      sorts = -1
    }
    let userStatus = { '$nin': [status.DELETE] }
    if (status1) {
      userStatus = { '$in': [status1] }
    }
    let data = filter || ""
    let searchData = [
      {
        $lookup: {
          from: "buysubsciptionplanhistories",
          localField: 'subscriptionPlaneId',
          foreignField: '_id',
          as: "subscriptionDetails",
        }
      },
      {
        $unwind: {
          path: "$subscriptionDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "buysubsciptionplanhistories",
          localField: 'previousPlaneId',
          foreignField: '_id',
          as: "previousPlanDetails",
        }
      },
      {
        $unwind: {
          path: "$previousPlanDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: { "status": userStatus },
      },
      {
        $match: { $or: [{ "email": { $regex: data, $options: "i" } }, { "firstName": { $regex: data, $options: "i" } }, { "lastName": { $regex: data, $options: "i" } }, { "mobileNumber": { $regex: data, $options: "i" } }] },
      },
      {
        $match: {
          'userType': { '$nin': [userType.ADMIN, userType.SUBADMIN] }
        }
      },
      { $sort: { createdAt: sorts } },
    ]
    if (planStatus) {
      searchData.push({
        $match: { "subscriptionDetails.planStatus": planStatus }
      })
    }
    if (type == 'SUBSRCIPTION' || type == 'SUBSRCIPTION_PREVIOUS') {
      let key
      if (type == 'SUBSRCIPTION') {
        key = '$subscriptionDetails.createdAt'
      } else {
        key = '$previousPlanDetails.createdAt'
      }
      if (fromDate && !toDate) {
        searchData.push({
          "$match": {
            "$expr": { "$lte": [key, new Date(new Date(toDate).toISOString().slice(0, 10) + 'T23:59:59.999Z')] }

          }
        })
      }
      if (!fromDate && toDate) {
        searchData.push({
          "$match": {
            "$expr": { "$lte": [key, new Date(new Date(toDate).toISOString().slice(0, 10) + 'T23:59:59.999Z')] }

          }
        })
      }
      if (fromDate && toDate) {
        searchData.push({
          "$match": {
            "$expr":
            {
              "$and": [{ "$lte": [key, new Date(new Date(toDate).toISOString().slice(0, 10) + 'T23:59:59.999Z')] },
              { "$gte": [key, new Date(new Date(fromDate).toISOString().slice(0, 10))] }]
            }
          }
        })
      }
    } else {
      if (fromDate && !toDate) {
        searchData.push({
          "$match": {
            "$expr": { "$lte": ["$createdAt", new Date(new Date(toDate).toISOString().slice(0, 10) + 'T23:59:59.999Z')] }

          }
        })
      }
      if (!fromDate && toDate) {
        searchData.push({
          "$match": {
            "$expr": { "$lte": ["$createdAt", new Date(new Date(toDate).toISOString().slice(0, 10) + 'T23:59:59.999Z')] }

          }
        })
      }
      if (fromDate && toDate) {
        searchData.push({
          "$match": {
            "$expr":
            {
              "$and": [{ "$lte": ["$createdAt", new Date(new Date(toDate).toISOString().slice(0, 10) + 'T23:59:59.999Z')] },
              { "$gte": ["$createdAt", new Date(new Date(fromDate).toISOString().slice(0, 10))] }]
            }
          }
        })
      }
    }
    searchData.push(
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          mobileNumber: 1,
          status: 1,
          userType: 1,
          createdAt: 1,
          updatedAt: 1,
          countryCode: 1,
          country: 1,
          termsAndConditions: 1,
          isSocial: 1,
          connectedExchange: 1,
          subscriptionPlaneStatus: 1,
          currentPlanName: 1,
          previousPlanName: 1,
          fuelUSDBalance: 1,
          fuelFIEROBalance: 1,
          currentPlanStatus: 1,
          subscriptionDetails: 1,
          previousPlanDetails: 1,
          speakeasy: 1,
          previousPlanStatus: 1,
          previousPlaneId: 1,
          fuelBalance: 1,
          dateOfBirth: 1,
        }
      },)
    let aggregate = userModel.aggregate(searchData)
    let options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      sort: { createdAt: sorts },
    };
    return await userModel.aggregatePaginate(aggregate, options)
  },
  findUserWithPopulate: async (query) => {
    return await userModel.findOne(query);
  },
  findUserCount: async (query) => {
    return await userModel.countDocuments(query);
  },
  findAllUserWithSelectedField: async (query) => {
    return await userModel.find(query).select('firstName lastName userName email mobileNumber userType status');
  },
}

module.exports = { userServices };
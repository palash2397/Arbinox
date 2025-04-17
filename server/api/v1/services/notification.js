import notificationModel from "../../../models/notification";


const notificationServices = {
    notificationCreate:async(insertObj)=>{
        return await notificationModel(insertObj).save();
    },
    notificationData:async(query)=>{
        return await notificationModel.findOne(query);
    },
    notificationList:async(query,page ,limit)=>{
        let options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 15,
            sort: { createdAt: -1 }
        };
        return await notificationModel.paginate(query,options);
    },
    notificationUpdate:async(query,updateObj)=>{
        return await notificationModel.findByIdAndUpdate(query,updateObj,{new:true});
    },
    multiUpdateNotification: async (query, updateObj) => {
        return await notificationModel.updateMany(query, updateObj, { multi: true });
    },
}

module.exports = { notificationServices };
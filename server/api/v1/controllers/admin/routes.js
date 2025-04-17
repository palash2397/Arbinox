import Express from "express";
import controller from "./controller";
import auth from '../../../../helper/auth'
import upload from '../../../../helper/uploadHandler';


export default Express.Router()

    .post('/login', controller.login)
    .put('/resendOTP', controller.resendOTP)
    .put('/forgotPassword', controller.forgotPassword)
    .post('/verifyOTP', controller.verifyOTP)
    .get('/subscriptionPlanList', controller.subscriptionPlanList)
    .get('/viewSubscription', controller.viewSubscription)
    .get('/subscriptionPlanListWithFilter', controller.subscriptionPlanListWithFilter)
    .get('/viewSubscriptionHistory', controller.viewSubscriptionHistory)
    .get('/getUserList', controller.getUserList)
    .get('/verifyGoogleAuthenctionCode', controller.verifyGoogleAuthenctionCode)
    .get('/verifyGoogleAuthenctionCodeForEnableDisable', controller.verifyGoogleAuthenctionCodeForEnableDisable)
    .get('/getIpAddressCheck', controller.getIpAddressCheck)
    .get('/getAllUser', controller.getAllUser)
    .get('/specificSubscriptionPlanList', controller.specificSubscriptionPlanList)
    .get('/getDiscountPricing', controller.getDiscountPricing)
    .use(auth.verifyToken)
    .post('/resetPassword', controller.resetPassword)
    .put('/contact-us/reply/:id', controller.replyContactUs)
    .get('/contact-us', controller.getContactUs)
    .get('/getProfile', controller.getProfile)
    .patch('/changePassword', controller.changePassword)
    .put('/blockUnblockInvitedUser', controller.blockUnblockInvitedUser)
    .put('/blockUnblockSubscriptionPlan', controller.blockUnblockSubscriptionPlan)
    .post('/updateCapitalAmount', controller.updateCapitalAmount)
    .get('/getCapitalAmount', controller.getCapitalAmount)
    .put('/deleteSubscriptionPlan', controller.deleteSubscriptionPlan)
    .get('/enableDisableGoogleAuthenction', controller.enableDisableGoogleAuthenction)
    .get('/listForUserBuySubcription', controller.listForUserBuySubcription)
    .put('/enableDisableSubscriptionPlan', controller.enableDisableSubscriptionPlan)
    .get('/allListForUserBuySubcription', controller.allListForUserBuySubcription)
    .post('/addSubscription', controller.addSubscription)
    .put('/editSubscription', controller.editSubscription)
    .get('/subscriptionPlanListWithFilterV1', controller.subscriptionPlanListWithFilterV1)
    .get('/disableUserGoogleAuthByAdmin', controller.disableUserGoogleAuthByAdmin)
    .get('/getUserProfile', controller.getUserProfile)
    .get('/updateIpAddressCheck', controller.updateIpAddressCheck)
    .get('/subscribers', controller.getSubscribers)
    .put('/updateDiscountPricing', controller.updateDiscountPricing)
    .post('/addDiscountAddress', controller.addDiscountAddress)
    .get('/getDiscountAddress', controller.getDiscountAddress)
    .put('/updateDiscountAddress', controller.updateDiscountAddress)
    .put('/resetWallet', controller.resetWallet)
    .get('/onOffHybrid', controller.onOffHybrid)

    .use(upload.uploadFile)
    .put('/editProfile', controller.editProfile)









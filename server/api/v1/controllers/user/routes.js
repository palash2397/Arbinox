import Express from "express";
import controller from "./controller";
import auth from "../../../../helper/auth";
import upload from '../../../../helper/uploadHandler';


export default Express.Router()

    .get('/getPrice', controller.getPrice)
    .patch('/verifyOTP', controller.verifyOTP)
    .patch('/resendOTP', controller.resendOTP)
    .patch('/forgotPassword', controller.forgotPassword)
    .post('/userLogin', controller.userLogin)
    .get('/viewPlan', controller.viewPlan)
    .post('/socialLogin', controller.socialLogin)
    .post('/subscribe', controller.subscribed)
    .post('/unsubscribe', controller.unSubscribed)
    .post('/contact-us', controller.contactUs)

    .use(upload.uploadFile)
    .post('/userSignup', controller.userSignup)
    
    .use(auth.verifyToken)
    .patch('/resetPassword', controller.resetPassword)
    .get('/getProfile', controller.getProfile)
    .put('/editUserProfile', controller.editUserProfile)
    .put('/changePassword', controller.changePassword)
    .get('/myPlan', controller.myPlan)
    .get('/updateTermsAndConditions', controller.updateTermsAndConditions)
    .put('/editUserProfileByAdmin', controller.editUserProfileByAdmin)
    .put('/updateWallet', controller.updateWallet)
    .get('/getPlanList', controller.getPlanList)
    .get('/isValid', controller.isValid)
    .post('/buySubscription', controller.buySubscription)


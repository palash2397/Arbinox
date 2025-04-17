import Joi from "joi";
import Mongoose from "mongoose";
import _ from "lodash";
import config from "config";
import apiError from '../../../../helper/apiError';
import response from '../../../../../assets/response';
import bcrypt from 'bcryptjs';
import responseMessage from '../../../../../assets/responseMessage';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode'
import commonFunction from '../../../../helper/util';
import jwt from 'jsonwebtoken';
import status from '../../../../enums/status';
import userType from "../../../../enums/userType";
import { userServices } from '../../services/user';
import { capitalAmountServices } from '../../services/capitalAmount'
const { findCapitalAmount, updateCapitalAmount } = capitalAmountServices
const { findUser, updateUser, updateUserById, findUserWithOtp, editEmailMobileExist, aggregateSearchList, findAllUserWithSelectedField } = userServices
import { subscriptionPlanServices } from '../../services/subscriptionPlan'
const { subscriptionPlanList, findSubscriptionPlan, createSubscriptionPlan, updateSubscriptionPlan, paginateSearchSubscription, paginateSearchSubscriptionv1 } = subscriptionPlanServices
import { buySubsciptionPlanHistoryServices, } from '../../services/buySubscriptionPlanHistory'
const { buySubsciptionPlanData, buySubscriptionPlanList, buySubscriptionPlanListWithAggregate, buySubscriptionhPlanList, buySubsciptionPlanUpdate, updateManySubscription, lastedBuyPlan, buySubsciptionPlanCreate } = buySubsciptionPlanHistoryServices
import { ipAddressCheckServices } from "../../services/ipAddressCheck"
const { findIpAddressCheck, updateIpAddressCheck } = ipAddressCheckServices
import { ipAddressServices } from "../../services/ipAddress"
const { findIpAddress } = ipAddressServices
import paymentType from "../../../../enums/paymentType";
import subscriptionPlanType from "../../../../enums/subscriptionPlanType";
import { subscribeServices } from "../../services/newsLetter";
const { getAllSubscribe } = subscribeServices;
import { discountServices } from "../../services/discountPricing";
const { findDiscountPricing, updateDiscountPricing } = discountServices;
import { addressServices } from "../../services/discountAddreses";
const { addAddress, findAddress, updateAddress, getAllAddress } = addressServices;
import {
    contactUsServices
} from "../../services/contactUs";
const {
    createContactUs,
    getAllContactUs,
    viewContactUs,
    findContactUs,
    updateContactUs,
} =
    contactUsServices;
export class adminController {

    /**
     * @swagger
     * /admin/login:
     *   post:
     *     tags:
     *       - ADMIN
     *     description: Admin login with email and Password
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: login
     *         description: login  
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/login'
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async login(req, res, next) {
        var validationSchema = {
            email: Joi.string().required(),
            password: Joi.string().required(),
            ip: Joi.string().optional(),
            termsAndConditions: Joi.string().optional(),
        }
        try {
            if (req.body.email) {
                req.body.email = (req.body.email).toLowerCase();
            }
            var results
            var validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email,
                password
            } = validatedBody;
            let query = {
                $and: [{
                    userType: {
                        $in: [userType.ADMIN, userType.SUBADMIN]
                    },
                    status: {
                        $ne: status.DELETE
                    }
                }, {
                    $or: [{
                        email: email
                    }, {
                        mobileNumber: email
                    }]
                }]
            }
            var userResult = await findUser(query);
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND)
            }
            if (!bcrypt.compareSync(password, userResult.password)) {
                throw apiError.conflict(responseMessage.INCORRECT_LOGIN)
            } else {
                if (userResult.userType == userType.SUBADMIN) {
                    let ipAddressCheckRes = await findIpAddressCheck({
                        isTrue: true,
                        status: {
                            $ne: status.DELETE
                        }
                    });
                    if (ipAddressCheckRes) {
                        if (!validatedBody.ip) {
                            throw apiError.badRequest(responseMessage.ENTER_IP_ADDRESS)
                        }
                        let checkIpCorrect = await findIpAddress({
                            ip: validatedBody.ip,
                            status: status.ACTIVE
                        })
                        if (!checkIpCorrect) {
                            throw apiError.badRequest(responseMessage.NOT_ALLOW)
                        }
                    }
                }
                var otp = commonFunction.getOTP();
                var otpExpireTime = new Date().getTime() + 180000;
                await commonFunction.signloignOtp(email, userResult.firstName, otp);
                if (!validatedBody.termsAndConditions || !userResult.termsAndConditions) {
                    validatedBody.termsAndConditions = userResult.termsAndConditions || "DECLINE"
                }
                results = await updateUser({
                    _id: userResult._id
                }, {
                    otp: otp,
                    otpExpireTime: otpExpireTime,
                    termsAndConditions: validatedBody.termsAndConditions,
                });
                results = JSON.parse(JSON.stringify(results));
                const keysToRemove = ['connectedExchange', '_id', 'permissions', 'password', 'otp', 'autoTrade', 'autoTradePlaceCount', 'sniperBot', 'notifications', 'rebalancingTrade'];
                keysToRemove.forEach(key => delete results[key]);
            }
            return res.json(new response(results, responseMessage.LOGIN));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/getProfile:
     *   get:
     *     tags:
     *       - ADMIN
     *     description: Admin login with email and Password
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async getProfile(req, res, next) {
        try {
            let adminResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE } });
            if (!adminResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            adminResult = JSON.parse(JSON.stringify(adminResult));
            return res.json(new response(adminResult, responseMessage.USER_DETAILS));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/resendOTP:
     *   put:
     *     tags:
     *       - ADMIN
     *     description: after OTP expire or not get any OTP with that frameOfTime ADMIN resendOTP for new OTP
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: resendOTP
     *         description: resendOTP
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/resendOTP'
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async resendOTP(req, res, next) {
        var validationSchema = {
            email: Joi.string().required(),
        };
        try {
            if (req.body.email) {
                req.body.email = (req.body.email).toLowerCase();
            }
            var validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email
            } = validatedBody;
            var userResult = await findUser({
                // isSocial: false,
                $and: [{
                    $or: [{
                        email: email
                    }, {
                        mobileNumber: email
                    }]
                }, {
                    status: {
                        $ne: status.DELETE
                    }
                }]
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            var otp = commonFunction.getOTP();
            var otpExpireTime = new Date().getTime() + 180000;
            await commonFunction.signResendOtp(email, userResult.firstName, otp);
            var updateResult = await updateUser({
                _id: userResult._id
            }, {
                otp: otp,
                otpExpireTime: otpExpireTime
            });
            updateResult = JSON.parse(JSON.stringify(updateResult));
            const keysToRemove = ['connectedExchange', '_id', 'permissions', 'password', 'otp', 'autoTrade', 'autoTradePlaceCount', 'sniperBot', 'notifications', 'rebalancingTrade'];
            keysToRemove.forEach(key => delete updateResult[key]);
            return res.json(new response(updateResult, responseMessage.OTP_SEND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/forgotPassword:
     *   put:
     *     tags:
     *       - ADMIN
     *     description: after OTP expire or not get any OTP with that frameOfTime ADMIN forgotPassword for new OTP
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: forgotPassword
     *         description: forgotPassword
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/forgotPassword'
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async forgotPassword(req, res, next) {
        var validationSchema = {
            email: Joi.string().required(),
        };
        try {
            if (req.body.email) {
                req.body.email = (req.body.email).toLowerCase();
            }
            var validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email
            } = validatedBody;
            var userResult = await findUser({
                // isSocial: false,
                $and: [{
                    $or: [{
                        email: email
                    }, {
                        mobileNumber: email
                    }]
                }, {
                    status: {
                        $ne: status.DELETE
                    }
                }]
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            var otp = commonFunction.getOTP();
            var otpExpireTime = new Date().getTime() + 180000;
            await commonFunction.signForgotOtp(email, userResult.firstName, otp);
            var updateResult = await updateUser({
                _id: userResult._id
            }, {
                otp: otp,
                otpExpireTime: otpExpireTime
            });
            updateResult = JSON.parse(JSON.stringify(updateResult));
            const keysToRemove = ['connectedExchange', '_id', 'permissions', 'password', 'otp', 'autoTrade', 'autoTradePlaceCount', 'sniperBot', 'notifications', 'rebalancingTrade'];
            keysToRemove.forEach(key => delete updateResult[key]);
            return res.json(new response(updateResult, responseMessage.OTP_SEND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/verifyOTP:
     *   post:
     *     tags:
     *       - ADMIN
     *     description: verifyOTP by DMIN on plateform when he want to reset Password
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: verifyOTP
     *         description: verifyOTP
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/verifyOTP'
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async verifyOTP(req, res, next) {
        var validationSchema = {
            email: Joi.string().required(),
            otp: Joi.number().required()
        };
        try {
            if (req.body.email) {
                req.body.email = (req.body.email).toLowerCase();
            }
            var validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email,
                otp
            } = validatedBody;
            var userResult = await findUserWithOtp({
                // isSocial: false,
                $and: [{
                    $or: [{
                        email: email
                    }, {
                        mobileNumber: email
                    }]
                }, {
                    status: {
                        $ne: status.DELETE
                    }
                }]
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (new Date().getTime() > userResult.otpExpireTime) {
                throw apiError.badRequest(responseMessage.OTP_EXPIRED);
            }
            if (userResult.otp != otp) {
                throw apiError.badRequest(responseMessage.INCORRECT_OTP);
            }
            var updateResult = await updateUser({
                _id: userResult._id
            }, {
                otpVerification: true
            })
            if (userResult.status == status.PENDING) {
                await updateUser({
                    _id: userResult._id
                }, {
                    status: status.ACTIVE
                })
            }
            var token = await commonFunction.getToken({
                _id: updateResult._id,
                email: updateResult.email,
                mobileNumber: updateResult.mobileNumber,
                userType: updateResult.userType
            });
            var obj = {
                _id: userResult._id,
                email: userResult.email,
                googleAuthenction: userResult.speakeasy,
                status: userResult.status,
                userType: userResult.userType
            }
            if (userResult.speakeasy == false) {
                obj.token = token
            } else {
                obj.token = ''
            }
            return res.json(new response(obj, responseMessage.OTP_VERIFY));
        } catch (error) {
            return next(error);
        }
    }
    /**
 * @swagger
 * /admin/contact-us/reply/{id}:
 *   put:
 *     tags:
 *       - USER MANAGEMENT
 *     description: replyContactUs
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: token
 *         description: token
 *         in: header
 *         required: true
 *       - name: id
 *         description: id
 *         in: path
 *         required: true
 *       - name: message
 *         description: message
 *         in: query
 *         required: false
 *     responses:
 *       200:
 *         description: Returns success message
 */
    async replyContactUs(req, res, next) {
        const validationSchema = {
            id: Joi.string().required(),
            message: Joi.string().optional(),
        };
        try {
            console.log("fdsfjdslfkds", req.params, req.query)
            let { id } = req.params
            const validatedBody = await Joi.validate({ id, ...req.query }, validationSchema);
            let adminResult = await findUser({
                _id: req.userId,
                userType: {
                    $ne: userType.USER
                },
                status: {
                    $ne: status.DELETE,
                },
            });
            if (!adminResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let contactResult = await findContactUs({
                _id: validatedBody.id,
                reply: false,
            });

            if (!contactResult) {
                throw apiError.unauthorized(responseMessage.CONTACT_NOT_FOUND);
            }

            let contactRes = await updateContactUs({
                _id: contactResult._id
            }, {
                reply: true,
                replyMsg: validatedBody.message,
                status: status.RESOLVED
            });

            let sendMail = await commonFunction.sendMailReplyFromAdmin(contactRes.email, contactRes.name, validatedBody.message, contactResult.message)

            return res.json(new response(contactRes, responseMessage.REPLY_SUCCESS));

        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/contact-us:
     *   get:
     *     tags:
     *       - CONTACT US
     *     description: getContactUs
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: page
     *         description: page
     *         in: query
     *         required: false
     *       - name: search
     *         description: search
     *         in: query
     *         required: false
     *       - name: fromDate
     *         description: fromDate
     *         in: query
     *         required: false
     *       - name: toDate
     *         description: toDate
     *         in: query
     *         required: false
     *       - name: page
     *         description: page
     *         in: query
     *         required: false
     *       - name: status
     *         description: status
     *         in: query
     *         required: false
     *       - name: reply
     *         description: reply(true/false)boolean
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Data found successfully.
     */

    async getContactUs(req, res, next) {
        const validationSchema = {
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
            search: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            status: Joi.string().optional(),
            reply: Joi.string().optional(),
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                userType: userType.ADMIN,
                status: {
                    $ne: status.DELETE,
                },
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let adminRes = await getAllContactUs(validatedBody)

            if (adminRes.docs.length == 0) {
                return res.json(new response(responseMessage.CONTACT_NOT_FOUND));
            }
            return res.json(new response(adminRes, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }




    /**
     * @swagger
     * /admin/resetPassword:
     *   post:
     *     tags:
     *       - ADMIN
     *     description: Change password or reset password When ADMIN need to chnage
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: password
     *         description: password
     *         in: formData
     *         required: true
     *       - name: confirmPassword
     *         description: confirmPassword
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Your password has been successfully changed.
     *       404:
     *         description: This user does not exist.
     *       422:
     *         description: Password not matched.
     *       500:
     *         description: Internal Server Error
     *       501:
     *         description: Something went wrong!
     */
    async resetPassword(req, res, next) {
        const validationSchema = {
            password: Joi.string().required(),
            confirmPassword: Joi.string().required()
        };
        try {
            const {
                password,
                confirmPassword
            } = await Joi.validate(req.body, validationSchema);
            var userResult = await findUser({
                _id: req.userId,
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            } else {
                if (password == confirmPassword) {
                    let update = await updateUser({
                        _id: userResult._id
                    }, {
                        password: bcrypt.hashSync(password)
                    });
                    return res.json(new response(update, responseMessage.PWD_CHANGED));
                } else {
                    throw apiError.notFound(responseMessage.PWD_NOT_MATCH);
                }
            }
        } catch (error) {
            console.log(error);
            return next(error);
        }
    }



    /**
     * @swagger
     * /admin/changePassword:
     *   patch:
     *     tags:
     *       - ADMIN
     *     description: changePassword By ADMIN when ADMIN want to change his password on Plateform
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: oldPassword
     *         description: oldPassword
     *         in: formData
     *         required: true
     *       - name: newPassword
     *         description: newPassword
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async changePassword(req, res, next) {
        const validationSchema = {
            oldPassword: Joi.string().required(),
            newPassword: Joi.string().required()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (!bcrypt.compareSync(validatedBody.oldPassword, userResult.password)) {
                throw apiError.badRequest(responseMessage.PWD_NOT_MATCH);
            }
            let updated = await updateUserById(userResult._id, {
                password: bcrypt.hashSync(validatedBody.newPassword)
            });
            return res.json(new response(updated, responseMessage.PWD_CHANGED));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/editProfile:
     *   put:
     *     tags:
     *       - ADMIN
     *     description: editProfile
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: firstName
     *         description: First name
     *         in: formData
     *         required: false
     *       - name: lastName
     *         description: Last name
     *         in: formData
     *         required: false
     *       - name: email
     *         description: email
     *         in: formData
     *         required: false
     *       - name: countryCode
     *         description: countryCode
     *         in: formData
     *         required: false
     *       - name: mobileNumber
     *         description: mobileNumber
     *         in: formData
     *         required: false
     *       - name: dateOfBirth
     *         description: dateOfBirth
     *         in: formData
     *         required: false
     *       - name: gender
     *         description: gender
     *         in: formData
     *         required: false
     *         enum: [MALE,FEMALE]
     *       - name: address
     *         description: address
     *         in: formData
     *         required: false
     *       - name: city
     *         description: city
     *         in: formData
     *         required: false
     *       - name: state
     *         description: state
     *         in: formData
     *         required: false
     *       - name: country
     *         description: country
     *         in: formData
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async editProfile(req, res, next) {
        const validationSchema = {
            email: Joi.string().optional(),
            firstName: Joi.string().optional(),
            lastName: Joi.string().optional(),
            countryCode: Joi.string().optional(),
            mobileNumber: Joi.string().optional(),
            dateOfBirth: Joi.string().optional(),
            gender: Joi.string().optional(),
            address: Joi.string().optional(),
            city: Joi.string().optional(),
            state: Joi.string().optional(),
            country: Joi.string().optional(),
            userGroup: Joi.string().optional(),
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let find = await editEmailMobileExist(validatedBody.email, validatedBody.mobileNumber, userResult._id)
            if (find) {
                if (find.email == validatedBody.email) {
                    throw apiError.alreadyExist(responseMessage.EMAIL_EXIST);
                }
                if (find.mobileNumber == validatedBody.mobileNumber) {
                    throw apiError.alreadyExist(responseMessage.MOBILE_EXIST);
                }
            }
            let updateResult = await updateUser({
                _id: userResult._id
            }, {
                $set: validatedBody
            });
            return res.json(new response(updateResult, responseMessage.PROFILE_UPDATED));
        } catch (error) {
            console.log(error);
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/subscriptionPlanList:
     *   get:
     *     tags:
     *       - SUBSCRIPTION_PLAN
     *     description: Subscription plan list
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: search
     *         description: search
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async subscriptionPlanList(req, res, next) {
        var validationSchema = {
            search: Joi.string().optional(),
        }
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let query = { status: status.ACTIVE }
            if (validatedBody.search) {
                query.$or = [
                    { title: { $regex: validatedBody.search, $options: 'i' } },
                ]
            }
            let result = await subscriptionPlanList(query)
            if (result.length == 0) {
                throw apiError.notFound(responseMessage.SUBSCRIPTION_PLAN_NOT);
            }
            return res.json(new response(result, responseMessage.SUBSCRIPTION_PLAN));
        } catch (error) {
            return next(error);
        }
    }


    /**
     * @swagger
     * /admin/blockUnblockInvitedUser:
     *   put:
     *     tags:
     *       - ADMIN
     *     description: blockUnblockInvitedUser When ADMIN want to block or unblock invited user on Plateform
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: inviteUserId
     *         description: inviteUserId
     *         in: formData
     *         required: true
     *       - name: reason
     *         description: reason
     *         in: formData
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async blockUnblockInvitedUser(req, res, next) {
        const validationSchema = {
            inviteUserId: Joi.string().required(),
            reason: Joi.string().optional()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                },
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                }
            });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            var userInfo = await findUser({
                _id: validatedBody.inviteUserId,
                userType: {
                    $ne: userType.ADMIN
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userInfo) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (userInfo.status == status.ACTIVE) {
                let blockRes = await updateUser({
                    _id: userInfo._id
                }, {
                    status: status.BLOCK
                });
                await commonFunction.sendUserblockEmail(userInfo, userResult, validatedBody.reason)
                return res.json(new response(blockRes, responseMessage.USER_BLOCKED));
            } else {
                let activeRes = await updateUser({
                    _id: userInfo._id
                }, {
                    status: status.ACTIVE
                });
                await commonFunction.sendUserActiveEmail(userInfo, userResult)
                return res.json(new response(activeRes, responseMessage.USER_UNBLOCKED));
            }
        } catch (error) {
            return next(error);
        }
    }


    /**
     * @swagger
     * /admin/blockUnblockSubscriptionPlan:
     *   put:
     *     tags:
     *       - SUBSCRIPTION_PLAN
     *     description: blockUnblockSubscriptionPlan
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: subscriptionId
     *         description: subscriptionId
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async blockUnblockSubscriptionPlan(req, res, next) {
        const validationSchema = {
            subscriptionId: Joi.string().required()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                },
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                }
            });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            var planInfo = await findSubscriptionPlan({
                _id: validatedBody.subscriptionId,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!planInfo) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            if (planInfo.status == status.ACTIVE) {
                let blockRes = await updateSubscriptionPlan({
                    _id: planInfo._id
                }, {
                    status: status.BLOCK
                });
                return res.json(new response(blockRes, responseMessage.PLAN_BLOCKED));
            } else {
                let activeRes = await updateSubscriptionPlan({
                    _id: planInfo._id
                }, {
                    status: status.ACTIVE
                });
                return res.json(new response(activeRes, responseMessage.PLAN_ACTIVATED));
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/viewSubscription:
     *   get:
     *     tags:
     *       - SUBSCRIPTION_PLAN
     *     description: viewSubscription
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: subscriptionId
     *         description: subscriptionId  
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */

    async viewSubscription(req, res, next) {
        const validationSchema = {
            subscriptionId: Joi.string().required(),
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let planRes = await findSubscriptionPlan({
                _id: validatedBody.subscriptionId,
                status: {
                    $ne: status.DELETE
                }
            })
            if (!planRes) {
                throw apiError.conflict(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(planRes, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/subscriptionPlanListWithFilter:
     *   get:
     *     tags:
     *       - SUBSCRIPTION_PLAN
     *     description: Subscription plan list
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: search
     *         description: search as planName(type)  
     *         in: query
     *         required: false
     *       - name: subscriptionType
     *         description: subscriptionType ("PAID","CUSTOM","FREE")  
     *         in: query
     *         required: false
     *       - name: fromDate
     *         description: fromDate
     *         in: query
     *         required: false
     *       - name: toDate
     *         description: toDate 
     *         in: query
     *         required: false
     *       - name: page
     *         description: page 
     *         in: query
     *         required: false
     *       - name: limit
     *         description: limit
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async subscriptionPlanListWithFilter(req, res, next) {
        const validationSchema = {
            search: Joi.string().optional(),
            subscriptionType: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
        };
        try {
            let validateBody = await Joi.validate(req.query, validationSchema)
            let result = await paginateSearchSubscription(validateBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.SUBSCRIPTION_PLAN_NOT);
            }
            return res.json(new response(result, responseMessage.SUBSCRIPTION_PLAN));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/updateCapitalAmount:
     *   post:
     *     tags:
     *       - ADMIN
     *     description: Update capital amoutn for get profit path this amount
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: type
     *         description: type 
     *         in: formData
     *         required: true
     *       - name: amount
     *         description: amount
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async updateCapitalAmount(req, res, next) {
        var validationSchema = {
            type: Joi.string().required(),
            amount: Joi.string().required(),
        }
        try {
            if (req.body.email) {
                req.body.email = (req.body.email).toLowerCase();
            }
            var results
            var validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                type,
                amount
            } = validatedBody;
            let userResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                },
                userType: {
                    $in: [userType.USER, userType.ADMIN, userType.SUBADMIN]
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let capitalAmountRes = await findCapitalAmount()
            if (!capitalAmountRes) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            if (type == 'TRIANGULAR') {
                results = await updateCapitalAmount({
                    _id: capitalAmountRes._id
                }, {
                    $set: {
                        triangular: amount
                    }
                });
            } else if (type == 'LOOP') {
                results = await updateCapitalAmount({
                    _id: capitalAmountRes._id
                }, {
                    $set: {
                        loop: amount
                    }
                });
            } else if (type == 'DIRECT') {
                results = await updateCapitalAmount({
                    _id: capitalAmountRes._id
                }, {
                    $set: {
                        direct: amount
                    }
                });
            } else if (type == 'INTRA') {
                results = await updateCapitalAmount({
                    _id: capitalAmountRes._id
                }, {
                    $set: {
                        intra: amount
                    }
                });
            } else if (type == 'INTRASINGLEEXCHANGE') {
                results = await updateCapitalAmount({
                    _id: capitalAmountRes._id
                }, {
                    $set: {
                        intraSingleExchange: amount
                    }
                });
            } else {
                throw apiError.badRequest(responseMessage.WRONG_arbitrage_TYPE);
            }
            return res.json(new response(results, responseMessage.UPDATE_SUCCESS));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/getCapitalAmount:
     *   get:
     *     tags:
     *       - ADMIN
     *     description: get capital amount.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async getCapitalAmount(req, res, next) {
        try {
            let userResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                },
                userType: {
                    $in: [userType.USER, userType.ADMIN, userType.SUBADMIN]
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let capitalAmountRes = await findCapitalAmount()
            if (!capitalAmountRes) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(capitalAmountRes, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/deleteSubscriptionPlan:
     *   delete:
     *     tags:
     *       - SUBSCRIPTION_PLAN
     *     description: deleteSubscriptionPlan
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: subscriptionId
     *         description: subscriptionId
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async deleteSubscriptionPlan(req, res, next) {
        const validationSchema = {
            subscriptionId: Joi.string().required()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                },
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                }
            });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            var planInfo = await findSubscriptionPlan({
                _id: validatedBody.subscriptionId,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!planInfo) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            let updateRes = await updateSubscriptionPlan({
                _id: planInfo._id
            }, {
                status: status.DELETE
            });
            return res.json(new response(updateRes, responseMessage.PLAN_DELETED));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/getUserList:
     *   get:
     *     tags:
     *       - ADMIN
     *     description: get user list.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: type
     *         description: type 
     *         enum: ["REGISTER","SUBSRCIPTION","SUBSRCIPTION_PREVIOUS"]
     *         in: query
     *         required: false
     *       - name: fromDate
     *         description: fromDate
     *         in: query
     *         required: false
     *       - name: toDate
     *         description: toDate
     *         in: query
     *         required: false
     *       - name: planStatus
     *         description: planStatus
     *         in: query
     *         required: false
     *       - name: search
     *         description: search
     *         in: query
     *         required: false
     *       - name: page
     *         description: page
     *         in: query
     *         required: false
     *       - name: limit
     *         description: limit
     *         in: query
     *         required: false
     *       - name: status1
     *         description: status1
     *         in: query
     *         required: false
     *       - name: sort
     *         description: sort (ASC,DESC)
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async getUserList(req, res, next) {
        var validationSchema = {
            type: Joi.string().optional(),
            search: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
            planStatus: Joi.string().optional(),
            status1: Joi.string().optional(),
            sort: Joi.string().optional(),
        }
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let result = await aggregateSearchList(validatedBody);
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }


    /**
     * @swagger
     * /admin/viewSubscriptionHistory:
     *   get:
     *     tags:
     *       - ADMIN
     *     description: View Subscription History
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: PlanId
     *         description: PlanId
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async viewSubscriptionHistory(req, res, next) {
        try {
            let PlanData = await buySubsciptionPlanData({
                _id: req.query.PlanId,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!PlanData) {
                throw apiError.notFound(responseMessage.SUB_PLAN_HISTORY_NOT_FOUND);
            }
            return res.json(new response(PlanData, responseMessage.SUB_PLAN_HISTORY_FOUND));
        } catch (error) {
            return next(error);
        }
    }


    /**
     * @swagger
     * /admin/enableDisableGoogleAuthenction:
     *   get:
     *     tags:
     *       - AUTHENCATION
     *     description: enableDisableGoogleAuthenction
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
     *     responses:
     *       200:
     *         description: Login successfully.
     *       402:
     *         description: Incorrect login credential provided.
     *       404:
     *         description: User not found.
     */
    async enableDisableGoogleAuthenction(req, res, next) {
        try {
            let userResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            // if (userResult.speakeasy == false) {
            var secret = speakeasy.generateSecret({
                length: 20,
                name: "MECAP:- " + userResult.email,
            });
            let data_url = await qrcode.toDataURL(secret.otpauth_url);
            await updateUser({
                _id: userResult._id
            }, {
                base32: secret.base32,
                speakeasyQRcode: data_url
            })
            let obj = {
                email: userResult.email,
                url: data_url,
                secret: secret.base32
            }
            return res.json(new response(obj, responseMessage.TWO_FA_GENERATED));
            // }
            // await updateUser({ _id: userResult._id }, { speakeasy: false, base32: '', speakeasyQRcode: '' })
            // let obj = {
            //     email: userResult.email,
            //     url: '',
            // }
            // return res.json(new response(obj, responseMessage.GOOGEL_AUTH));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/verifyGoogleAuthenctionCodeForEnableDisable:
     *   get:
     *     tags:
     *       - AUTHENCATION
     *     description: verifyGoogleAuthenctionCodeForEnableDisable
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: email
     *         description: email
     *         in: query
     *         required: true
     *       - name: code
     *         description: code
     *         in: query
     *         required: true
     *       - name: type
     *         description: type (enable/disable)
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async verifyGoogleAuthenctionCodeForEnableDisable(req, res, next) {
        var validationSchema = {
            email: Joi.string().required(),
            code: Joi.string().required(),
            type: Joi.string().required()
        }
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let userResult = await findUser({
                email: validatedBody.email,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            var verified = speakeasy.totp.verify({
                secret: userResult.base32,
                encoding: 'base32',
                token: validatedBody.code
            });
            if (!verified) {
                throw apiError.badRequest(responseMessage.INCORRECT_OTP);
            }
            if (validatedBody.type == "enable") {
                let updateRes = await updateUser({
                    _id: userResult._id
                }, {
                    speakeasy: true
                })
                return res.json(new response(updateRes, responseMessage.GOOGEL_AUTH_enable));
            } else {
                let updateRes = await updateUser({
                    _id: userResult._id
                }, {
                    speakeasy: false,
                    base32: '',
                    speakeasyQRcode: ''
                })
                return res.json(new response(updateRes, responseMessage.GOOGEL_AUTH));
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/verifyGoogleAuthenctionCode:
     *   get:
     *     tags:
     *       - AUTHENCATION
     *     description: verifyGoogleAuthenctionCode
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: email
     *         description: email
     *         in: query
     *         required: true
     *       - name: code
     *         description: code
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async verifyGoogleAuthenctionCode(req, res, next) {
        var validationSchema = {
            email: Joi.string().required(),
            code: Joi.string().required()
        }
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let userResult = await findUser({
                email: validatedBody.email,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            var verified = speakeasy.totp.verify({
                secret: userResult.base32,
                encoding: 'base32',
                token: validatedBody.code
            });
            if (!verified) {
                throw apiError.badRequest(responseMessage.INCORRECT_OTP);
            }
            var token = await commonFunction.getToken({
                _id: userResult._id,
                email: userResult.email,
                userType: userResult.userType
            });
            var obj = {
                _id: userResult._id,
                email: userResult.email,
                googleAuthenction: userResult.speakeasy,
            }
            if (userResult.speakeasy == true) {
                obj.token = token
            } else {
                obj.token = ''
            }

            return res.json(new response(obj, responseMessage.OTP_VERIFY));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/listForUserBuySubcription:
     *   get:
     *     tags:
     *       - SUBSCRIPTION
     *     description: listForUserBuySubcription
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: Admin token
     *         in: header
     *         required: true
     *       - name: userId
     *         description: userId
     *         in: query
     *         required: false
     *       - name: fromDate
     *         description: fromDate
     *         in: query
     *         required: false
     *       - name: toDate
     *         description: toDate
     *         in: query
     *         required: false
     *       - name: page
     *         description: page
     *         in: query
     *         required: false
     *       - name: limit
     *         description: limit
     *         in: query
     *         required: false
     *       - name: planStatus
     *         description: planStatus
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Login successfully.
     *       402:
     *         description: Incorrect login credential provided.
     *       404:
     *         description: User not found.
     */
    async listForUserBuySubcription(req, res, next) {
        const validationSchema = {
            userId: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
            planStatus: Joi.string().optional()
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let result = await buySubscriptionPlanListWithAggregate(validatedBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/enableDisableSubscriptionPlan:
     *   put:
     *     tags:
     *       - SUBSCRIPTION_PLAN
     *     description: enableDisableSubscriptionPlan
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: subscriptionId
     *         description: subscriptionId
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async enableDisableSubscriptionPlan(req, res, next) {
        const validationSchema = {
            subscriptionId: Joi.string().required()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                },
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                }
            });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            var planInfo = await findSubscriptionPlan({
                _id: validatedBody.subscriptionId,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!planInfo) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            if (planInfo.planStatus == "ACTIVE") {
                let blockRes = await updateSubscriptionPlan({
                    _id: planInfo._id
                }, {
                    planStatus: "INACTIVE"
                });
                return res.json(new response(blockRes, responseMessage.PLAN_BLOCKED));
            } else {
                let activeRes = await updateSubscriptionPlan({
                    _id: planInfo._id
                }, {
                    planStatus: "ACTIVE"
                });
                return res.json(new response(activeRes, responseMessage.PLAN_ACTIVATED));
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/allListForUserBuySubcription:
     *   get:
     *     tags:
     *       - SUBSCRIPTION
     *     description: allListForUserBuySubcription
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: Admin token
     *         in: header
     *         required: true
     *       - name: search
     *         description: search
     *         in: query
     *         required: false
     *       - name: fromDate
     *         description: fromDate
     *         in: query
     *         required: false
     *       - name: toDate
     *         description: toDate
     *         in: query
     *         required: false
     *       - name: page
     *         description: page
     *         in: query
     *         required: false
     *       - name: limit
     *         description: limit
     *         in: query
     *         required: false
     *       - name: planStatus
     *         description: planStatus
     *         in: query
     *         required: false
     *       - name: paymentStatus
     *         description: paymentStatus
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Login successfully.
     *       402:
     *         description: Incorrect login credential provided.
     *       404:
     *         description: User not found.
     */
    async allListForUserBuySubcription(req, res, next) {
        const validationSchema = {
            search: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
            planStatus: Joi.string().optional(),
            paymentStatus: Joi.string().optional(),
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let result = await buySubscriptionPlanListWithAggregate(validatedBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }


    /**
     * @swagger
     * /admin/addSubscription:
     *   post:
     *     tags:
     *       - SUBSCRIPTION
     *     description: addSubscription
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
     *       - name: title
     *         description: Plan title
     *         in: formData
     *         required: true
     *       - name: description
     *         description: Plan description
     *         in: formData
     *         required: true
     *       - name: arbitrageName
     *         description: Plan arbitrageName
     *         in: formData
     *         required: true
     *       - name: coins
     *         description: Plan coins
     *         in: formData
     *         required: true
     *       - name: price
     *         description: Plan price
     *         in: formData
     *         required: true
     *       - name: tenure
     *         description: tenure
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async addSubscription(req, res, next) {
        const validationSchema = {
            title: Joi.string().required(),
            description: Joi.string().required(),
            arbitrageName: Joi.array().required(),
            coins: Joi.array().required(),
            price: Joi.number().required(),
            tenure: Joi.number().required(),
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let adminResult = await findUser({
                _id: req.userId,
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let data = await findSubscriptionPlan({ title: validatedBody.title })
            if (data) {
                throw apiError.conflict(responseMessage.PLAN_EXIST);
            }
            let discountAmount = await findDiscountPricing()

            if (Number(discountAmount.amount) >= Number(validatedBody.price)) {
                throw apiError.conflict(`Please add price more than discount amount ${discountAmount.amount}`);
            }
            let result = await createSubscriptionPlan(validatedBody)
            return res.json(new response(result, responseMessage.PLAN_ADDED));
        } catch (error) {
            console.log("error=======>849", error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/editSubscription:
     *   put:
     *     tags:
     *       - SUBSCRIPTION
     *     description: editSubscription
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: title
     *         description: Plan title
     *         in: formData
     *         required: false
     *       - name: subscriptionId
     *         description: subscriptionId
     *         in: formData
     *         required: true
     *       - name: description
     *         description: Plan description
     *         in: formData
     *         required: false
     *       - name: arbitrageName
     *         description: Plan arbitrageName
     *         in: formData
     *         required: false
     *       - name: coins
     *         description: Plan coins
     *         in: formData
     *         required: false
     *       - name: price
     *         description: Plan price
     *         in: formData
     *         required: false
     *       - name: tenure
     *         description: Plan tenure
     *         in: formData
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */


    async editSubscription(req, res, next) {
        const validationSchema = {
            subscriptionId: Joi.string().required(),
            title: Joi.string().optional(),
            description: Joi.string().optional(),
            arbitrageName: Joi.array().optional(),
            coins: Joi.array().optional(),
            price: Joi.number().optional(),
            tenure: Joi.number().optional(),
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let adminResult = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] }, status: { $ne: status.DELETE } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let planRes = await findSubscriptionPlan({ _id: validatedBody.subscriptionId, status: { $ne: status.DELETE } })
            if (!planRes) {
                throw apiError.conflict(responseMessage.DATA_NOT_FOUND);
            }
            if (planRes.subscriptionType != subscriptionPlanType.PAID) {
                if (validatedBody.show == true) {
                    throw apiError.badRequest(responseMessage.DONT_SHOW);
                }
            }
            validatedBody.userId = adminResult._id
            if (validatedBody.price) {
                let discountAmount = await findDiscountPricing()
                if (Number(discountAmount.amount) >= Number(validatedBody.price)) {
                    throw apiError.conflict(`Please add price more than discount amount ${discountAmount.amount}`);
                }
            }

            let result = await updateSubscriptionPlan({
                _id: planRes._id
            }, validatedBody)
            await updateManySubscription({ subscriptionPlaneId: planRes._id, planStatus: status.ACTIVE, status: status.ACTIVE }, {
                pairs: result.coins,
                planAmount: result.price,
                planName: result.title,
                exchanges: result.arbitrageName
            })
            return res.json(new response(result, responseMessage.PLAN_UPDATED));
        } catch (error) {
            console.log("error=======>849", error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/subscriptionPlanListWithFilterV1:
     *   get:
     *     tags:
     *       - SUBSCRIPTION
     *     description: Subscription plan list
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: search
     *         description: search as planName(type)  
     *         in: query
     *         required: false
     *       - name: fromDate
     *         description: fromDate
     *         in: query
     *         required: false
     *       - name: toDate
     *         description: toDate 
     *         in: query
     *         required: false
     *       - name: page
     *         description: page 
     *         in: query
     *         required: false
     *       - name: limit
     *         description: limit
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async subscriptionPlanListWithFilterV1(req, res, next) {
        const validationSchema = {
            search: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
            show: Joi.boolean().optional(),
            subscriptionType: Joi.string().optional(),
        };
        try {
            let userResult = await findUser({
                _id: req.userId,
                userType: {
                    $ne: userType.USER
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let validateBody = await Joi.validate(req.query, validationSchema)
            let result = await paginateSearchSubscriptionv1(validateBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.SUBSCRIPTION_PLAN_NOT);
            }
            let checkExist = await lastedBuyPlan({
                userId: userResult._id,
                planStatus: {
                    $ne: "PENDING"
                },
                status: status.ACTIVE
            })
            if (!checkExist) {
                for (let i = 0; i < result.docs.length; i++) {
                    result.docs[i]._doc.payableAmount = Number(result.docs[i].value) + Number(result.docs[i].recursiveValue)
                    result.docs[i]._doc.recursivePayAmount = Number(result.docs[i].recursiveValue)
                    result.docs[i]._doc.enteryFee = Number(result.docs[i].value)
                    result.docs[i]._doc.isBuy = true
                }
            } else {
                let dayBeforeExpire = 10
                let dayAfterExpireGrace = -3
                const date1 = new Date(checkExist.endTime);
                const date2 = new Date();
                const differenceInTime = date2.getTime() - date1.getTime();
                const differenceInDays = differenceInTime / (1000 * 3600 * 24);
                let priviousRes = await findSubscriptionPlan({
                    _id: checkExist.subScriptionPlanId._id
                })
                if (priviousRes.subscriptionType == subscriptionPlanType.PAID) {
                    for (let i = 0; i < result.docs.length; i++) {
                        if (Math.round(differenceInDays) <= dayBeforeExpire) {
                            if (Number(priviousRes.value) >= Number(result.docs[i].value)) {
                                if (Math.round(differenceInDays) <= dayBeforeExpire && Math.round(differenceInDays) >= dayAfterExpireGrace) {
                                    result.docs[i]._doc.payableAmount = Number(result.docs[i].recursiveValue)
                                    result.docs[i]._doc.recursivePayAmount = Number(result.docs[i].recursiveValue)
                                    result.docs[i]._doc.enteryFee = 0
                                    result.docs[i]._doc.isBuy = true
                                } else {
                                    result.docs[i]._doc.isBuy = false
                                }
                            } else {
                                result.docs[i]._doc.payableAmount = (Number(result.docs[i].value) - Number(priviousRes.value)) + Number(result.docs[i].recursiveValue)
                                result.docs[i]._doc.recursivePayAmount = Number(result.docs[i].recursiveValue)
                                result.docs[i]._doc.enteryFee = (Number(result.docs[i].value) - Number(priviousRes.value))
                                result.docs[i]._doc.isBuy = true
                            }
                        } else {
                            result.docs[i]._doc.payableAmount = Number(result.docs[i].value) + Number(result.docs[i].recursiveValue)
                            result.docs[i]._doc.recursivePayAmount = Number(result.docs[i].recursiveValue)
                            result.docs[i]._doc.enteryFee = Number(result.docs[i].value)
                            result.docs[i]._doc.isBuy = true
                        }
                        if ((checkExist.subScriptionPlanId._id).toString() == (result.docs[i]._id).toString()) {
                            result.docs[i]._doc.isSubscribe = true
                        } else {
                            result.docs[i]._doc.isSubscribe = false
                        }
                    }
                } else {
                    for (let i = 0; i < result.docs.length; i++) {
                        result.docs[i]._doc.payableAmount = Number(result.docs[i].value) + Number(result.docs[i].recursiveValue)
                        result.docs[i]._doc.recursivePayAmount = Number(result.docs[i].recursiveValue)
                        result.docs[i]._doc.enteryFee = Number(result.docs[i].value)
                        result.docs[i]._doc.isBuy = true
                    }
                }
            }
            for (let j = 0; j < result.docs.length; j++) {
                let checkPendingRes = await buySubsciptionPlanData({
                    userId: userResult._id,
                    subScriptionPlanId: result.docs[j]._id,
                    planStatus: 'PENDING',
                    payment_status: {
                        $nin: ['finished', 'failed', 'refunded', 'expired']
                    }
                })
                if (checkPendingRes) {
                    result.docs[j]._doc.isPlanPending = true
                    result.docs[j]._doc.isBuy = false
                }
            }
            return res.json(new response(result, responseMessage.SUBSCRIPTION_PLAN));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/disableUserGoogleAuthByAdmin:
     *   get:
     *     tags:
     *       - AUTHENCATION
     *     description: disableUserGoogleAuthByAdmin
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: userId
     *         description: userId
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async disableUserGoogleAuthByAdmin(req, res, next) {
        var validationSchema = {
            userId: Joi.string().required(),
        }
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let adminResult = await findUser({
                _id: req.userId,
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let userResult = await findUser({
                _id: validatedBody.userId,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (userResult.speakeasy == false) {
                throw apiError.badRequest(responseMessage.GOOGEL_AUTH_ALREADY_DISABLE);
            }
            let updateRes = await updateUser({
                _id: userResult._id
            }, {
                speakeasy: false,
                base32: '',
                speakeasyQRcode: ''
            })
            return res.json(new response(updateRes, responseMessage.GOOGEL_AUTH));

        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/getUserProfile:
     *   get:
     *     tags:
     *       - ADMIN
     *     description: get user data
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: userId
     *         description: userId
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async getUserProfile(req, res, next) {
        try {
            let adminResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                },
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                }
            });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let [userResult] = await Promise.all([
                findUser({ _id: req.query.userId, status: { $ne: status.DELETE } })
            ])
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            return res.json(new response(userResult, responseMessage.USER_DETAILS));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/getIpAddressCheck:
     *   get:
     *     tags:
     *       - ADMIN
     *     description: getIpAddressCheck
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async getIpAddressCheck(req, res, next) {
        try {
            let ipAddressCheckRes = await findIpAddressCheck({
                status: {
                    $ne: status.DELETE
                }
            });
            if (!ipAddressCheckRes) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(ipAddressCheckRes, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/updateIpAddressCheck:
     *   get:
     *     tags:
     *       - ADMIN
     *     description: updateIpAddressCheck
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: isTrue
     *         description: isTrue (true/false)
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async updateIpAddressCheck(req, res, next) {
        try {
            let adminResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                },
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                }
            });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let ipAddressCheckRes = await findIpAddressCheck({
                status: {
                    $ne: status.DELETE
                }
            });
            if (!ipAddressCheckRes) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            let updateRes = await updateIpAddressCheck({
                _id: ipAddressCheckRes._id
            }, {
                isTrue: req.query.isTrue
            })
            return res.json(new response(updateRes, responseMessage.UPDATE_SUCCESS));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/getAllUser:
     *   get:
     *     tags:
     *       - ADMIN
     *     description: Subscription plan list
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: search
     *         description: search
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async getAllUser(req, res, next) {
        var validationSchema = {
            search: Joi.string().optional(),
        }
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let query = { status: status.ACTIVE, userType: userType.USER }
            if (validatedBody.search) {
                query.$or = [
                    { email: { $regex: validatedBody.search, $options: 'i' } },
                    { firstName: { $regex: validatedBody.search, $options: 'i' } },
                    { lastName: { $regex: validatedBody.search, $options: 'i' } },
                    { mobileNumber: { $regex: validatedBody.search, $options: 'i' } },
                ]
            }
            let result = await findAllUserWithSelectedField(query)
            if (result.length == 0) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.USER_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/specificSubscriptionPlanList:
     *   get:
     *     tags:
     *       - SUBSCRIPTION_PLAN
     *     description: Subscription plan list
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: search
     *         description: search
     *         in: query
     *         required: false
     *       - name: subType
     *         description: subType (FREE,CUSTOM)
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async specificSubscriptionPlanList(req, res, next) {
        var validationSchema = {
            search: Joi.string().optional(),
            subType: Joi.string().optional(),
        }
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let query = { planStatus: "ACTIVE", status: status.ACTIVE, show: false, subscriptionType: { $ne: subscriptionPlanType.PAID } }
            if (validatedBody.search) {
                query.$or = [
                    { title: { $regex: validatedBody.search, $options: 'i' } },
                ]
            }
            if (validatedBody.subType) {
                query.subscriptionType = validatedBody.subType
            }
            let result = await subscriptionPlanList(query)
            if (result.length == 0) {
                throw apiError.notFound(responseMessage.SUBSCRIPTION_PLAN_NOT);
            }
            return res.json(new response(result, responseMessage.SUBSCRIPTION_PLAN));
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /admin/subscribers:
    *   get:
    *     tags:
    *       - CONTACT US
    *     description: getContactUs
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: token
    *         in: header
    *         required: true
    *       - name: page
    *         description: page
    *         in: query
    *         required: false
    *       - name: limit
    *         description: limit
    *         in: query
    *         required: false
    *     responses:
    *       200:
    *         description: Data found successfully.
    */

    async getSubscribers(req, res, next) {
        const validationSchema = {
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);

            let userResult = await findUser({
                _id: req.userId,
                userType: userType.ADMIN,
                status: {
                    $ne: status.DELETE,
                },
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let adminRes = await getAllSubscribe({ validatedBody })
            return res.json(new response(adminRes, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /admin/updateDiscountPricing:
    *   put:
    *     tags:
    *       - DISCOUNT
    *     description: updateDiscountPricing
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: token
    *         in: header
    *         required: true
    *       - name: amount
    *         description: amount
    *         in: query
    *         required: false
    *     responses:
    *       200:
    *         description: Data found successfully.
    */
    async updateDiscountPricing(req, res, next) {
        const validationSchema = {
            amount: Joi.number().required(),
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);

            let userResult = await findUser({
                _id: req.userId,
                userType: userType.ADMIN,
                status: {
                    $ne: status.DELETE,
                },
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let data = await findDiscountPricing()
            if (!data) {
                throw apiError.notFound("Discount value not found");
            }
            let updatedAmountData = await updateDiscountPricing({ _id: data._id }, validatedBody)
            return res.json(new response(updatedAmountData, "Discount value updated successfully"));
        } catch (error) {
            return next(error);
        }
    }

    /**
* @swagger
* /admin/getDiscountPricing:
*   get:
*     tags:
*       - DISCOUNT
*     description: getDiscountPricing
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Data found successfully.
*/

    async getDiscountPricing(req, res, next) {

        try {
            let data = await findDiscountPricing()
            return res.json(new response(data, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /admin/addDiscountAddress:
    *   post:
    *     tags:
    *       - DISCOUNT
    *     description: addDiscountAddress
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: token
    *         in: header
    *         required: true
    *       - name: address
    *         description: address
    *         in: query
    *         required: false
    *     responses:
    *       200:
    *         description: Data found successfully.
    */
    async addDiscountAddress(req, res, next) {
        const validationSchema = {
            address: Joi.string().required(),
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);

            let userResult = await findUser({
                _id: req.userId,
                userType: userType.ADMIN,
                status: {
                    $ne: status.DELETE,
                },
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let data = await findAddress({ address: validatedBody.address })
            if (data) {
                throw apiError.notFound("Address already added");
            }
            let updatedAddress = await addAddress(validatedBody)
            return res.json(new response(updatedAddress, "Address added successfully"));
        } catch (error) {
            return next(error);
        }
    }

    /**
* @swagger
* /admin/getDiscountAddress:
*   get:
*     tags:
*       - DISCOUNT
*     description: getDiscountAddress
*     produces:
*       - application/json
*     parameters:
*       - name: token
*         description: token
*         in: header
*         required: true
*       - name: search
*         description: search
*         in: query
*         required: false
*       - name: fromDate
*         description: fromDate
*         in: query
*         required: false
*       - name: toDate
*         description: toDate
*         in: query
*         required: false
*       - name: page
*         description: page
*         in: query
*         required: false
*       - name: limit
*         description: limit
*         in: query
*         required: false
*       - name: status
*         description: status
*         in: query
*         required: false
*     responses:
*       200:
*         description: Data found successfully.
*/
    async getDiscountAddress(req, res, next) {
        var validationSchema = {
            search: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
            status: Joi.string().optional()
        }
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);

            let userResult = await findUser({
                _id: req.userId,
                userType: userType.ADMIN,
                status: {
                    $ne: status.DELETE,
                },
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let data = await getAllAddress(validatedBody)
            if (data.docs.length == 0) {
                return res.json(new response(data, responseMessage.DATA_NOT_FOUND));
            }

            return res.json(new response(data, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
* @swagger
* /admin/updateDiscountAddress:
*   put:
*     tags:
*       - DISCOUNT
*     description: updateDiscountAddress
*     produces:
*       - application/json
*     parameters:
*       - name: token
*         description: token
*         in: header
*         required: true
*       - name: _id
*         description: _id
*         in: query
*         required: true
*     responses:
*       200:
*         description: Data found successfully.
*/
    async updateDiscountAddress(req, res, next) {
        const validationSchema = {
            _id: Joi.string().required(),
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);

            let userResult = await findUser({
                _id: req.userId,
                userType: userType.ADMIN,
                status: {
                    $ne: status.DELETE,
                },
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let address = await findAddress({ _id: validatedBody._id })
            if (!address) {
                throw apiError.notFound("Address not found");
            }

            if (address.status == status.ACTIVE) {
                let result = await updateAddress({ _id: validatedBody._id }, { status: status.BLOCK })
                return res.json(new response(result, "Address inactive successfully"));
            }
            let result = await updateAddress({ _id: validatedBody._id }, { status: status.ACTIVE })
            return res.json(new response(result, "Address active successfully"));
        } catch (error) {
            return next(error);
        }
    }

    /**
 * @swagger
 * /admin/resetWallet:
 *   put:
 *     tags:
 *       - ADMIN
 *     description: resetWallet
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: token
 *         description: token
 *         in: header
 *         required: true
 *       - name: _id
 *         description: user id
 *         in: formData
 *         required: true
 *     responses:
 *       200:
 *         description: Returns success message
 */
    async resetWallet(req, res, next) {
        const validationSchema = {
            _id: Joi.string().required()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                userType: {
                    $in: [userType.ADMIN, userType.SUBADMIN]
                },
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let user = await findUser({ _id: validatedBody._id });
            if (!user) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let updateResult = await updateUser({
                _id: user._id
            }, {
                $set: { walletAddress: null }
            });
            return res.json(new response(updateResult, responseMessage.WALLET_RESET));
        } catch (error) {
            console.log(error);
            return next(error);
        }
    }

    /**
     * @swagger
     * /admin/onOffHybrid:
     *   get:
     *     tags:
     *       - ADMIN
     *     description: onOffHybrid
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
     *     responses:
     *       200:
     *         description: Login successfully.
     *       402:
     *         description: Incorrect login credential provided.
     *       404:
     *         description: User not found.
     */
    async onOffHybrid(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (userResult.isHybridOrder == false) {
                let updateRes = await updateUser({ _id: userResult._id }, { isHybridOrder: true })
                return res.json(new response(updateRes, responseMessage.HYBRID_ON_SUCCESSFULLY));
            }
            let updateResult = await updateUser({ _id: userResult._id }, { isHybridOrder: false })
            return res.json(new response(updateResult, responseMessage.HYBRID_OFF_SUCCESSFULLY));
        } catch (error) {
            return next(error);
        }
    }

}
export default new adminController()

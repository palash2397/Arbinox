import Joi from "joi";
import Mongoose from "mongoose";
import _ from "lodash";
import config from "config";
import apiError from '../../../../helper/apiError';
import response from '../../../../../assets/response';
import bcrypt from 'bcryptjs';
import responseMessage from '../../../../../assets/responseMessage';
import commonFunction from '../../../../helper/util';
import jwt from 'jsonwebtoken';
import status from '../../../../enums/status';
import auth from "../../../../helper/auth"
import speakeasy from 'speakeasy';
import userType from "../../../../enums/userType";
import {
    userServices
} from '../../services/user';
import { isValidForBenefit, getTransactionDetailForUsdBuySubscription } from "../../../../helper/blockChainFunction/eth"
const { userCheck, paginateSearch, insertManyUser, createAddress, checkUserExists, emailMobileExist, createUser, findUser, updateUser, updateUserById, checkSocialLogin, multiUpdateUser, findUserWithPopulate, findAllUser } = userServices;
import { buySubsciptionPlanHistoryServices } from "../../services/buySubscriptionPlanHistory";
const { buySubsciptionPlanCount, buySubsciptionPlanCreate, buySubscriptionhPlanList, buySubscriptionPlanList, buySubsciptionPlanData, buySubsciptionPlanUpdate, lastedBuyPlan, updateManySubscription, } = buySubsciptionPlanHistoryServices
import { subscriptionPlanServices } from '../../services/subscriptionPlan'
const { findSubscriptionPlan, subscriptionPlanList, updateSubscriptionPlan, updateManySubscriptionPlan, paginateSearchSubscription, subscriptionListWithActivePlan } = subscriptionPlanServices
import { userWalletServices } from "../../services/userWallet"
const { userWalletDelete, findUserWallet } = userWalletServices
import { ipAddressCheckServices } from "../../services/ipAddressCheck"
const { findIpAddressCheck } = ipAddressCheckServices
import { ipAddressServices } from "../../services/ipAddress"
const { findIpAddress } = ipAddressServices
import axios from "axios"
import { subscribeServices } from "../../services/newsLetter";
const { createSubscribe, findSubscribe, updateSubscribe, } = subscribeServices;

import {
    contactUsServices
} from "../../services/contactUs";
const {
    createContactUs,
    getAllContactUs,
    viewContactUs
} =
    contactUsServices;
import { discountServices } from "../../services/discountPricing";
const { findDiscountPricing, updateDiscountPricing } = discountServices;
import { addressServices } from "../../services/discountAddreses";
const { addAddress, findAddress, updateAddress, getAllAddress } = addressServices;

export class userController {

    /**
     * @swagger
     * /user/userSignup:
     *   post:
     *     tags:
     *       - USER
     *     description: userSignup
     *     produces:
     *       - application/json
     *     parameters:
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
     *         required: true
     *       - name: password
     *         description: password
     *         in: formData
     *         required: true
     *       - name: countryCode
     *         description: countryCode
     *         in: formData
     *         required: false
     *       - name: mobileNumber
     *         description: mobileNumber
     *         in: formData
     *         required: true
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
     *       - name: termsAndConditions
     *         description: termsAndConditions
     *         in: formData
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async userSignup(req, res, next) {
        const validationSchema = {
            firstName: Joi.string().optional(),
            lastName: Joi.string().optional(),
            email: Joi.string().required(),
            password: Joi.string().required(),
            countryCode: Joi.string().optional(),
            mobileNumber: Joi.string().optional(),
            dateOfBirth: Joi.string().optional(),
            gender: Joi.string().optional(),
            address: Joi.string().optional(),
            city: Joi.string().optional(),
            state: Joi.string().optional(),
            country: Joi.string().optional(),
            termsAndConditions: Joi.string().optional(),
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email,
                mobileNumber,
                firstName,
                password,
            } = validatedBody;
            let userInfo = await findUser({
                $and: [{
                    $or: [{
                        email: email
                    }, {
                        mobileNumber: mobileNumber
                    }]
                }, {
                    status: {
                        $ne: status.DELETE
                    }
                }]
            });
            if (userInfo) {
                if (userInfo.isSocial == true) {
                    throw apiError.conflict(responseMessage.SOCIAL_LOGIN);
                }
                if (userInfo.email == email) {
                    throw apiError.conflict(responseMessage.EMAIL_EXIST);
                } else if (userInfo.mobileNumber == mobileNumber) {
                    throw apiError.conflict(responseMessage.MOBILE_EXIST);
                }
            }
            if (!validatedBody.termsAndConditions) {
                validatedBody.termsAndConditions = "DECLINE"
            }
            validatedBody.password = bcrypt.hashSync(validatedBody.password);
            validatedBody.otp = commonFunction.getOTP();
            validatedBody.otpExpireTime = new Date().getTime() + config.get('OTP_TIME_MINUTE') * 60 * 1000;
            let array = ["USER0", "USER1"];
            let randomElement = array[Math.floor(Math.random() * array.length)];
            validatedBody.userGroup = randomElement
            await commonFunction.signResendOtp(email, firstName, validatedBody.otp);

            let result = await createUser(validatedBody);
            result = JSON.parse(JSON.stringify(result));
            delete result.password;
            delete result.otp;
            return res.json(new response(result, responseMessage.USER_CREATED));
        } catch (error) {
            console.log("error=======>138", error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/verifyOTP:
     *   patch:
     *     tags:
     *       - USER
     *     description: verifyOTP
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
        let validationSchema = {
            email: Joi.string().required(),
            otp: Joi.string().required()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email,
                otp
            } = validatedBody;
            let userResult = await findUser({
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
            })
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (Date.now() > userResult.otpExpireTime) {
                throw apiError.badRequest(responseMessage.OTP_EXPIRED);
            }
            if (userResult.otp != otp) {
                throw apiError.badRequest(responseMessage.INCORRECT_OTP);
            }

            let updateResult = await updateUser({
                _id: userResult._id
            }, {
                otpVerified: true
            })
            let token = await commonFunction.getToken({
                _id: updateResult._id,
                email: updateResult.email,
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
     * /user/resendOTP:
     *   patch:
     *     tags:
     *       - USER
     *     description: resendOTP
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
        let validationSchema = {
            email: Joi.string().required()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email
            } = validatedBody;
            let userResult = await findUser({
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
            })
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let otp = await commonFunction.getOTP();
            let otpExpireTime = Date.now() + config.get('OTP_TIME_MINUTE') * 60 * 1000;
            if (userResult.email == email) {
                await commonFunction.signResendOtp(email, userResult.firstName, otp)
            }
            // if (userResult.mobileNumber == email) {
            //     await commonFunction.sendSms(userResult.countryCode + userResult.mobileNumber, otp);
            // }
            let updateResult = await updateUser({
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
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/forgotPassword:
     *   patch:
     *     tags:
     *       - USER
     *     description: forgotPassword
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
        let validationSchema = {
            email: Joi.string().required()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email
            } = validatedBody;
            let userResult = await findUser({
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
            })
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let otp = await commonFunction.getOTP();
            let otpExpireTime = Date.now() + config.get('OTP_TIME_MINUTE') * 60 * 1000;
            if (userResult.email == email) {
                await commonFunction.signForgotOtp(email, userResult.firstName, otp)
            }
            // if (userResult.mobileNumber == email) {
            //     await commonFunction.sendSms(userResult.countryCode + userResult.mobileNumber, otp);
            // }
            let updateResult = await updateUser({
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
            return next(error);
        }
    }
    /**
     * @swagger
     * /user/resetPassword:
     *   patch:
     *     tags:
     *       - USER
     *     description: resetPassword
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
     *       - name: resetPassword
     *         description: resetPassword
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/resetPassword'
     *     responses:
     *       200:
     *         description: Returns success message
     */

    async resetPassword(req, res, next) {
        const validationSchema = {
            password: Joi.string().required(),
            confirmPassword: Joi.string().required(),
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                password,
                confirmPassword
            } = validatedBody;
            let userInfo = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userInfo) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND)
            }
            if (password != confirmPassword) {
                throw apiError.badRequest(responseMessage.PWD_CONFPWD_NOT_MATCH)
            }
            if (userInfo.otpVerified == false) {
                throw apiError.unauthorized(responseMessage.RESET_OTP_NOT_VERIFY);
            }
            let updateResult = await updateUserById({
                _id: userInfo._id
            }, {
                $set: {
                    password: bcrypt.hashSync(password)
                }
            });
            updateResult = JSON.parse(JSON.stringify(updateResult));
            delete updateResult.password;
            delete updateResult.otp;
            return res.json(new response(updateResult, responseMessage.PWD_CHANGED));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/userLogin:
     *   post:
     *     tags:
     *       - USER
     *     description: userLogin
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: userLogin
     *         description: userLogin
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/userLogin'
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async userLogin(req, res, next) {
        let validationSchema = {
            email: Joi.string().required(),
            password: Joi.string().required(),
            ip: Joi.string().optional(),
            termsAndConditions: Joi.string().optional(),
        }
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email,
                password,
                mobileNumber
            } = validatedBody;
            var userResult = await findUser({
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
            })
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (!userResult.password) {
                throw apiError.badRequest(responseMessage.SOCIAL_ALREADY_LOGIN);
            }
            // if (userResult.isSocial == true) {
            //     throw apiError.badRequest(responseMessage.SOCIAL_ALREADY_LOGIN);
            // }
            // if (userResult.otpVerified === false) {
            //     throw apiError.badRequest(responseMessage.OTP_NOT_VERIFY);
            // }
            if (bcrypt.compareSync(password, userResult.password) == false) {
                throw apiError.invalid(responseMessage.INCORRECT_LOGIN);
            }
            if (userResult.userType == userType.SUBADMIN) {
                let ipAddressCheckRes = await findIpAddressCheck({ isTrue: true, status: { $ne: status.DELETE } });
                if (ipAddressCheckRes) {
                    if (!validatedBody.ip) {
                        throw apiError.badRequest(responseMessage.ENTER_IP_ADDRESS)
                    }
                    let checkIpCorrect = await findIpAddress({ ip: validatedBody.ip, status: status.ACTIVE })
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
            let results = await updateUser({
                _id: userResult._id
            }, {
                otp: otp,
                otpExpireTime: otpExpireTime,
                termsAndConditions: validatedBody.termsAndConditions
            });

            return res.json(new response(results, responseMessage.LOGIN));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/getProfile:
     *   get:
     *     tags:
     *       - USER
     *     description: getProfile
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
    async getProfile(req, res, next) {
        try {
            // console.log('get profile 427',)
            let userResult = await findUserWithPopulate({ _id: req.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let [walletAddressRes] = await Promise.all([
                findUserWallet({ userId: userResult._id })
            ])
            userResult = JSON.parse(JSON.stringify(userResult));
            if (walletAddressRes) {
                userResult.walletFieroAddress = walletAddressRes.walletFieroAddress
                userResult.walletUsdAddress = walletAddressRes.walletUsdAddress
            }
            delete userResult.password;
            delete userResult.otp;
            return res.json(new response(userResult, responseMessage.USER_DETAILS));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/editUserProfile:
     *   put:
     *     tags:
     *       - USER
     *     description: editUserProfile
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
    async editUserProfile(req, res, next) {
        const validationSchema = {
            firstName: Joi.string().optional(),
            lastName: Joi.string().optional(),
            email: Joi.string().optional(),
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
            const { email, mobileNumber } = validatedBody;
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let sameUserResult = await findUser({ $and: [{ $or: [{ email: email }, { mobileNumber: mobileNumber }] }, { _id: { $ne: userResult._id }, status: { $ne: status.DELETE } }] });
            if (sameUserResult) {
                if (sameUserResult.email == email) {
                    throw apiError.conflict(responseMessage.EMAIL_EXIST);
                } else if (sameUserResult.mobileNumber == mobileNumber) {
                    throw apiError.conflict(responseMessage.MOBILE_EXIST);
                }
            }
            let updateResult = await updateUser({ _id: userResult._id }, { $set: validatedBody });
            updateResult = JSON.parse(JSON.stringify(updateResult));
            delete updateResult.password;
            delete updateResult.otp;
            return res.json(new response(updateResult, responseMessage.PROFILE_UPDATED));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/changePassword:
     *   put:
     *     tags:
     *       - USER
     *     description: changePassword
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
     *         description: Returns success message
     */
    async changePassword(req, res, next) {
        const validationSchema = {
            oldPassword: Joi.string().required(),
            password: Joi.string().required(),
            confirmPassword: Joi.string().required(),
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                email,
                oldPassword,
                password,
                confirmPassword
            } = validatedBody;
            let userResult = await findUser({
                _id: req.userId,
                userType: userType.USER,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (password != confirmPassword) {
                throw apiError.badRequest(responseMessage.PWD_CONFPWD_NOT_MATCH)
            }
            if (bcrypt.compareSync(oldPassword, userResult.password) == false) {
                throw apiError.invalid(responseMessage.PWD_NOT_MATCH);
            }
            let updateResult = await updateUserById({
                _id: userResult._id
            }, {
                $set: {
                    password: bcrypt.hashSync(password)
                }
            });
            updateResult = JSON.parse(JSON.stringify(updateResult));
            delete updateResult.password;
            delete updateResult.otp;
            return res.json(new response(updateResult, responseMessage.PWD_CHANGED));
        } catch (error) {
            return next(error);
        }
    }


    /**
     * @swagger
     * /user/myPlan:
     *   get:
     *     tags:
     *       - SUBSCRIPTION
     *     description: myPlan
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
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
    async myPlan(req, res, next) {
        const validationSchema = {
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
            planStatus: Joi.string().optional(),
            paymentStatus: Joi.string().optional(),
            search: Joi.string().optional()
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let userResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            validatedBody.userId = userResult._id
            let result = await buySubscriptionPlanList(validatedBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.PLAN_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.PLAN_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/viewPlan:
     *   get:
     *     tags:
     *       - SUBSCRIPTION
     *     description: viewPlan
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: planId
     *         description: planId
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Login successfully.
     *       402:
     *         description: Incorrect login credential provided.
     *       404:
     *         description: User not found.
     */
    async viewPlan(req, res, next) {
        const validationSchema = {
            planId: Joi.string().optional()
        };
        try {
            let validatedBody = await Joi.validate(req.query, validationSchema);
            let result = await buySubsciptionPlanData({
                _id: validatedBody.planId
            })
            if (!result) {
                throw apiError.notFound(responseMessage.PLAN_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.PLAN_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/socialLogin:
     *   post:
     *     tags:
     *       - SOCIAL LOGIN
     *     description: socialLogin
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: socialId
     *         description: socialId
     *         in: formData
     *         required: true
     *       - name: socialType
     *         description: socialType
     *         in: formData
     *         required: true
     *       - name: firstName
     *         description: firstName
     *         in: formData
     *         required: true
     *       - name: lastName
     *         description: lastName
     *         in: formData
     *         required: true
     *       - name: email
     *         description: email
     *         in: formData
     *         required: true
     *       - name: termsAndConditions
     *         description: termsAndConditions
     *         in: formData
     *         required: false
     *     responses:
     *       200:
     *         description: Login successfully.
     *       402:
     *         description: Incorrect login credential provided.
     *       404:
     *         description: User not found.
     */
    async socialLogin(req, res, next) {
        const validationSchema = {
            socialId: Joi.string().required(),
            socialType: Joi.string().required(),
            firstName: Joi.string().required(),
            email: Joi.string().optional(),
            lastName: Joi.string().required(),
            termsAndConditions: Joi.string().optional(),
        };
        try {
            if (req.body.email) {
                req.body.email = (req.body.email).toLowerCase();
            }
            let validatedBody = await Joi.validate(req.body, validationSchema);
            const {
                socialId,
                socialType,
                firstName,
                email,
                lastName
            } = validatedBody;
            var userInfo = await findUser({
                email: email,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!validatedBody.termsAndConditions) {
                validatedBody.termsAndConditions = "DECLINE"
            }
            if (!userInfo) {
                let array = ["USER0", "USER1"];
                let randomElement = array[Math.floor(Math.random() * array.length)];
                var data = {
                    socialId: socialId,
                    socialType: socialType,
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    isSocial: true,
                    otpVerified: true,
                    termsAndConditions: validatedBody.termsAndConditions,
                    userGroup: randomElement
                };
                let result = await createUser(data)
                let token = await commonFunction.getToken({
                    _id: result._id,
                    email: result.email,
                    userType: result.userType
                });
                return res.json(new response({
                    result,
                    token
                }, responseMessage.LOGIN));
            } else {
                // if (userInfo.isSocial == false) {
                //     throw apiError.conflict(responseMessage.SOCIAL_EMAIL);
                // }
                let token = await commonFunction.getToken({
                    _id: userInfo._id,
                    email: userInfo.email,
                    userType: userInfo.userType
                });
                var data = {
                    socialId: socialId,
                    socialType: socialType,
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    isSocial: true,
                    otpVerified: true,
                    termsAndConditions: validatedBody.termsAndConditions
                };
                let result = await updateUser({
                    _id: userInfo._id
                }, {
                    $set: data
                });
                return res.json(new response({
                    result,
                    token
                }, responseMessage.LOGIN));
            }
        } catch (error) {
            console.log("socialLogin ===========", error);
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/updateTermsAndConditions:
     *   get:
     *     tags:
     *       - USER
     *     description: getProfile
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
     *       - name: termsAndConditions
     *         description: termsAndConditions
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
    async updateTermsAndConditions(req, res, next) {
        try {
            // console.log('get profile 427',)
            let userResult = await findUser({
                _id: req.userId,
                status: {
                    $ne: status.DELETE
                }
            });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (!req.query.termsAndConditions || !userResult.termsAndConditions) {
                req.query.termsAndConditions = userResult.termsAndConditions || "DECLINE"
            }
            if (req.query.termsAndConditions) {
                await updateUser({
                    _id: userResult._id
                }, {
                    termsAndConditions: req.query.termsAndConditions
                })
            }
            userResult = JSON.parse(JSON.stringify(userResult));
            delete userResult.password;
            delete userResult.otp;
            return res.json(new response(userResult, responseMessage.USER_DETAILS));
        } catch (error) {
            return next(error);
        }
    }


    /**
     * @swagger
     * /user/editUserProfileByAdmin:
     *   put:
     *     tags:
     *       - USER
     *     description: editUserProfileByAdmin
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: userId
     *         description: userId
     *         in: formData
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
     *       - name: ibiId
     *         description: ibiId
     *         in: formData
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async editUserProfileByAdmin(req, res, next) {
        const validationSchema = {
            userId: Joi.string().required(),
            firstName: Joi.string().optional(),
            lastName: Joi.string().optional(),
            email: Joi.string().optional(),
            countryCode: Joi.string().optional(),
            mobileNumber: Joi.string().optional(),
            dateOfBirth: Joi.string().optional(),
            gender: Joi.string().optional(),
            address: Joi.string().optional(),
            city: Joi.string().optional(),
            state: Joi.string().optional(),
            country: Joi.string().optional(),
            ibiId: Joi.string().optional(),
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            const { email, mobileNumber } = validatedBody;
            let adminResult = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] }, status: { $ne: status.DELETE } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let userResult = await findUser({ _id: validatedBody.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let sameUserResult = await findUser({ $and: [{ $or: [{ email: email }, { mobileNumber: mobileNumber }] }, { _id: { $ne: userResult._id }, status: { $ne: status.DELETE } }] });
            if (sameUserResult) {
                if (sameUserResult.email == email) {
                    throw apiError.conflict(responseMessage.EMAIL_EXIST);
                } else if (sameUserResult.mobileNumber == mobileNumber) {
                    throw apiError.conflict(responseMessage.MOBILE_EXIST);
                }
            }
            let updateResult = await updateUser({ _id: userResult._id }, { $set: validatedBody });
            updateResult = JSON.parse(JSON.stringify(updateResult));
            delete updateResult.password;
            delete updateResult.otp;
            return res.json(new response(updateResult, responseMessage.PROFILE_UPDATED));
        } catch (error) {
            return next(error);
        }
    }


    /**
     * @swagger
     * /user/getPlanList:
     *   get:
     *     tags:
     *       - SUBSCRIPTION
     *     description: getCustomPlan
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
    async getPlanList(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            console.log(userResult)
            let query = {}
            if (userResult.subscriptionPlaneStatus == true) {
                let subscriptionPlanHistory = await buySubsciptionPlanData({ _id: userResult.subscriptionPlaneId })
                console.log(subscriptionPlanHistory)
                if (subscriptionPlanHistory) {
                    query.planId = subscriptionPlanHistory.subscriptionPlaneId;
                    query.planAmount = subscriptionPlanHistory.planAmount;
                }
            }
            let result = await subscriptionListWithActivePlan(query)
            if (result.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }




            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }
    /**
   * @swagger
   * /user/updateWallet:
   *   put:
   *     tags:
   *       - USER
   *     description: editUserProfile
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: token
   *         description: token
   *         in: header
   *         required: true
   *       - name: walletAddress
   *         description: walletAddress
   *         in: formData
   *         required: true
   *     responses:
   *       200:
   *         description: Returns success message
   */
    async updateWallet(req, res, next) {
        const validationSchema = {
            walletAddress: Joi.string().required(),
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            const { walletAddress } = validatedBody;
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let anotherUser = await findUser({ walletAddress: walletAddress, status: { $ne: status.DELETE }, _id: { $ne: userResult._id } });
            if (anotherUser) {
                throw apiError.badRequest(responseMessage.WALLET_ALREADY_CONNECTED);
            }
            if (userResult.walletAddress && `${userResult.walletAddress}`.toLowerCase() === `${walletAddress}`.toLowerCase()) {
                return res.json(new response({ isRegistered: false }, responseMessage.WALLET_CONNECTED));
            }
            if (userResult.walletAddress && userResult.walletAddress !== "") {
                throw apiError.badRequest(`Already connected with ${userResult.walletAddress.slice(0, 6)}...${userResult.walletAddress.slice(userResult.walletAddress.length - 4)} address`);
            }
            let updateResult = await updateUser({ _id: userResult._id }, { walletAddress: walletAddress });
            let obj = {
                _id: updateResult._id,
                email: updateResult.email,
                firstName: updateResult.firstName,
                walletAddress: updateResult.walletAddress,
                isRegistered: true
            }
            return res.json(new response(obj, responseMessage.WALLET_CONNECTED));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/isValid:
     *   get:
     *     tags:
     *       - SUBSCRIPTION
     *     description: getCustomPlan
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
    async isValid(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            if (!userResult.discountStatus || userResult.discountStatus == false) {
                throw apiError.notFound(responseMessage.ALREADY_CLAIM_DISCOUNT);
            }
            if (userResult.walletAddress) {
                let result = await isValidForBenefit(userResult.walletAddress)
                if (result.status == true) {
                    return res.json(new response({ wallet: userResult.walletAddress }, responseMessage.DATA_FOUND));
                }
                else {
                    let address = await findAddress({ address: userResult.walletAddress, status: status.ACTIVE })
                    if (address) {
                        return res.json(new response({ wallet: userResult.walletAddress }, responseMessage.DATA_FOUND));
                    }
                    throw apiError.notFound(responseMessage.Not_VALID);
                }
            } else {
                throw apiError.notFound(responseMessage.ADD_ADDRESS);
            }

        } catch (error) {
            return next(error);
        }
    }



    /**
     * @swagger
     * /user/buySubscription:
     *   post:
     *     tags:
     *       - SUBSCRIPTION
     *     description: buySubscription
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
     *       - name: subscriptionId
     *         description: subscriptionId
     *         in: formData
     *         required: true
     *       - name: transactionHash
     *         description: transactionHash
     *         in: formData
     *         required: true
     *       - name: isValid
     *         description: isValid
     *         in: formData
     *         required: true
     *       - name: coin
     *         description: coin
     *         in: formData
     *         required: true
     *       - name: amount
     *         description: amount
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Login successfully.
     *       402:
     *         description: Incorrect login credential provided.
     *       404:
     *         description: User not found.
     */
    async buySubscription(req, res, next) {
        const validationSchema = {
            subscriptionId: Joi.string().required(),
            transactionHash: Joi.string().required(),
            isValid: Joi.boolean().required(),
            coin: Joi.string().required(),
            amount: Joi.number().required(),
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let subscriptionData = await findSubscriptionPlan({ _id: validatedBody.subscriptionId })
            if (!subscriptionData) {
                throw apiError.notFound(responseMessage.SUBSCRIPTION_PLAN_NOT);
            }
            let finalPrice = subscriptionData.price
            let coin = "DSC"
            if (validatedBody.coin == "USDT") {
                coin = "USDT"
            }
            let trxVerification = await getTransactionDetailForUsdBuySubscription(validatedBody.transactionHash, coin)
            if (trxVerification.status == false) {
                throw apiError.notFound(responseMessage.TRANSACTION_FAILED);
            }
            if (parseInt(trxVerification.amount) != parseInt(validatedBody.amount)) {
                throw apiError.notFound(responseMessage.TRANSACTION_FAILED);
            }
            if (validatedBody.isValid === true) {
                let discounts = await findDiscountPricing()
                finalPrice = Number(finalPrice) - Number(discounts.amount)
                await updateUser({ _id: req.userId }, { $set: { discountStatus: false } });
            }
            // verify transaction
           
            var endTime = new Date();
            endTime.setTime(endTime.getTime() + (Number(subscriptionData.tenure) * 30 * 24 * 60 * 60 * 1000));
            let startTime = new Date()

            let subscriptionObj = {
                userId: userResult._id,
                subscriptionPlaneId: validatedBody.subscriptionId,
                transactionHash: validatedBody.transactionHash,
                isValid: validatedBody.isValid,
                pairs: subscriptionData.coins,
                planAmount: subscriptionData.price,
                amount: finalPrice,
                planName: subscriptionData.title,
                exchanges: subscriptionData.arbitrageName,
                startTime: startTime,
                endTime: endTime,
                pay_currency: validatedBody.coin
            }

            let result = await buySubsciptionPlanCreate(subscriptionObj)
            if (userResult.subscriptionPlaneId) {
                let priviousRes = await lastedBuyPlan({ userId: userResult._id, _id: userResult.subscriptionPlaneId })
                if (priviousRes) {

                    await Promise.all([
                        buySubsciptionPlanUpdate({ _id: priviousRes._id }, { planStatus: "INACTIVE" }),
                        updateUser({ _id: userResult._id }, {
                            previousPlaneId: priviousRes._id, previousPlanName: priviousRes.subscriptionPlaneId.type, previousPlanStatus: "INACTIVE",
                        })
                    ])
                }
            }
            await updateUser({ _id: userResult._id }, {
                subscriptionPlaneId: result._id,
                currentPlanStatus: "ACTIVE",
                subscriptionPlaneStatus: true,
            })

            return res.json(new response(subscriptionObj, responseMessage.BUY_PLAN));

        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/getPrice:
     *   get:
     *     tags:
     *       - SUBSCRIPTION
     *     description: getPrice
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: amount
     *         description: amount
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Login successfully.
     *       402:
     *         description: Incorrect login credential provided.
     *       404:
     *         description: User not found.
     */
    async getPrice(req, res, next) {
        try {
            let result = await axios.get('https://dscscan.io/node-api/get-dsc-live-price')
            let prices = result.data.data[0].token0Price

            let finalResult = (Number(req.query.amount) / Number(prices))
            return res.json(new response({ finalResult: finalResult }, responseMessage.DATA_FOUND));


        } catch (error) {
            return next(error);
        }
    }
    /**
* @swagger
* /user/subscribe:
*   post:
*     tags:
*       - CONTACT US
*     description: contactUs
*     produces:
*       - application/json
*     parameters:
*       - name: email
*         description: email
*         in: formData
*         required: true
*     responses:
*       200:
*         description: Contact-Us data Saved successfully
*/

    async subscribed(req, res, next) {
        let validationSchema = {
            email: Joi.string().required(),
        }
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);

            var adminResult = await findUser({
                userType: userType.ADMIN,
                status: status.ACTIVE
            })
            if (!adminResult) {
                throw apiError.notFound("Admin not found");
            }
            var userResult = await findSubscribe({
                email: validatedBody.email,
                isSubscribed: true
            })
            if (userResult) {
                throw apiError.notFound("User already subscribed");
            }

            var result = await updateSubscribe({ email: validatedBody.email }, { email: validatedBody.email, isSubscribed: true });
            await commonFunction.sendEmailForSubscribe(validatedBody.email)
            await commonFunction.sendEmailForSubscribeAdmin(validatedBody.email)
            return res.json(new response(result, "Thank you for subscribing to our newsletter."));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /user/unsubscribe:
     *   post:
     *     tags:
     *       - CONTACT US
     *     description: contactUs
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: email
     *         description: email
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Contact-Us data Saved successfully
     */

    async unSubscribed(req, res, next) {
        let validationSchema = {
            email: Joi.string().required(),
        }
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);

            var adminResult = await findUser({
                userType: userType.ADMIN,
                status: status.ACTIVE
            })
            if (!adminResult) {
                throw apiError.notFound("Admin not found");
            }
            var userResult = await findSubscribe({
                email: validatedBody.email,
            })
            if (!userResult) {
                throw apiError.notFound("You don't subscribed yet.Please subscribe first.");
            }
            if (userResult.isSubscribed == false) {
                throw apiError.notFound("You already unSubscribed.");
            }
            var result = await updateSubscribe({ email: validatedBody.email }, { email: validatedBody.email, isSubscribed: false });

            return res.json(new response(result, "You have been unsubscribed."));
        } catch (error) {
            return next(error);
        }
    }
    /**
   * @swagger
   * /user/contact-us:
   *   post:
   *     tags:
   *       - CONTACT US
   *     description: contactUs
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: name
   *         description: name
   *         in: formData
   *         required: true
   *       - name: email
   *         description: email
   *         in: formData
   *         required: true
   *       - name: mobileNumber
   *         description: mobileNumber
   *         in: formData
   *         required: false
   *       - name: message
   *         description: message
   *         in: formData
   *         required: true
   *       - name: telegramId
   *         description: telegramId
   *         in: formData
   *         required: false
   *     responses:
   *       200:
   *         description: Contact-Us data Saved successfully
   */

    async contactUs(req, res, next) {
        let validationSchema = {
            name: Joi.string().required(),
            email: Joi.string().required(),
            mobileNumber: Joi.string().optional(),
            message: Joi.string().required(),
            telegramId: Joi.string().optional(),
        }
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);

            var adminResult = await findUser({
                userType: userType.ADMIN,
                status: status.ACTIVE
            })
            if (!adminResult) {
                throw apiError.notFound("Admin not found");
            }


            var result = await createContactUs(validatedBody);
            await commonFunction.sendMailContactus(adminResult.email, adminResult.firstName, validatedBody.name, validatedBody.email, validatedBody.message, validatedBody.telegramId)
            await commonFunction.sendMailContactusUser(validatedBody.email, validatedBody.name, validatedBody.message)
            // await commonFunction.sendMailContactusV1(adminResult.email, adminResult.firstName, validatedBody.firstName, validatedBody.email, validatedBody.message,validatedBody.telegramId)
            return res.json(new response(result, responseMessage.CONTACT_US));
        } catch (error) {
            return next(error);
        }
    }

}
export default new userController()
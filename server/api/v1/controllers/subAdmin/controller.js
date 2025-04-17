import Joi from "joi";
import Mongoose from "mongoose";
import _ from "lodash";
import config from "config";
import apiError from '../../../../helper/apiError';
import response from '../../../../../assets/response';
import responseMessage from '../../../../../assets/responseMessage';
import status from '../../../../enums/status';
import userType from "../../../../enums/userType";
import { ipAddressServices } from "../../services/ipAddress"
import { userServices } from "../../services/user"
const { createIpAddress, findIpAddress, updateIpAddress, listIpAddress, ipAddressListPagination } = ipAddressServices
const { findUser, updateUser, updateUserById, createUser,paginateSearch } = userServices
import commonFunction from '../../../../helper/util';
import bcrypt from 'bcryptjs';

export class subAdminController {

    /**
     * @swagger
     * /subAdmin/addIpAddress:
     *   post:
     *     tags:
     *       - IP Management
     *     description: Add ip address
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: ip
     *         description: ip
     *         in: formData
     *         required: true
     *       - name: title
     *         description: title
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async addIpAddress(req, res, next) {
        const validationSchema = {
            ip: Joi.string().required(),
            title: Joi.string().required()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let adminResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let checkIpAddress = await findIpAddress({ ip: validatedBody.ip, status: { $ne: status.DELETE } })
            if (checkIpAddress) {
                throw apiError.conflict(responseMessage.ALREADY_EXITS);
            }
            let result = await createIpAddress(validatedBody)
            return res.json(new response(result, responseMessage.IP_ADD));
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /subAdmin/ipAddressList:
    *   get:
    *     tags:
    *       - IP Management
    *     description: get ip address 
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: token
    *         in: header
    *         required: true
    *       - name: search
    *         description: search (title)
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
    async ipAddressList(req, res, next) {
        const validationSchema = {
            search: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
        };
        try {
            var validatedBody = await Joi.validate(req.query, validationSchema);
            let adminResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            var result = await ipAddressListPagination(validatedBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.IP_NOT_FOUND)
            }
            return res.json(new response(result, responseMessage.IP_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /subAdmin/ipAddressView:
    *   get:
    *     tags:
    *       - IP Management
    *     description: get ip address 
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: token
    *         in: header
    *         required: true
    *       - name: ipAddressId
    *         description: ipAddressId
    *         in: query
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async ipAddressView(req, res, next) {
        const validationSchema = {
            ipAddressId: Joi.string().required()
        };
        try {
            var validatedBody = await Joi.validate(req.query, validationSchema);
            let adminResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            var result = await findIpAddress({ _id: validatedBody.ipAddressId })
            if (!result) {
                throw apiError.notFound(responseMessage.IP_NOT_FOUND)
            }
            return res.json(new response(result, responseMessage.IP_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /subAdmin/ipAddressEnableDisable:
    *   put:
    *     tags:
    *       - IP Management
    *     description: get ip address 
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: token
    *         in: header
    *         required: true
    *       - name: ipAddressId
    *         description: ipAddressId
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async ipAddressEnableDisable(req, res, next) {
        const validationSchema = {
            ipAddressId: Joi.string().required()
        };
        try {
            var validatedBody = await Joi.validate(req.body, validationSchema);
            let adminResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            var result = await findIpAddress({ _id: validatedBody.ipAddressId })
            if (!result) {
                throw apiError.notFound(responseMessage.IP_NOT_FOUND)
            }
            if (result.status == status.ACTIVE) {
                let updateResult = await updateIpAddress({ _id: result._id }, { status: status.BLOCK })
                return res.json(new response(updateResult, responseMessage.IP_INACTIVE));
            } else {
                let updateResult = await updateIpAddress({ _id: result._id }, { status: status.ACTIVE })
                return res.json(new response(updateResult, responseMessage.IP_ACTIVE));
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /subAdmin/updateIpAddress:
     *   put:
     *     tags:
     *       - IP Management
     *     description: update ip address
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: ipAddressId
     *         description: ipAddressId
     *         in: formData
     *         required: true
     *       - name: ip
     *         description: ip
     *         in: formData
     *         required: false
     *       - name: title
     *         description: title
     *         in: formData
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async updateIpAddress(req, res, next) {
        const validationSchema = {
            ipAddressId: Joi.string().required(),
            ip: Joi.string().optional(),
            title: Joi.string().optional()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let adminResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let checkIpAddress = await findIpAddress({ _id: validatedBody.ipAddressId, status: { $ne: status.DELETE } })
            if (!checkIpAddress) {
                throw apiError.conflict(responseMessage.IP_NOT_FOUND);
            }
            let existRes = await findIpAddress({ ip: validatedBody.ip, _id: { $ne: validatedBody.ipAddressId }, status: { $ne: status.DELETE } })
            if (existRes) {
                throw apiError.conflict(responseMessage.ALREADY_EXITS);
            }
            let updateResult = await updateIpAddress({ _id: checkIpAddress._id }, validatedBody)
            return res.json(new response(updateResult, responseMessage.IP_UPDATE));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /subAdmin/addSubAdmin:
     *   post:
     *     tags:
     *       - SUBADMIN MANAGEMENT
     *     description: addSubAdmin
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: addAdmin
     *         description: addAdmin
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/addAdmin'
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async addSubAdmin(req, res, next) {
        const options = {
            isView: Joi.boolean().required(),
            isEdit: Joi.boolean().required(),
            isdetails: Joi.boolean().optional()
        }
        const validationSchema = {
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            email: Joi.string().required(),
            countryCode: Joi.string().optional(),
            mobileNumber: Joi.string().optional(),
            websiteURL: Joi.string().required(),
            permissions: Joi.object().keys({
                dashboard: Joi.object().keys(options),
                staticContentManagement: Joi.object().keys(options),
                transactionManagement: Joi.object().keys(options),
                userManagement: Joi.object().keys(options),
                newsManagement: Joi.object().keys(options),
                videoManagement: Joi.object().keys(options),
                ipAddressManagemet: Joi.object().keys(options),
                subAdminManagement: Joi.object().keys(options),
                subscriptionManagement: Joi.object().keys(options),
                faqManagement: Joi.object().keys(options),
                contactManagement: Joi.object().keys(options),
            }).optional()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            let adminCheck = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminCheck) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            var userInfo = await findUser({ $and: [{ status: { $ne: status.DELETE } }, { $or: [{ mobileNumber: validatedBody.mobileNumber }, { email: validatedBody.email }] }] });
            if (userInfo) {
                if (userInfo.email == validatedBody.email) {
                    throw apiError.conflict(responseMessage.EMAIL_EXIST);
                }
                else {
                    throw apiError.conflict(responseMessage.MOBILE_EXIST);
                }
            }
            let generatePassword = await commonFunction.generatePassword()
            let password = bcrypt.hashSync(generatePassword);
            await commonFunction.sendEmailCreadential(validatedBody.email, generatePassword, validatedBody.websiteURL);
            validatedBody.userType = userType.SUBADMIN;
            validatedBody.password = password;
            validatedBody.otpVerified = true
            let array = ["USER0", "USER1"];
            let randomElement = array[Math.floor(Math.random() * array.length)];
            validatedBody.userGroup=randomElement
            var result = await createUser(validatedBody);
            return res.json(new response(result, responseMessage.SUBADMIN_CREATED));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /subAdmin/editSubAdmin:
     *   put:
     *     tags:
     *       - SUBADMIN MANAGEMENT
     *     description: editSubAdmin
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: editAdmin
     *         description: editAdmin
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/editAdmin'
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async editSubAdmin(req, res, next) {
        const options = {
            isView: Joi.boolean().required(),
            isEdit: Joi.boolean().required(),
            isdetails: Joi.boolean().optional()
        }
        const validationSchema = {
            userId: Joi.string().required(),
            firstName: Joi.string().optional(),
            lastName: Joi.string().optional(),
            email: Joi.string().optional(),
            countryCode: Joi.string().optional(),
            mobileNumber: Joi.string().optional(),
            websiteURL: Joi.string().required(),
            permissions: Joi.object().keys({
                dashboard: Joi.object().keys(options),
                staticContentManagement: Joi.object().keys(options),
                transactionManagement: Joi.object().keys(options),
                userManagement: Joi.object().keys(options),
                newsManagement: Joi.object().keys(options),
                videoManagement: Joi.object().keys(options),
                ipAddressManagemet: Joi.object().keys(options),
                subAdminManagement: Joi.object().keys(options),
                subscriptionManagement: Joi.object().keys(options),
                faqManagement: Joi.object().keys(options),
                contactManagement: Joi.object().keys(options),
            }).optional()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            let adminCheck = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminCheck) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let userResult = await findUser({ _id: validatedBody.userId, status: { $ne: status.DELETE }, userType: userType.SUBADMIN })
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            var userInfo = await findUser({ $and: [{ $or: [{ email: validatedBody.email }, { mobileNumber: validatedBody.mobileNumber }] }, { _id: { $ne: userResult._id }, status: { $ne: status.DELETE } }] });
            if (userInfo) {
                if (userInfo.email == validatedBody.email) {
                    throw apiError.conflict(responseMessage.EMAIL_EXIST);
                }
                else {
                    throw apiError.conflict(responseMessage.MOBILE_EXIST);
                }
            }
            if (userResult.email != validatedBody.email) {
                let generatePassword = await commonFunction.generatePassword()
                let password = bcrypt.hashSync(generatePassword);
                await commonFunction.sendEmailCreadential(validatedBody.email, generatePassword, validatedBody.websiteURL);
                validatedBody.password = password;

            }
            var result = await updateUser({ _id: userResult._id }, validatedBody);
            return res.json(new response(result, responseMessage.SUBADMIN_CREATED));
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /subAdmin/subAdminList:
    *   get:
    *     tags:
    *       - SUBADMIN MANAGEMENT
    *     description: subAdminList
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: token
    *         in: header
    *         required: true
    *       - name: search
    *         description: search (title)
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
    async subAdminList(req, res, next) {
        const validationSchema = {
            search: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
        };
        try {
            var validatedBody = await Joi.validate(req.query, validationSchema);
            let adminResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            validatedBody.userType1=userType.SUBADMIN
            var result = await paginateSearch(validatedBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND)
            }
            return res.json(new response(result, responseMessage.USER_FOUND));
        } catch (error) {
            return next(error);
        }
    }
}
export default new subAdminController()
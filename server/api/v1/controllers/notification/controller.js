import Joi from "joi";
import _ from "lodash";
import config from "config";
import apiError from '../../../../helper/apiError';
import auth from '../../../../helper/auth';
import response from '../../../../../assets/response';
import responseMessage from '../../../../../assets/responseMessage';
import { notificationServices } from '../../services/notification';
import status from '../../../../enums/status';
import staticModel from '../../../../models/static'
import { userServices } from '../../services/user';
import userType from "../../../../enums/userType";
import fs from 'file-system';
const { notificationList, notificationData, notificationUpdate, multiUpdateNotification } = notificationServices;
const { checkUserExists, emailMobileExist, createUser, findUser, findAllUser, updateUser, updateUserById, paginateSearch, insertManyUser } = userServices;


export class notificationController {
    /**
     * @swagger
     * /notification/listNotification:
     *   get:
     *     tags:
     *       - NOTIFICATION MANAGEMENT
     *     description: list notifications
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
     *       - name: page
     *         description: page
     *         in: query
     *         required: true
     *       - name: limit
     *         description: limit
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Data found successfully.
     *       404:
     *         description: User not found || Data not found.
     *       501:
     *         description: Something went wrong!
     */
    async listNotification(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER,  userType.SUBADMIN, userType.ADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                const data = await notificationList({ userId: userResult._id, status: status.ACTIVE }, req.query.page, req.query.limit);
                if (data.length == 0) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    return res.json(new response(data, responseMessage.DATA_FOUND));
                }
            }
        } catch (error) {
            return next(error);
        }
    }


    /**
     * @swagger
     * /notification/viewNotification/{_id}:
     *   get:
     *     tags:
     *       - NOTIFICATION MANAGEMENT
     *     description: viewStaticContent
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
     *       - name: _id
     *         description: _id of notification
     *         in: path
     *         required: true
     *     responses:
     *       200:
     *         description: Data found successfully.
     *       404:
     *         description: User not found || Data not found.
     *       501:
     *         description: Something went wrong!
     */
    async viewNotification(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER,  userType.SUBADMIN, userType.ADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                const data = await notificationData({ _id: req.params._id, userId: userResult._id, status: status.ACTIVE });
                if (data.length == 0) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    await notificationUpdate({ _id: data._id }, { $set: { isRead: true } });
                    return res.json(new response(data, responseMessage.DATA_FOUND));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
      * @swagger
      * /notification/readNotification:
      *   get:
      *     tags:
      *       - NOTIFICATION MANAGEMENT
      *     description: readNotification
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
    async readNotification(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER,  userType.SUBADMIN, userType.ADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let result = await multiUpdateNotification({ userId: userResult._id }, { isRead: true });
                return res.json(new response(result, responseMessage.DETAILS_FETCHED));
            }
        }
        catch (error) {
            return next(error);
        }
    }

    async getNotificationList(token) {
        let responses;
        try {
            var unReadCount = 0;
            return new Promise(async (resolve, reject) => {
                let userId = await auth.verifyTokenBySocket(token);
                const responseData = await notificationList({ userId: userId, status: { $ne: status.DELETE } })
                if (responseData.docs.length == 0) {
                    responses = ({ responseCode: 404, responseMessage: "Data not found!", responseResult: [] });;
                    resolve(responses)
                } else {
                    for (let i = 0; i < responseData.docs.length; i++) {
                        if (responseData.docs[i].isRead === false) {
                            unReadCount += 1;
                        }
                    }
                    let obj = {
                        data: responseData.docs,
                        unReadCount: unReadCount
                    }
                    responses = ({ responseCode: 200, responseMessage: "Data fetched successfully!", responseResult: obj });
                    resolve(responses)
                }
            })
        } catch (error) {
            responses = (error);
            reject(responses)
        }
    }

    /**
    * @swagger
    * /notification/clearNotification:
    *   delete:
    *     tags:
    *       - NOTIFICATION MANAGEMENT
    *     description: clearNotification
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
    async clearNotification(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.SUBADMIN, userType.ADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let result = await multiUpdateNotification({ userId: userResult._id }, { status: status.DELETE });
                return res.json(new response(result, responseMessage.NOTIFICATION_CLEAR));
            }
        }
        catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /notification/enableDisableNotification:
     *   put:
     *     tags:
     *       - NOTIFICATION MANAGEMENT
     *     description: Enable disable notification 
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: enableDisableNotification
     *         description: enableDisableNotification  
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/enableDisableNotification'
     *     responses:
     *       200:
     *         description: Returns success message
     */

    async enableDisableNotification(req, res, next) {
        const validationSchema = {
            notifications: Joi.object().keys({
                trade_error: Joi.boolean().optional(),
                trade_cancel: Joi.boolean().optional(),
                trade_success: Joi.boolean().optional(),
            }).required(),
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE } });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            let result = await updateUser({ _id: userResult._id }, { notifications: validatedBody.notifications })
            return res.json(new response(result, responseMessage.NOTIFICATION_UPDATED));
        } catch (error) {
            console.log("error=======>138", error)
            return next(error);
        }
    }


}


export default new notificationController()

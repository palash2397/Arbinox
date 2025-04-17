import Joi from "joi";
import _ from "lodash";
import config from "config";
import apiError from '../../../../helper/apiError';
import response from '../../../../../assets/response';
import responseMessage from '../../../../../assets/responseMessage';
import { staticServices } from '../../services/static';
const { createStaticContent, findStaticContent, updateStaticContent, staticContentList } = staticServices;
import commonFunction from '../../../../helper/util';
import status from '../../../../enums/status';
import staticModel from '../../../../models/static'
import { userServices } from '../../services/user';
const { checkUserExists, emailMobileExist, createUser, findUser, findAllUser, updateUser, updateUserById, paginateSearch, insertManyUser } = userServices;
import userType from "../../../../enums/userType";
import fs from 'file-system';
import { faqServices } from '../../services/faq';
const { createFAQ, findFAQ, updateFAQ, listFaq, faqListPagination } = faqServices;
import { contactUsServices } from '../../services/contactUs'
const { createContactUs, findContactUs } = contactUsServices


export class staticController {


    /**
     * @swagger
     * /static/addStaticContent:
     *   post:
     *     tags:
     *       - STATIC
     *     description: addStaticContent
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token -> admin || subadmin
     *         in: header
     *         required: true
     *       - name: type
     *         description: type
     *         in: formData
     *         required: true
     *       - name: title
     *         description: title
     *         in: formData
     *         required: true
     *       - name: description
     *         description: description
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Content add successfully.
     *       404:
     *         description: User not found || Data not found.
     *       409:
     *         description: Data already exits.
     *       501:
     *         description: Something went wrong!
     */
    async addStaticContent(req, res, next) {
        const validationSchema = {
            type: Joi.string().valid('termsConditions', 'privacyPolicy', 'aboutUs', 'riskDisclosure').required(),
            title: Joi.string().optional(),
            description: Joi.string().optional()
        }
        try {
            const validateBody = await Joi.validate(req.body, validationSchema);
            const authCheck = await findUser({ _id: req.userId, status: status.ACTIVE, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!authCheck) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            } else {
                let checkStatic = await findStaticContent({ title: req.body.title });
                if (!checkStatic) {
                    const saveResult = await createStaticContent(validateBody);
                    return res.json(new response(saveResult, responseMessage.ADD_CONTENT));
                } else {
                    throw apiError.conflict(responseMessage.ALREADY_EXITS);
                }

            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /static/viewStaticContent:
     *   get:
     *     tags:
     *       - STATIC
     *     description: viewStaticContent
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: type
     *         description: static content type
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
    async viewStaticContent(req, res, next) {
        const validationSchema = {
            type: Joi.string().required()
        }
        try {
            const validatedBody = await Joi.validate(req.query, validationSchema);
            const data = await findStaticContent({ type: req.query.type, status: status.ACTIVE });
            if (!data) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            } else {
                return res.json(new response(data, responseMessage.DATA_FOUND));
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /static/listStaticContent:
     *   get:
     *     tags:
     *       - STATIC
     *     description: list static content
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Data found successfully.
     *       404:
     *         description: User not found || Data not found.
     *       501:
     *         description: Something went wrong!
     */
    async listStaticContent(req, res, next) {
        try {
            const data = await staticContentList();
            if (data.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            } else {
                return res.json(new response(data, responseMessage.DATA_FOUND));
            }
        } catch (error) {
            return next(error);
        }
    }


    /**
     * @swagger
     * /static/editStaticContent:
     *   put:
     *     tags:
     *       - STATIC
     *     description: Contact Us
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token -> admin || subAdmin
     *         in: header
     *         required: true
     *       - name: editStaticContent
     *         description: editStaticContent
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/editStaticContent'
     *     responses:
     *       200:
     *         description: Data found successfully.
     *       404:
     *         description: User not found || Data not found.
     *       501:
     *         description: Something went wrong!
     */
    async editStaticContent(req, res, next) {
        const validationSchema = {
            _id: Joi.string().optional(),
            title: Joi.string().optional(),
            description: Joi.string().optional(),
        }
        try {
            const validateBody = await Joi.validate(req.body, validationSchema);
            const authCheck = await findUser({ _id: req.userId, status: status.ACTIVE, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!authCheck) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            } else {
                let CheckStatic = await findStaticContent({ _id: req.body._id });
                if (!CheckStatic) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    let updateResult = await updateStaticContent({ _id: req.body._id }, (validateBody))
                    return res.json(new response(updateResult, responseMessage.UPDATE_SUCCESS));
                }

            }
        } catch (error) {
            return next(error);
        }
    }

    /**
         * @swagger
         * /static/addFAQ:
         *   post:
         *     tags:
         *       - STATIC
         *     description: addFAQ
         *     produces:
         *       - application/json
         *     parameters:
         *       - name: token
         *         description: Admin token
         *         in: header
         *         required: true
         *       - name: addFAQ
         *         description: addFAQ
         *         in: body
         *         required: true
         *         schema:
         *           $ref: '#/definitions/addFAQ'
         *     responses:
         *       200:
         *         description: Returns success message
         */
    async addFAQ(req, res, next) {
        const validationSchema = {
            question: Joi.string().required(),
            answer: Joi.string().required()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            const { type, question, answer } = validatedBody;
            let findAdmin = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] }, status: status.ACTIVE })
            if (!findAdmin) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED)
            }
            else {
                var faqData = await findFAQ({ question: validatedBody.question })
                if (faqData) {
                    throw apiError.alreadyExist(responseMessage.ALREADY_EXITS);
                }
                else {
                    var result = await createFAQ(validatedBody)
                    return res.json(new response(result, responseMessage.FAQ_ADDED));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
      * @swagger
      * /static/viewFAQ:
      *   get:
      *     tags:
      *       - STATIC
      *     description: viewFAQ
      *     produces:
      *       - application/json
      *     parameters:
      *       - name: _id
      *         description: _id
      *         in: query
      *         required: true
      *     responses:
      *       200:
      *         description: Returns success message
      */
    async viewFAQ(req, res, next) {
        const validationSchema = {
            _id: Joi.string().required(),
        };
        try {
            const validatedBody = await Joi.validate(req.query, validationSchema);
            var result = await findFAQ({ _id: validatedBody._id })
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /static/editFAQ:
    *   put:
    *     tags:
    *       - STATIC
    *     description: editFAQ
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: Admin token
    *         in: header
    *         required: true
    *       - name: editFAQ
    *         description: editFAQ
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/editFAQ'
    *     responses:
    *       200:
    *         description: Returns success message
    */

    async editFAQ(req, res, next) {
        const validationSchema = {
            _id: Joi.string().required(),
            question: Joi.string().optional(),
            answer: Joi.string().optional()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            let findAdmin = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] }, status: status.ACTIVE })
            if (!findAdmin) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED)
            }
            else {
                var result = await updateFAQ({ _id: validatedBody._id }, validatedBody)
                return res.json(new response(result, responseMessage.UPDATE_SUCCESS));
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
        * @swagger
        * /static/deleteFAQ:
        *   delete:
        *     tags:
        *       - STATIC
        *     description: deleteFAQ
        *     produces:
        *       - application/json
        *     parameters:
        *       - name: token
        *         description: token of Admin
        *         in: header
        *         required: true
        *       - name: deleteFAQ
        *         description: deleteFAQ
        *         in: body
        *         required: true
        *         schema:
        *           $ref: '#/definitions/deleteFAQ'
        *     responses:
        *       200:
        *         description: Returns success message
        */
    async deleteFAQ(req, res, next) {
        const validationSchema = {
            _id: Joi.string().required()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            console.log(userResult);
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            var faqInfo = await findFAQ({ _id: validatedBody._id, status: { $ne: status.DELETE } });

            if (!faqInfo) {
                throw apiError.notFound(responseMessage.NOT_FOUND);
            }
            let deleteRes = await updateFAQ({ _id: faqInfo._id }, { status: status.DELETE });
            return res.json(new response(deleteRes, responseMessage.DELETE_SUCCESS));
        } catch (error) {
            return next(error);
        }
    }

    /**
        * @swagger
        * /static/faqList:
        *   get:
        *     tags:
        *       - STATIC
        *     description: faqList
        *     produces:
        *       - application/json
        *     parameters:
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
        *     responses:
        *       200:
        *         description: Returns success message
        */
    async faqList(req, res, next) {
        const validationSchema = {
            search: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
        };
        try {
            var validatedBody = await Joi.validate(req.query, validationSchema);
            if (!validatedBody.page && !validatedBody.limit) {
                var result = await listFaq({ status: status.ACTIVE })
                if (result.length == 0) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND)
                }
                return res.json(new response({ docs: result }, responseMessage.DATA_FOUND));
            }
            var result = await faqListPagination(validatedBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND)
            }
            else {
                return res.json(new response(result, responseMessage.DATA_FOUND));
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /static/addContactUs:
     *   post:
     *     tags:
     *       - CONTACT US
     *     description: addContactUs
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: addContactUs
     *         description: addContactUs
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/addContactUs'
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async addContactUs(req, res, next) {
        const validationSchema = {
            email: Joi.string().required(),
            name: Joi.string().required(),
            mobileNo: Joi.string().optional(),
            message: Joi.string().required()
        };
        try {
            const validatedBody = await Joi.validate(req.body, validationSchema);
            const { email, name, mobileNo, message } = validatedBody;
            let adminRes = await findUser({ userType: userType.ADMIN })
            await commonFunction.contactUsendEmail(adminRes.email, email, mobileNo, name, message)
            let result = await createContactUs(validatedBody)
            return res.json(new response(result, responseMessage.CONTACT_US));
        } catch (error) {
            return next(error);
        }
    }

}


export default new staticController()

import config from "config";
import jwt from "jsonwebtoken";
import userModel from "../models/user";
import apiError from './apiError';
import responseMessage from '../../assets/responseMessage';
import axios from 'axios';
import userType from "../enums/userType";
import status from "../enums/status";

module.exports = {
  async verifyToken(req, res, next) {
    try {
      if (req.headers.token) {
        let result = await jwt.verify(req.headers.token, config.get('jwtsecret'));
        let userResult = await userModel.findOne({ _id: result._id });
        if (!userResult) {
          return res.status(404).json({
            responseCode: 404,
            responseMessage: "USER NOT FOUND"
          })
        }
        else {
          if (userResult.status == "BLOCK") {
            return res.status(403).json({
              responseCode: 403,
              responseMessage: "You have been blocked by admin."
            })
          }
          else if (userResult.status == "DELETE") {
            return res.status(401).json({
              responseCode: 401,
              responseMessage: "Your account has been deleted by admin."
            })
          }
          else {
            req.userId = result._id;
            req.userDetails = result
            next();
          }
        }
      } else {
        throw apiError.badRequest(responseMessage.NO_TOKEN);
      }
    } catch (error) {
      return next(error)
    }
  },

  verifyTokenBySocket: (token) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (token) {
          let result = await jwt.verify(token, config.get('jwtsecret'));
          if (result) {
            let userData = await userModel.findOne({ _id: result._id, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userData) {
              reject(apiError.notFound(responseMessage.USER_NOT_FOUND));
            }
            else {
              if (userData.status == status.BLOCK) {
                reject(apiError.forbidden(responseMessage.BLOCK_BY_ADMIN));
              }
              else if (userData.status == status.DELETE) {
                reject(apiError.unauthorized(responseMessage.DELETE_BY_ADMIN));
              }
              else {
                resolve(userData._id);
              }
            }
          }
        } else {
          reject(apiError.badRequest(responseMessage.NO_TOKEN));
        }
      }
      catch (e) {
        reject(e);
      }
    })


  },
  verifyJavaToken: async (req, res, next) => {
    try {
      if (req.headers.token) {
        userModel.findOne({ javaUID: req.headers.token }, (error, result2) => {
          if (error) {
            return next(error)
          }
          else if (!result2) {
            return res.status(404).json({
              responseCode: 404,
              responseMessage: "USER NOT FOUND"
            })
          }
          else {
            if (result2.status == "BLOCKED") {
              return res.status(403).json({
                responseCode: 403,
                responseMessage: "You have been blocked by admin ."
              })
            }
            else if (result2.status == "DELETE") {
              return res.status(401).json({
                responseCode: 401,
                responseMessage: "Your account has been deleted by admin ."
              })
            }
            else {
              req.userId = result2._id;
              req.userDetails = result2;
              next();
            }
          }
        })
        // }
      } else {
        throw apiError.badRequest(responseMessage.NO_TOKEN);
      }
    } catch (error) {
      return next(error);
    }
  },

  apiCallVerify: async (req, res, next) => {
    try {
      if (req.headers.origin) {
        if (req.headers.origin.includes('http://localhost:2018')) {
          req.status = true
          next();
        }else{
          return res.status(404).json({
            responseCode: 404,
            responseMessage: "You don't have permission to access this resource"
          })
        }
      } else if (req.headers.referer) {
        if (req.headers.referer.includes('http://localhost:2018')) {
          req.status = true
          next();
        } else {
          return res.status(404).json({
            responseCode: 404,
            responseMessage: "You don't have permission to access this resource"
          })
        }
      } else {
        return res.status(404).json({
          responseCode: 404,
          responseMessage: "You don't have permission to access this resource"
        })
      }
    } catch (error) {
      return next(error);
    }
  },
}
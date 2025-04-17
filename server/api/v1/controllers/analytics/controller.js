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
import arbitrage from "../../../../enums/arbitrage";
import userType from "../../../../enums/userType";
import { userServices } from '../../services/user';
import directModel from '../../../../models/directarbitrage';
import loopModel from '../../../../models/interLoopArbitrage';
import intraModel from '../../../../models/intraarbitrage';
import triangularModel from '../../../../models/triangular';
import connectedModel from '../../../../models/connectedExchange';
import { triangularServices } from '../../services/triangular';
import { directServices } from '../../services/directarbitrage';
import { intraServices } from '../../services/intraarbitrage';
import { loopServices } from '../../services/looparbitrage';
const { triangularData, triangularAllList, triangularUpdate } = triangularServices;
const { directArbitrageData, directArbitrageList, directArbitrageUpdate } = directServices;
const { intraArbitrageData, intraArbitrageList, intraArbitrageUpdate } = intraServices;
const { loopArbitrageData, loopArbitrageList, loopArbitrageUpdate } = loopServices;
const { findUser, updateUser } = userServices;
export class analyticsController {

    /**
    * @swagger
    * /analytics/arbitrageData:
    *   post:
    *     tags:
    *       - ANALYTICS 
    *     description: List of arbitrage information
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: fromDate
    *         description: From Date
    *         in: formData
    *         required: false
    *       - name: toDate
    *         description: To Date
    *         in: formData
    *         required: false
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async arbitrageData(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let query = { userId: userResult._id, status: { $ne: status.DELETE } }
                if (req.query.fromDate && !req.query.toDate) {
                    query.createdAt = { $gte: req.query.fromDate };
                }
                let options = {
                    page: req.query.page || 1,
                    limit: parseInt(req.query.limit) || 10,
                    sort: { createdAt: -1 }
                };
                var DirectData = await directModel.paginate(query, options);
                var intraData = await intraModel.paginate(query, options);
                var loopData = await loopModel.paginate(query, options);
                var triangularData = await triangularModel.paginate(query, options);
                var connected = await connectedModel.find({ userId: userResult._id, status: status.ACTIVE }).countDocuments();
                let totalProfit = 0;
                let totalLoss = 0;
                let arbitrageStatus = {
                    arbitrageName: ['Triangular', 'Intra', 'Direct', 'Inter_Loop'],
                    completed: [0, 0, 0, 0],
                    pending: [0, 0, 0, 0],
                    cancelled: [0, 0, 0, 0]
                };
                let profitcount = 0;
                let losscount = 0;
                let Totalfuelcharge = 0;
                var highestProfit = { 'profit': 0, 'description': 'N/A' };
                var today = { 'profit': 0, 'timestamp': 'N/A' };
                let sell = { 'Binance': 0, 'Kucoin': 0, 'Cexio': 0, 'Huobi': 0, 'Okex': 0 };
                let buy = { 'Binance': 0, 'Kucoin': 0, 'Cexio': 0, 'Huobi': 0, 'Okex': 0 };
                let arbitrageDistribution = { 'Direct': 0, 'Triangular': 0, 'Intra': 0, 'Inter_Loop': 0 };
                let volumes = { 'Binance': 0, 'Kucoin': 0, 'Cexio': 0, "Huobi": 0, 'Okex': 0 };
                if (triangularData.docs.length != 0) {
                    for (let info of triangularData.docs) {
                        switch (info.arbitrageStatus) {
                            case 'COMPLETED':
                                {
                                    arbitrageStatus.completed[0] += 1;
                                    for (let order of info.strategy) {
                                        if (order.action == 'buy') {
                                            buy[info.exchangeName] += 1
                                            volumes[info.exchangeName] += info.capital

                                        } else if (order.action == 'sell') {
                                            sell[info.exchangeName] += 1
                                            volumes[info.exchangeName] += info.capital
                                        }
                                    }
                                    if (parseFloat(info.filledTotal - info.capital) > 0) {
                                        if (parseFloat(highestProfit.profit) < parseFloat(info.filledTotal - info.capital)) {
                                            highestProfit.profit = info.filledTotal - info.capital
                                            highestProfit.description = arbitrage.TriangularArbitrage
                                            today.profit = info.filledTotal - info.capital;
                                            today.timestamp = info.updatedAt
                                        }
                                        if (info.filledTotal) {
                                            profitcount += 1;
                                            Totalfuelcharge += (parseFloat(info.filledTotal - info.capital) * 20) / 100;
                                            totalProfit += parseFloat(info.filledTotal - info.capital) - Totalfuelcharge;
                                            totalProfit += info.filledTotal - info.capital;
                                            arbitrageDistribution['Triangular'] += info.filledTotal;
                                        }
                                    }
                                    else {
                                        losscount += 1;
                                        totalLoss += info.filledTotal - info.capital;
                                    }
                                    break
                                }
                            case 'PENDING':
                                {
                                    arbitrageStatus.pending[0] += 1;
                                    break
                                }
                            case 'CANCELLED':
                                {
                                    arbitrageStatus.cancelled[0] += 1;
                                    break
                                }
                        }
                    }
                }
                if (intraData.docs.length != 0) {
                    for (let info of intraData.docs) {
                        switch (info.arbitrageStatus) {
                            case 'COMPLETED':
                                {
                                    arbitrageStatus.completed[1] += 1;
                                    totalProfit = totalProfit + info.profit;
                                    for (let order of info.strategy) {
                                        if (order.action == 'buy') {
                                            buy[order.exchange] += 1
                                            volumes[order.exchange] += info.capital
                                        } else if (order.action == 'sell') {
                                            sell[order.exchange] += 1
                                            volumes[order.exchange] += info.capital
                                        }
                                    }
                                    if (info.profit > 0) {
                                        Totalfuelcharge += (info.profit * 20) / 100;
                                        console.log("===================>>164", Totalfuelcharge, info.profit);
                                        totalProfit += info.profit - Totalfuelcharge;
                                        profitcount += 1;
                                        if (parseFloat(highestProfit.profit) < parseFloat(info.profit)) {
                                            highestProfit.profit = info.profit
                                            highestProfit.description = arbitrage.IntraArbitrage
                                            today.profit = info.profit
                                            today.timestamp = info.updatedAt
                                        }
                                    }
                                    else {
                                        totalLoss += info.profit;
                                        losscount += 1;
                                    }
                                    break
                                }
                            case 'PENDING':
                                {
                                    arbitrageStatus.pending[1] += 1;
                                    break
                                }
                            case 'CANCELLED':
                                {
                                    arbitrageStatus.cancelled[1] += 1;
                                    break
                                }
                        }
                    }
                }
                if (DirectData.docs.length != 0) {
                    for (let info of DirectData.docs) {
                        switch (info.arbitrageStatus) {
                            case 'COMPLETED':
                                {
                                    arbitrageStatus.completed[2] += 1;
                                    for (let order of info.strategy) {
                                        if (order.action == 'buy') {
                                            buy[order.exchange] += 1
                                            volumes[order.exchange] += info.capital
                                        } else if (order.action == 'sell') {
                                            sell[order.exchange] += 1
                                            volumes[order.exchange] += info.capital
                                        }
                                    }
                                    if (info.profit > 0) {
                                        Totalfuelcharge += (info.profit * 20) / 100;
                                        totalProfit += info.profit - Totalfuelcharge;
                                        profitcount += 1;
                                        if (parseFloat(highestProfit.profit) < parseFloat(info.profit)) {
                                            highestProfit.profit = info.profit
                                            highestProfit.description = arbitrage.DirectArbitrage
                                            today.profit = info.profit
                                            today.timestamp = info.updatedAt
                                        }
                                    }
                                    else {
                                        totalLoss += info.profit;
                                        profitcount += 1;
                                    }
                                    break
                                }
                            case 'PENDING':
                                {
                                    arbitrageStatus.pending[2] += 1;
                                    break
                                }
                            case 'CANCELLED':
                                {
                                    arbitrageStatus.cancelled[2] += 1;
                                    break
                                }
                        }
                    }
                }
                if (loopData.docs.length != 0) {
                    for (let info of loopData.docs) {
                        switch (info.arbitrageStatus) {
                            case 'COMPLETED':
                                {
                                    arbitrageStatus.completed[3] += 1;
                                    for (let order of info.strategy) {
                                        if (order.action == 'buy') {
                                            buy[info.exchangeName] += 1
                                            volumes[order.exchange] += info.capital
                                        } else if (order.action == 'sell') {
                                            sell[info.exchangeName] += 1
                                            volumes[order.exchange] += info.capital
                                        }
                                    }
                                    if (info.profit > 0) {
                                        Totalfuelcharge += (info.profit * 20) / 100;
                                        totalProfit += info.profit - Totalfuelcharge;
                                        profitcount += 1;
                                        if (parseFloat(highestProfit.profit) < parseFloat(info.profit)) {
                                            highestProfit.profit = info.profit
                                            highestProfit.description = "Inter Loop Arbitrage"
                                            today.profit = info.profit
                                            today.timestamp = info.updatedAt
                                        }
                                    }
                                    else {
                                        totalLoss += info.profit
                                        profitcount += 1;
                                    }
                                    break
                                }
                            case 'PENDING':
                                {
                                    arbitrageStatus.pending[3] += 1;
                                    break
                                }
                            case 'CANCELLED':
                                {
                                    arbitrageStatus.cancelled[3] += 1;
                                    break
                                }
                        }
                    }
                }
                let totalArbitrages = triangularData.total + intraData.total + DirectData.total + loopData.total;
                let successRatio = (profitcount / (profitcount + losscount)) * 100;
                let lossPrecentage = (totalLoss / (totalProfit + totalLoss)) * 100;
                let responseData = {
                    totalArbitrages: totalArbitrages,
                    highestProfit: highestProfit,
                    todayProfit: today,
                    totalProfit: totalProfit,
                    totalLoss: totalLoss,
                    profitcount: profitcount,
                    successRatio: (isFinite(successRatio) == false || isNaN(successRatio) == true) ? 0 : successRatio,
                    lossPrecentage: (isFinite(lossPrecentage) == false || isNaN(lossPrecentage) == true) ? 0 : lossPrecentage,
                    losscount: losscount,
                    Totalfuelcharge: Totalfuelcharge,
                    connectedExchange: connected,
                    volumes: volumes,
                    buy: buy,
                    sell: sell,
                    arbitrageDistribution: arbitrageDistribution,
                    arbitrageStatus: arbitrageStatus
                }
                return res.json(new response(responseData, 'Detail Fetch sucessfully'));
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /analytics/tradingDetails:
    *   get:
    *     tags:
    *       - ANALYTICS
    *     description: Docs for User
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: tradeId
    *         description: 
    *         in: query
    *         required: false
    *       - name: page
    *         description: 
    *         in: query
    *         required: false
    *       - name: limit
    *         description: 
    *         in: query
    *         required: false
    *       - name: fromDate
    *         description: 
    *         in: query
    *         required: false
    *       - name: toDate
    *         description: 
    *         in: query
    *         required: false
    *       - name: arbitrageName
    *         description: 
    *         in: query
    *         type: string
    *         enum: ['Triangular Arbitrage','Direct Arbitrage','Intra Arbitrage','Loop Arbitrage']
    *         required: false
    *       - name: capital
    *         description: 
    *         in: query
    *         type: number
    *         required: false
    *       - name: profit
    *         description: 
    *         in: query
    *         type: number
    *         required: false
    *       - name: arbitrageStatus
    *         description: 
    *         in: query
    *         type: string
    *         enum: ['PENDING','COMPLETED','CANCELLED']
    *         required: false
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async tradingDetails(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                const paginateGood = (array, page_size, page_number) => {
                    return array.slice((page_number - 1) * page_size, page_number * page_size);
                };
                let query = { status: { $ne: status.DELETE }, userId: userResult._id }
                if (req.query.fromDate && !req.query.toDate) {
                    query.createdAt = { $gte: req.query.fromDate };
                }
                if (!req.query.fromDate && req.query.toDate) {
                    query.createdAt = { $lte: req.query.toDate };
                }
                if (req.query.fromDate && req.query.toDate) {
                    query.$and = [{ createdAt: { $gte: req.query.fromDate } }, { createdAt: { $lte: req.query.toDate } }];
                }
                let options = {
                    sort: { createdAt: -1 }
                };
                let resultArray = [];
                let triangularDetails = await triangularAllList(query);
                let directDetails = await directArbitrageList(query);
                let intraDetails = await intraArbitrageList(query);
                let loopDetails = await loopArbitrageList(query);
                if (triangularDetails && triangularDetails.length != 0) {
                    for (let triObject of triangularDetails) {
                        let obj = {
                            tradeId: triObject._id,
                            arbitrageName: arbitrage.TriangularArbitrage,
                            arbitrageStatus: triObject.arbitrageStatus,
                            capital: triObject.capital,
                            profit: 0,
                            createdAt: triObject.createdAt,
                            updatedAt: triObject.updatedAt
                        }
                        if (triObject.profit && triObject.arbitrageStatus == 'COMPLETED') {
                            obj['profit'] = triObject.profit;
                        }
                        else {
                            obj['profit'] = triObject.filledTotal - triObject.capital;
                        }
                        resultArray.push(obj)
                    }
                }
                if (directDetails && directDetails.length != 0) {
                    for (let directObject of directDetails) {
                        let obj = {
                            tradeId: directObject._id,
                            arbitrageName: arbitrage.DirectArbitrage,
                            arbitrageStatus: directObject.arbitrageStatus,
                            capital: directObject.capital,
                            profit: 0,
                            createdAt: directObject.createdAt,
                            updatedAt: directObject.updatedAt
                        }
                        if (directObject.arbitrageStatus == 'COMPLETED' && directObject.profit) {
                            obj['profit'] = directObject.profit;
                        }
                        resultArray.push(obj)
                    }
                }
                if (intraDetails && intraDetails.length != 0) {
                    for (let intraObject of intraDetails) {
                        let obj = {
                            tradeId: intraObject._id,
                            arbitrageName: arbitrage.IntraArbitrage,
                            arbitrageStatus: intraObject.arbitrageStatus,
                            capital: intraObject.capital,
                            profit: 0,
                            createdAt: intraObject.createdAt,
                            updatedAt: intraObject.updatedAt
                        }
                        if (intraObject.arbitrageStatus == 'COMPLETED' && intraObject.profit) {
                            obj['profit'] = intraObject.profit;
                        }
                        resultArray.push(obj)
                    }
                }
                if (loopDetails && loopDetails.length != 0) {
                    for (let loopObject of loopDetails) {
                        let obj = {
                            tradeId: loopObject._id,
                            arbitrageName: arbitrage.LoopArbitrage,
                            arbitrageStatus: loopObject.arbitrageStatus,
                            capital: loopObject.capital,
                            profit: 0,
                            createdAt: loopObject.createdAt,
                            updatedAt: loopObject.updatedAt
                        }
                        if (loopObject.arbitrageStatus == 'COMPLETED' && loopObject.profit) {
                            obj['profit'] = loopObject.profit;
                        }
                        resultArray.push(obj)
                    }
                }
                let filterArray = [];
                if (req.query.arbitrageName) {
                    resultArray.map((o) => {
                        if (o.arbitrageName == req.query.arbitrageName) {
                            filterArray.push(o);
                        }
                    })
                    resultArray = filterArray;
                }
                if (req.query.capital) {
                    resultArray.map((o) => {
                        if (o.capital >= req.query.capital) {
                            filterArray.push(o);
                        }
                    })
                    resultArray = filterArray;
                }
                if (req.query.profit) {
                    resultArray.map((o) => {
                        if (o.profit >= req.query.profit) {
                            filterArray.push(o);
                        }
                    })
                    resultArray = filterArray;
                }
                if (req.query.arbitrageStatus) {
                    resultArray.map((o) => {
                        if (o.arbitrageStatus == req.query.arbitrageStatus) {
                            filterArray.push(o);
                        }
                    })
                    resultArray = filterArray;
                }
                if (req.query.tradeId) {
                    resultArray.map((o) => {
                        if (o.tradeId == req.query.tradeId) {
                            filterArray.push(o);
                        }
                    })
                    resultArray = filterArray;
                }
                let options2 = {
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 10,
                }
                let properResult = {
                    docs: paginateGood(resultArray, options2.limit, options2.page),
                    total: resultArray.length,
                    limit: options2.limit,
                    page: options2.page,
                    pages: Math.ceil(resultArray.length / options2.limit)
                }
                if (properResult.docs.length != 0) {
                    return res.json(new response(properResult, 'Trade details fetched successfully.'));
                }
                else {
                    throw apiError.notFound('Trade details not found.');
                }
            }
        }
        catch (error) {
            console.log('532 ==>', error);
            return next(error);
        }
    }

    /**
     * @swagger
     * /analytics/tradingView:
     *   get:
     *     tags:
     *       - ANALYTICS
     *     description: Docs for ADMIN
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: User token
     *         in: header
     *         required: true
     *       - name: tradeId
     *         description: tradeId from tradingDetails
     *         in: query
     *         required: true
     *       - name: arbitrageName
     *         description: arbitrageName from tradingDetails
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async tradingView(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                if (req.query.arbitrageName && req.query.tradeId) {
                    let result;
                    if (req.query.arbitrageName == arbitrage.TriangularArbitrage) {
                        result = await triangularData({ _id: req.query.tradeId, status: { $ne: status.DELETE } });
                    }
                    if (req.query.arbitrageName == arbitrage.DirectArbitrage) {
                        result = await directArbitrageData({ _id: req.query.tradeId, status: { $ne: status.DELETE } });
                    }
                    if (req.query.arbitrageName == arbitrage.IntraArbitrage) {
                        result = await intraArbitrageData({ _id: req.query.tradeId, status: { $ne: status.DELETE } });
                    }
                    if (req.query.arbitrageName == arbitrage.LoopArbitrage) {
                        result = await loopArbitrageData({ _id: req.query.tradeId, status: { $ne: status.DELETE } });
                    }
                    return res.json(new response(result, 'Details fetched successfully.'));
                }
                else if (!req.query.arbitrageName && req.query.tradeId) {
                    throw apiError.badRequest('Please provide arbitrage name.');
                }
                else if (req.query.arbitrageName && !req.query.tradeId) {
                    throw apiError.badRequest('Please provide trade id.');
                }
                else if (!req.query.arbitrageName && !req.query.tradeId) {
                    throw apiError.badRequest('Please provide arbitrage name and trade id.');
                }
            }
        }
        catch (error) {
            console.log('598 ==>', error);
            return next(error);
        }
    }
}
export default new analyticsController()

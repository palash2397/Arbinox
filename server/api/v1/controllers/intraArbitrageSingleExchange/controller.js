import Joi from "joi";
import Mongoose from "mongoose";
import _ from "lodash";
import config from "config";
import apiError from '../../../../helper/apiError';
import response from '../../../../../assets/response';
import responseMessage from '../../../../../assets/responseMessage';
import commonFunction from '../../../../helper/util';
import jwt from 'jsonwebtoken';
import status from '../../../../enums/status';
import auth from "../../../../helper/auth"
import { getAccount } from "../../../../helper/getAccount"
import arbitrage from "../../../../enums/arbitrage";
import userType from "../../../../enums/userType";
import { userServices } from '../../services/user';
import { walletServices } from '../../services/wallet';
import { intraAbitrageSingleExchangeServices } from '../../services/intraArbitrageSingleExchange.js';
import { profitPathServices } from '../../services/profitpath';
import { autoTradeServices } from '../../services/autoTrade ';
import { notificationServices } from '../../services/notification';
import cancelled from '../../../../helper/buySell';
import { sniperBotServices } from '../../services/sniperBot'
const { findUser, updateUser } = userServices;
const { exchangeList, exchangeData, connectedExchangeData, connectedExchangeList, connectedExchangeUpdate, connectedExchangeCreate } = walletServices;
const { intraArbitrageSingleExchangeCreate, intraArbitrageSingleExchangeData, intraArbitrageSingleExchangeList, intraArbitrageSingleExchangeUpdate, intraArbitrageSingleExchangeArbitrageListWithPaginate } = intraAbitrageSingleExchangeServices;
const { profitpatheList } = profitPathServices;
const { autoTradeCreate, autoTradeData, autoTradeUpdate } = autoTradeServices;
const { notificationCreate, notificationData, notificationUpdate } = notificationServices;
const { sniperCreate, sniperList, sniperData, sniperUpdate } = sniperBotServices;
import { buySubsciptionPlanHistoryServices } from "../../services/buySubscriptionPlanHistory";
const { buySubsciptionPlanCount, buySubsciptionPlanCreate, buySubscriptionhPlanList, buySubscriptionPlanList, buySubsciptionPlanData, buySubsciptionPlanUpdate, lastedBuyPlan } = buySubsciptionPlanHistoryServices
import { rebalancingTradeServices } from "../../services/rebalancingTrade"
const { rebalancingTradeCreate, rebalancingTradeList, rebalancingTradeData, rebalancingTradeUpdate } = rebalancingTradeServices
export class intraAbritrageSingleExchangeController {

    /**
    * @swagger
    * /intraArbitrageSingleExchange/filterProfitPaths:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of intra arbitrage single exchange profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: findProfitPath
    *         description: profitPath
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/intraSingleExchangeFilterProfitPaths'
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async filterProfitPaths(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let query = { arbitrageName: arbitrage.IntraArbitrageSingleExchange, status: "ACTIVE" };
                if (req.body.uid) {
                    let exchangeLists = [];
                    let exchangeDetails = await exchangeList({ uid: { $in: req.body.uid } });
                    exchangeDetails.map(exchange => exchangeLists.push(exchange.exchangeName))
                    query.exchange = exchangeLists;
                }
                let profitPatheDetails = await profitpatheList(query);
                if (profitPatheDetails.length == 0) {
                    throw apiError.notFound(responseMessage.PROFIT_PATH_NOT_FOUND);
                }
                let totalProfitPaths = [];
                for (let exchangePaths of profitPatheDetails) {
                    if (exchangePaths.path) {
                        for (let pathObj of exchangePaths['path']) {
                            pathObj['exchangeName'] = exchangePaths.exchange;
                            if (req.body.capital) {
                                pathObj.profit = pathObj.profit / pathObj.capital * req.body.capital;
                                pathObj.capital = req.body.capital;
                            }
                            if (req.body.coins && (req['body']['coins'].includes(pathObj.pair) || req['body']['coins'].includes(pathObj.start))) {
                                totalProfitPaths.push(pathObj);
                            }
                            else if (!req.body.coins) {
                                totalProfitPaths.push(pathObj);
                            }
                        }
                    }
                }
                if (req.body.profit) {
                    totalProfitPaths = totalProfitPaths.filter(o => o.profit > Number(req.body.profit))
                }
                if (!totalProfitPaths || totalProfitPaths.length == 0) {
                    throw apiError.notFound(`Data not found for Intra arbitrage single exchange`);
                } else {
                    totalProfitPaths.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
                    if (totalProfitPaths.length > 30) {
                        totalProfitPaths = totalProfitPaths.slice(0, 30);
                    }
                    return res.json(new response(totalProfitPaths, `Details fetched.`));
                }
            }
        } catch (error) {
            console.log('102 error ==>', error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/autoTradeOnOff:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of intra arbitrage single exchange profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: findProfitPath
    *         description: profitPath
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/intraSingleExchangeautoTradeOnOff'
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async autoTradeOnOff(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                if (userResult.autoTrade.intraSingleExchange == true) {
                    let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.intraSingleExchange': false, 'autoTradePlaceCount.intraSingleExchange': 0 });
                    if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched off successfully.`)); }
                }
                else if (userResult.autoTrade.intraSingleExchange == false) {
                    let connectedExchangeDetails = await connectedExchangeList({ userId: userResult._id, status: "ACTIVE" });
                    let connectedList = [];
                    let nonConnectedList = [];
                    let exchangeWithSetBalance = [];
                    let exchangeWithLowBalance = [];
                    if (req.body.capital) {
                        if (req['body']['exchangeUID'] && req['body']['exchangeUID'].length != 0) {
                            for (let exchange of connectedExchangeDetails) {
                                if (req['body']['exchangeUID'].includes(exchange['uid'])) {
                                    let exchangeName = (await exchangeData({ uid: exchange['uid'], status: "ACTIVE" }))['exchangeName'];
                                    let accountBalances = await getAccount(exchangeName, exchange.apiKey, exchange.secretKey, exchange.passphrase, exchange.customerId, userResult._id);
                                    let usdtBalance = accountBalances.filter(function (entry) { return (entry['asset'] === "USDT" || entry.asset === "BTC" || entry.asset === "ETH"); });
                                    if (usdtBalance.length != 0) {
                                        let filterCapitalAmount = usdtBalance.filter(item => Number(item.total) > Number(req.body.capital));
                                        if (filterCapitalAmount.length != 0) {
                                            exchangeWithSetBalance.push(exchange['uid']);
                                        }
                                    }
                                    else {
                                        exchangeWithLowBalance.push(exchange['uid']);
                                    }
                                    connectedList.push(exchange['uid']);

                                }
                            }
                            for (let uid of req['body']['exchangeUID']) {
                                if (connectedList.includes(uid) == false) {
                                    nonConnectedList.push(uid);
                                }
                            }
                            if (nonConnectedList.length == 0) {
                                if (exchangeWithLowBalance.length == 0 && exchangeWithSetBalance.length != 0) {
                                    let autoTradeDetails = await autoTradeData({ userId: userResult._id, arbitrageName: 'IntraSingleExchange' });
                                    let autoTradeObj = {
                                        userId: userResult._id,
                                        arbitrageName: 'IntraSingleExchange',
                                        exchangeUID: req.body.exchangeUID,
                                        capital: req.body.capital,
                                        maxThreshold: req.body.maxThreshold,
                                        minThreshold: req.body.minThreshold,
                                        fromCoin: req.body.fromCoin,
                                        toCoin: req.body.toCoin,
                                    }
                                    if (!autoTradeDetails) {
                                        let autoTradeCreated = await autoTradeCreate(autoTradeObj);
                                        if (autoTradeCreated) {
                                            let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.intraSingleExchange': true });
                                            if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched on successfully.`)); }
                                        }
                                    }
                                    else {
                                        let autoTradeUpdated = await autoTradeUpdate({ _id: autoTradeDetails._id }, { $set: autoTradeObj });
                                        if (autoTradeUpdated) {
                                            let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.intraSingleExchange': true });
                                            if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched on successfully.`)); }
                                        }
                                    }
                                }
                                else {
                                    throw apiError.badRequest(`Please check ${exchangeWithLowBalance} account have a minimum ${req.body.capital} balance in USD/USDT/USDC coin or choose another exchange account to start the bot.`);
                                }
                            }
                            else {
                                throw apiError.notFound(`Please connect ${nonConnectedList} exchanges.`);
                            }
                        }
                        else {
                            throw apiError.badRequest(`Please select minimum one exchange.`);
                        }
                    }
                    else {
                        throw apiError.badRequest('Please provide capital value.');
                    }
                }
            }
        } catch (error) {
            console.log('250 error ==>', error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/viewPlacedTrade/{_id}:
    *   get:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of intra arbitrage single exchange profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of placed intra arbitrage single exchange
    *         in: path
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async viewPlacedTrade(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let query = { _id: req.params._id, userId: userResult._id, status: { $ne: "DELETE" } }
                let intraSingleExchangeDetails = await intraArbitrageSingleExchangeData(query);
                if (!intraSingleExchangeDetails) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    return res.json(new response(intraSingleExchangeDetails, responseMessage.INTRA_DETAILS));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/activeBlockPlacedTrade:
    *   put:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of intra arbitrage single exchange profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of placed intra arbitrage single exchange 
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async activeBlockPlacedTrade(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let query = { _id: req.body._id, userId: userResult._id, status: { $ne: "DELETE" } }
                let intraSingleExchangeDetails = await intraArbitrageSingleExchangeData(query);
                if (!intraSingleExchangeDetails) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    if (intraSingleExchangeDetails.status == 'ACTIVE') {
                        let updateArbitrage = await intraArbitrageSingleExchangeUpdate({ _id: intraSingleExchangeDetails._id }, { $set: { status: "BLOCK" } });
                        return res.json(new response(updateArbitrage, responseMessage.TRIANGULAR_TRADE_BLOCKED));
                    }
                    else if (intraSingleExchangeDetails.status == 'BLOCK') {
                        let updateArbitrage = await intraArbitrageSingleExchangeUpdate({ _id: intraSingleExchangeDetails._id }, { $set: { status: "ACTIVE" } });
                        return res.json(new response(updateArbitrage, responseMessage.TRIANGULAR_TRADE_UNBLOCKED));
                    }
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/deletePlacedTrade:
    *   delete:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of intra arbitrage single exchange profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of placed intra arbitrage single exchange
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async deletePlacedTrade(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let query = { _id: req.body._id, userId: userResult._id, status: { $ne: "DELETE" } }
                let intraSingleExchangeDetails = await intraArbitrageSingleExchangeData(query);
                if (!intraSingleExchangeDetails) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    let updateArbitrage = await intraArbitrageSingleExchangeUpdate({ _id: intraSingleExchangeDetails._id }, { $set: { status: "DELETE" } });
                    return res.json(new response([], responseMessage.DELETE_SUCCESS));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/cancelledOrder/{_id}:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: INTRA ARBITRAGE SINGLE
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of intra exchange
    *         in: path
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async cancelledOrder(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let intraSingleExchangedata = await intraArbitrageSingleExchangeData({ _id: req.params._id, userId: userResult._id, arbitrageStatus: "PENDING", status: status.ACTIVE });
                if (intraSingleExchangedata) {
                    for (let trade of intraSingleExchangedata.strategy) {
                        if (trade.isActive == true && trade.isTrade == false) {
                            var exchangedata = (await exchangeData({ exchangeName: intraSingleExchangedata.exchangeName }))['_doc']['uid'];
                            var connecteddata = await connectedExchangeData({ uid: exchangedata, _id: intraSingleExchangedata.connectedExchangeId });
                            var canceldata = await cancelled.cancelOrder(intraSingleExchangedata.exchangeName, trade.coinName, trade.orderId, connecteddata.apiKey, connecteddata.secretKey, connecteddata.passphrase, connecteddata.customerId, connecteddata.apiMemo, trade.baseCurrency, trade.quoteCurrency);
                            if (canceldata.status == true) {
                                let updateStatus = await intraArbitrageSingleExchangeUpdate({ _id: intraSingleExchangedata._id }, { $set: { arbitrageStatus: 'CANCELLED', status: status.CANCELLED } });
                                return res.json(new response(updateStatus, 'Intra Arbitrage order cancelled Sucessfully'));
                            }
                            else if (canceldata.status == false) {
                                let orderObj = {
                                    arbitrageId: intraSingleExchangedata._id,
                                    userId: userResult._id,
                                    title: canceldata.error
                                }
                                let notification = await notificationCreate(orderObj);
                                throw apiError.notFound("Placed arbitrage order not cancelled.");
                            }
                        }
                        else if (trade.isActive == false && trade.isTrade == false) {
                            // throw apiError.notFound('Order not on trade');
                            let updateStatus = await intraArbitrageSingleExchangeUpdate({ _id: intraSingleExchangedata._id }, { $set: { arbitrageStatus: 'CANCELLED', status: status.CANCELLED } });
                            return res.json(new response(updateStatus, 'Intra Arbitrage order cancelled Sucessfully'));
                        }
                    }
                }
                else {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/tradeProfitPaths:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of intra arbitrage single profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: tradeProfitPath
    *         description: trade profit path
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/intraSingleExchangeTradePaths'
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async tradeProfitPaths(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                if (userResult.userType != userType.ADMIN) {
                    let checkSubscriptionPlan = await buySubsciptionPlanData({ userId: userResult._id, planStatus: "ACTIVE" })
                    if (!checkSubscriptionPlan) {
                        throw apiError.notFound(responseMessage.NOT_AVAILABLE_SUBSCRIPTION_PLAN);
                    }
                    if (!(checkSubscriptionPlan.exchanges).includes(req.body.exchangeName)) {
                        throw apiError.notFound(responseMessage.NOT_AVAILABLE_EXCHANGE);
                    }
                    if (!(checkSubscriptionPlan.pairs).includes((req.body.strategy[0].baseCurrency).toLowerCase())) {
                        throw apiError.notFound(responseMessage.NOT_AVAILABLE_PAIRS);
                    }
                }
                let exchangeDetails = await exchangeData({ exchangeName: req.body.exchangeName });
                let connectedExchangeDetails = await connectedExchangeData({ uid: exchangeDetails.uid, userId: userResult._id, status: status.ACTIVE });
                let exchangeName = exchangeDetails.exchangeName;
                if (connectedExchangeDetails) {
                    let accountBalances = await getAccount(exchangeName, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, userResult._id, connectedExchangeDetails.apiMemo);
                    let usdtBalance = accountBalances.find(function (entry) { return (entry.asset === req.body.start); });//req.body.start
                    if (!usdtBalance) {
                        throw apiError.badRequest(responseMessage.BALANCE_INSUFFICIENT);
                    }
                    if (Number(req.body.capital) >= Number(usdtBalance['free'])) {
                        throw apiError.badRequest(responseMessage.BALANCE_INSUFFICIENT);
                    }
                    if (req.body.capital > 0) {
                        let strategy = req.body.strategy;
                        req.body.strategy = strategy.map(function (el) {
                            var o = Object.assign({}, el);
                            o.isActive = false;
                            o.isTrade = false;
                            o.orderId = '';
                            o.status = '';
                            o.coinName = Object.keys(el)[0];
                            o.action = Object.values(el)[0];
                            return o;
                        });
                        let intraSingleExchangeArbitrage = await intraArbitrageSingleExchangeData({ userId: userResult._id, strategy: req.body.strategy, status: "ACTIVE", arbitrageStatus: "PENDING", });
                        if (intraSingleExchangeArbitrage) {
                            throw apiError.alreadyExist(responseMessage.INTRA_TRADE_ALREADY_EXIST);
                        } else {
                            req.body.exchangeName = exchangeName;
                            req.body.userId = userResult._id;
                            req.body.connectedExchangeId = connectedExchangeDetails._id;
                            let saveResult = await intraArbitrageSingleExchangeCreate(req.body);
                            if (saveResult) {
                                return res.json(new response(saveResult, responseMessage.INTRA_TRADE_PLACED));
                            }
                        }
                    }
                    else {
                        throw apiError.badRequest('Please check your capital may be greater than to $0.');
                    }
                }
                else if (!connectedExchangeDetails) {
                    throw apiError.notFound(`${exchangeName} exchange not connected.`);
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/listPlacedTradeWithFilter:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of Intra single exchange place trade
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: arbitrageStatus
    *         description: arbitrageStatus (CANCELLED/COMPLETED/PENDING)
    *         in: formData
    *         required: false
    *       - name: arbitrageType
    *         description: arbitrageType (MANUAL/AUTO/SNIPER)
    *         in: formData
    *         required: false
    *       - name: fromDate
    *         description: fromDate
    *         in: formData
    *         required: false
    *       - name: toDate
    *         description: toDate
    *         in: formData
    *         required: false
    *       - name: page
    *         description: page
    *         in: formData
    *         required: false
    *       - name: limit
    *         description: limit
    *         in: formData
    *         required: false
    *       - name: sorting
    *         description: sorting (ASC,DESC)
    *         in: formData
    *         required: false
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async listPlacedTradeWithFilter(req, res, next) {
        const validationSchema = {
            arbitrageStatus: Joi.string().allow(null).optional(),
            fromDate: Joi.string().allow(null).optional(),
            toDate: Joi.string().allow(null).optional(),
            page: Joi.string().allow(null).optional(),
            limit: Joi.string().allow(null).optional(),
            sorting: Joi.string().allow(null).optional(),
            arbitrageType: Joi.string().allow(null).optional()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                validatedBody.userId = userResult._id
                let intraSingleExchangeArbitrageList = await intraArbitrageSingleExchangeArbitrageListWithPaginate(validatedBody);
                if (intraSingleExchangeArbitrageList.docs.length == 0) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    return res.json(new response(intraSingleExchangeArbitrageList, responseMessage.DATA_FOUND));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/listPlacedTradeWithFilterForParticularUser:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of Intra single exchange place trade
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: userId
    *         description: userId
    *         in: formData
    *         required: true
    *       - name: arbitrageStatus
    *         description: arbitrageStatus (CANCELLED/COMPLETED/PENDING)
    *         in: formData
    *         required: false
    *       - name: arbitrageType
    *         description: arbitrageType (MANUAL/AUTO/SNIPER)
    *         in: formData
    *         required: false
    *       - name: fromDate
    *         description: fromDate
    *         in: formData
    *         required: false
    *       - name: toDate
    *         description: toDate
    *         in: formData
    *         required: false
    *       - name: page
    *         description: page
    *         in: formData
    *         required: false
    *       - name: limit
    *         description: limit
    *         in: formData
    *         required: false
    *       - name: sorting
    *         description: sorting (ASC,DESC)
    *         in: formData
    *         required: false
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async listPlacedTradeWithFilterForParticularUser(req, res, next) {
        const validationSchema = {
            userId: Joi.string().required(),
            arbitrageStatus: Joi.string().allow(null).optional(),
            fromDate: Joi.string().allow(null).optional(),
            toDate: Joi.string().allow(null).optional(),
            page: Joi.string().allow(null).optional(),
            limit: Joi.string().allow(null).optional(),
            sorting: Joi.string().allow(null).optional(),
            arbitrageType: Joi.string().allow(null).optional()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            else {
                let userInfo = await findUser({ _id: validatedBody.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
                if (!userInfo) {
                    throw apiError.notFound(responseMessage.USER_NOT_FOUND);
                }
                validatedBody.userId = userInfo._id
                let intraSingleExchangeArbitrageList = await intraArbitrageSingleExchangeArbitrageListWithPaginate(validatedBody);
                if (intraSingleExchangeArbitrageList.docs.length == 0) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    return res.json(new response(intraSingleExchangeArbitrageList, responseMessage.DATA_FOUND));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    async filterProfitPathsWebSocket(token, uid, capital, coins, profit) {
        let responses;
        try {
            return new Promise(async (resolve, reject) => {
                let userId = await auth.verifyTokenBySocket(token);
                let userResult = await findUser({ _id: userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
                if (!userResult) {
                    responses = ({ responseCode: 404, responseMessage: "USER_NOT_FOUND", responseResult: [] });
                    resolve(responses)
                }
                else {
                    let query = { arbitrageName: arbitrage.IntraArbitrageSingleExchange, status: "ACTIVE" };
                    if (uid) {
                        let exchangeLists = [];
                        let exchangeDetails = await exchangeList({ uid: { $in: uid } });
                        exchangeDetails.map(exchange => exchangeLists.push(exchange.exchangeName))
                        query.exchange = exchangeLists;
                    }
                    let profitPatheDetails = await profitpatheList(query);
                    if (profitPatheDetails.length == 0) {
                        responses = ({ responseCode: 404, responseMessage: "PROFIT_PATH_NOT_FOUND", responseResult: [] });
                        resolve(responses)
                    }
                    let totalProfitPaths = [];
                    for (let exchangePaths of profitPatheDetails) {
                        if (exchangePaths.path) {
                            for (let pathObj of exchangePaths['path']) {
                                pathObj['exchangeName'] = exchangePaths.exchange;
                                if (capital) {
                                    pathObj.profit = pathObj.profit / pathObj.capital * capital;
                                    pathObj.capital = capital;
                                }
                                if (coins && (coins.includes(pathObj.pair) || coins.includes(pathObj.start))) {
                                    totalProfitPaths.push(pathObj);
                                }
                                else if (!coins) {
                                    totalProfitPaths.push(pathObj);
                                }
                            }
                        }
                    }
                    if (profit) {
                        totalProfitPaths = totalProfitPaths.filter(o => Number(o.profit) > Number(profit))
                    }
                    if (!totalProfitPaths || totalProfitPaths.length == 0) {
                        responses = ({ responseCode: 404, responseMessage: "PROFIT_PATH_NOT_FOUND", responseResult: [] });
                        resolve(responses)
                    } else {
                        totalProfitPaths.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
                        if (totalProfitPaths.length > 30) {
                            totalProfitPaths = totalProfitPaths.slice(0, 30);
                        }
                        responses = ({ responseCode: 200, responseMessage: "PROFIT_PATH_NOT_FOUND", responseResult: totalProfitPaths });
                        resolve(responses)
                    }
                }
            })

        } catch (error) {
            responses = (error);
            reject(responses)
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/getDataAutoTradeOnOff:
    *   get:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of intra arbitrage single profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async getDataAutoTradeOnOff(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                if (userResult.autoTrade.intraSingleExchange == true) {
                    let autoTradeDetails = await autoTradeData({ userId: userResult._id, arbitrageName: 'IntraSingleExchange' });
                    if (autoTradeDetails) { return res.json(new response(autoTradeDetails, responseMessage.DATA_FOUND)); }
                }
                else if (userResult.autoTrade.intraSingleExchange == false) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                }
            }
        } catch (error) {
            console.log('202 error ==>', error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/sniperBotOnOff:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: On off sniper bot
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: findProfitPath
    *         description: profitPath
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/sniperBotIntraSingleExchangeOnOff'
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async sniperBotOnOff(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                if (userResult.sniperBot.intraSingleExchange == true) {
                    let updatedUser = await updateUser({ _id: userResult._id }, { 'sniperBot.intraSingleExchange': false, });
                    if (updatedUser) { return res.json(new response(updatedUser, `Sniper bot switched off successfully.`)); }
                }
                else if (userResult.sniperBot.intraSingleExchange == false) {
                    let connectedExchangeDetails = await connectedExchangeList({ userId: userResult._id, status: "ACTIVE" });
                    let connectedList = [];
                    let nonConnectedList = [];
                    let exchangeWithSetBalance = [];
                    let exchangeWithLowBalance = [];
                    if (req.body.capital) {
                        if (req['body']['exchangeUID'] && req['body']['exchangeUID'].length != 0) {
                            for (let exchange of connectedExchangeDetails) {
                                if (req['body']['exchangeUID'].includes(exchange['uid'])) {
                                    let exchangeName = (await exchangeData({ uid: exchange['uid'], status: "ACTIVE" }))['exchangeName'];
                                    let accountBalances = await getAccount(exchangeName, exchange.apiKey, exchange.secretKey, exchange.passphrase, exchange.customerId, userResult._id);
                                    let usdtBalance = accountBalances.filter(function (entry) { return (entry['asset'] === "USDT" || entry.asset === "ETH" || entry.asset === "BTC"); });
                                    if (usdtBalance.length != 0) {
                                        let filterCapitalAmount = usdtBalance.filter(item => Number(item.total) > Number(req.body.capital));
                                        if (filterCapitalAmount.length != 0) {
                                            exchangeWithSetBalance.push(exchange['uid']);
                                        }
                                    }
                                    else {
                                        exchangeWithLowBalance.push(exchange['uid']);
                                    }
                                    connectedList.push(exchange['uid']);

                                }
                            }
                            for (let uid of req['body']['exchangeUID']) {
                                if (connectedList.includes(uid) == false) {
                                    nonConnectedList.push(uid);
                                }
                            }
                            if (nonConnectedList.length == 0) {
                                if (exchangeWithLowBalance.length == 0 && exchangeWithSetBalance.length != 0) {
                                    let sniperBotDetails = await sniperData({ userId: userResult._id, arbitrageName: 'IntraSingleExchange' });
                                    let sniperBotObj = {
                                        userId: userResult._id,
                                        arbitrageName: 'IntraSingleExchange',
                                        exchangeUID: req.body.exchangeUID,
                                        capital: req.body.capital,
                                        maxThreshold: req.body.maxThreshold,
                                        minThreshold: req.body.minThreshold,
                                        fromCoin: req.body.fromCoin,
                                        toCoin: req.body.toCoin,
                                        orderType: req.body.orderType,
                                        numberOfTrade: req.body.numberOfTrade,
                                        isNumberOfTradeActive: req.body.isNumberOfTradeActive
                                    }
                                    if (!sniperBotDetails) {
                                        let sniperBotCreated = await sniperCreate(sniperBotObj);
                                        if (sniperBotCreated) {
                                            let updatedUser = await updateUser({ _id: userResult._id }, { 'sniperBot.intraSingleExchange': true });
                                            if (updatedUser) { return res.json(new response(updatedUser, `Sniper bot switched on successfully.`)); }
                                        }
                                    }
                                    else {
                                        let sniperbotUpdated = await sniperUpdate({ _id: sniperBotDetails._id }, { $set: sniperBotObj });
                                        if (sniperbotUpdated) {
                                            let updatedUser = await updateUser({ _id: userResult._id }, { 'sniperBot.intraSingleExchange': true });
                                            if (updatedUser) { return res.json(new response(updatedUser, `Sniper bot switched on successfully.`)); }
                                        }
                                    }
                                }
                                else {
                                    throw apiError.badRequest(`Please check ${exchangeWithLowBalance} account have a minimum ${req.body.capital} balance in BTC/USDT/ETH coin or choose another exchange account to start the bot.`);
                                }
                            }
                            else {
                                throw apiError.notFound(`Please connect ${nonConnectedList} exchanges.`);
                            }
                        }
                        else {
                            throw apiError.badRequest(`Please select minimum one exchange.`);
                        }
                    }
                    else {
                        throw apiError.badRequest('Please provide capital value.');
                    }
                }
            }
        } catch (error) {
            console.log('250 error ==>', error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/getDataSniperBotOnOff:
    *   get:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: Get sniper bot data
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async getDataSniperBotOnOff(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                if (userResult.sniperBot.intraSingleExchange == true) {
                    let sniperBotDetails = await sniperData({ userId: userResult._id, arbitrageName: 'IntraSingleExchange' });
                    if (sniperBotDetails) { return res.json(new response(sniperBotDetails, responseMessage.DATA_FOUND)); }
                }
                else if (userResult.sniperBot.intraSingleExchange == false) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                }
            }
        } catch (error) {
            console.log('853 error ==>', error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/rebalancingTrade:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: rebalancingTrade
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: Admin token
    *         in: header
    *         required: true
    *       - name: intraSingleExchangeRebalancingTrade
    *         description: intraSingleExchangeRebalancingTrade arbitrage Name[IntraSingleExchange]
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/intraSingleExchangeRebalancingTrade'
    *     responses:
    *       200:
    *         description: IP address fetched.
    */
    async rebalancingTrade(req, res, next) {
        const validationSchema = {
            waitingTime: Joi.string().required(),
            arbitrageName: Joi.string().required(),
            rebalancingNumber: Joi.string().required(),
        };
        try {
            let validateBody = await Joi.validate(req.body, validationSchema)
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.ADMIN, userType.USER, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.USER_NOT_FOUND);
            }
            let rebalancingTradeDataRes = await rebalancingTradeData({ arbitrageName: validateBody.arbitrageName, userId: userResult._id })
            if (rebalancingTradeDataRes) {
                if (rebalancingTradeDataRes.isRebalancingActive == true) {
                    let [updateRes, updatedUser] = await Promise.all([rebalancingTradeUpdate({ _id: rebalancingTradeDataRes._id }, { isRebalancingActive: false }), updateUser({ _id: userResult._id }, { 'rebalancingTrade.intraSingleExchange': false, })])
                    return res.json(new response(updateRes, responseMessage.REBALANCEOFF))
                }
                let [updateRes, updatedUser] = await Promise.all([rebalancingTradeUpdate({ _id: rebalancingTradeDataRes._id }, { isRebalancingActive: true, arbitrageName: validateBody.arbitrageName, waitingTime: validateBody.waitingTime, rebalancingNumber: validateBody.rebalancingNumber }), updateUser({ _id: userResult._id }, { 'rebalancingTrade.intraSingleExchange': true, })])
                return res.json(new response(updateRes, responseMessage.REBALANCEON))
            }
            let obj = {
                isRebalancingActive: true,
                arbitrageName: validateBody.arbitrageName,
                waitingTime: validateBody.waitingTime,
                userId: userResult._id,
                rebalancingNumber: validateBody.rebalancingNumber
            }
            let [createRes, updatedUser] = await Promise.all([rebalancingTradeCreate(obj), updateUser({ _id: userResult._id }, { 'rebalancingTrade.intraSingleExchange': true, })])
            return res.json(new response(createRes, responseMessage.REBALANCEON))
        } catch (error) {
            // logger.error(error)
            console.log('server time catch ===>>', error.message)
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/getDataRebalancingBotOnOff:
    *   get:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: Get sniper bot data
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async getDataRebalancingBotOnOff(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                if (userResult.rebalancingTrade.intraSingleExchange == true) {
                    let rebalancingBotDetails = await rebalancingTradeData({ userId: userResult._id, arbitrageName: 'IntraSingleExchange' });
                    if (rebalancingBotDetails) { return res.json(new response(rebalancingBotDetails, responseMessage.DATA_FOUND)); }
                }
                else if (userResult.rebalancingTrade.intraSingleExchange == false) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                }
            }
        } catch (error) {
            console.log('853 error ==>', error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /intraArbitrageSingleExchange/updatePlacedTrade:
    *   put:
    *     tags:
    *       - INTRA ARBITRAGE SINGLE
    *     description: List of intra arbitrage single exchange profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of placed intra arbitrage single exchange
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async updatePlacedTrade(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let query = { _id: req.body._id, userId: userResult._id, status: { $ne: "DELETE" } }
                let intraSingleExchangeDetails = await intraArbitrageSingleExchangeData(query);
                if (!intraSingleExchangeDetails) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    let updateArbitrage = await intraArbitrageSingleExchangeUpdate({ _id: intraSingleExchangeDetails._id }, { $set: { status: "ACTIVE", arbitrageStatus: "PENDING" } });
                    return res.json(new response(updateArbitrage, responseMessage.UPDATE_ORDER_STATUS));
                }
            }
        } catch (error) {
            return next(error);
        }
    }
}

export default new intraAbritrageSingleExchangeController()
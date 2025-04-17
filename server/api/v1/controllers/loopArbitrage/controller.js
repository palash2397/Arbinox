import Joi from "joi";
import Mongoose from "mongoose";
import _ from "lodash";
import config from "config";
import apiError from '../../../../helper/apiError';
import response from '../../../../../assets/response';
import bcrypt from 'bcryptjs';
import responseMessage from '../../../../../assets/responseMessage';
import commonFunction from '../../../../helper/util';
import { getAccount } from '../../../../helper/getAccount';
import jwt from 'jsonwebtoken';
import status from '../../../../enums/status';
import auth from "../../../../helper/auth"
import arbitrage from "../../../../enums/arbitrage";
import userType from "../../../../enums/userType";
import { userServices } from '../../services/user';
import { walletServices } from '../../services/wallet';
import { profitPathServices } from '../../services/profitpath';
import { loopServices } from '../../services/looparbitrage';
import { autoTradeServices } from '../../services/autoTrade ';
import arbitragefunction from '../../../../helper/arbitrage';
import { orderkeyA, orderkeyB, orderkeyC } from '../../../../helper/interloop_arbitrage_key';
import { notificationServices } from '../../services/notification'
import cancelled from '../../../../helper/buySell';
const { findUser, updateUser } = userServices;
const { exchangeList, exchangeData, connectedExchangeData, connectedExchangeUpdate, connectedExchangeCreate, connectedExchangeList } = walletServices;
const { profitpathCreate, profitpatheList, profitpathData, profitpathUpdate } = profitPathServices;
const { loopArbitrageCreate, loopArbitrageList, loopArbitrageData, loopArbitrageUpdate, loopArbitrageListWithPaginate } = loopServices;
const { autoTradeCreate, autoTradeList, autoTradeData, autoTradeUpdate } = autoTradeServices;
const { notificationCreate, notificationData, notificationList, notificationUpdate, multiUpdateNotification } = notificationServices;

export class loopController {
    /**
    * @swagger
    * /loopArbitrage/profitPaths:
    *   post:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description:  arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: profitPath
    *         description: profitPath of Intra Arbitrage
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/intratradeProfitPaths'
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async profitPaths(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let connectexchanges1 = await connectedExchangeData({ $and: [{ _id: req.body.connectedExchangeId1 }, { userId: req.userId }] });
                let connectexchanges2 = await connectedExchangeData({ $and: [{ _id: req.body.connectedExchangeId2 }, { userId: req.userId }] });
                let exchange1 = await exchangeData({ uid: connectexchanges1.uid, status: "ACTIVE" });
                let exchange2 = await exchangeData({ uid: connectexchanges2.uid, status: "ACTIVE" });
                let t1 = exchange1.exchangeName;
                let t2 = exchange2.exchangeName;
                var exchanges = new Array();
                var all_tickers = new Array();
                var all_tradefee = new Array();
                let tickers1 = exchange1.tickers;
                let tickers2 = exchange2.tickers;
                let trade1 = exchange1.tradeFee;
                let trade2 = exchange2.tradeFee;
                var token = {};
                token[t1] = tickers1;
                token[t2] = tickers2;
                var trade = {};
                trade[t1] = trade1;
                trade[t2] = trade2;
                all_tickers.push(token);
                all_tradefee.push(trade);
                exchanges.push(t1, t2);
                var result = await arbitragefunction.intraExchange(exchanges, req.body.startToken, req.body.capital, all_tickers, all_tradefee);
                if (result.length == 0) {
                    return res.json(new response([], 'Profit Path Not Found'));
                }
                else {
                    return res.json(new response(result, 'Profit Path fetch Sucessfully'));
                }
            }
        } catch (error) {
            return next(error);
        }
    }
    /**
    * @swagger
    * /loopArbitrage/filterProfitPaths:
    *   post:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description: List of loop arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: profitPath
    *         description: profitPath
    *         in: body
    *         required: false
    *         schema:
    *           $ref: '#/definitions/loopFilterProfitPaths'
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
                let data;
                var orderdata = await profitpatheList({ status: 'ACTIVE', arbitrageName: arbitrage.LoopArbitrage });
                if (orderdata.length == 0) {
                    throw apiError.notFound(responseMessage.PROFIT_PATH_NOT_FOUND);
                }
                if (req.body.exchange1 && req.body.exchange2 && req.body.exchange3 && req.body.startToken && req.body.capital) {
                    data = await arbitragefunction.getExchangeLoop(orderdata[0].path, req.body.exchange1, req.body.exchange2, req.body.exchange3);
                    data = await arbitragefunction.getStartTokenLoop(data, req.body.startToken)
                    data = await arbitragefunction.getCapitalInterLoop(data, req.body.capital)
                }
                else if (req.body.exchange1 && req.body.exchange2 && req.body.exchange3 && req.body.startToken) {
                    data = await arbitragefunction.getExchangeLoop(orderdata[0].path, req.body.exchange1, req.body.exchange2, req.body.exchange3);
                    data = await arbitragefunction.getStartTokenLoop(data, req.body.startToken)
                }
                else if (req.body.exchange1 && req.body.exchange2 && req.body.exchange3 && req.body.capital) {
                    data = await arbitragefunction.getExchangeLoop(orderdata[0].path, req.body.exchange1, req.body.exchange2, req.body.exchange3);
                    data = await arbitragefunction.getCapitalInterLoop(data, req.body.capital)
                }
                else if (req.body.exchange1 && req.body.exchange2 && req.body.exchange3) {
                    data = await arbitragefunction.getExchangeLoop(orderdata[0].path, req.body.exchange1, req.body.exchange2, req.body.exchange3);
                }
                else if (req.body.startToken && req.body.capital) {
                    data = await arbitragefunction.getStartTokenLoop(orderdata[0].path, req.body.startToken)
                    data = await arbitragefunction.getCapitalInterLoop(data, req.body.capital)
                }
                else if (req.body.startToken) {
                    data = await arbitragefunction.getStartTokenLoop(orderdata[0].path, req.body.startToken)
                }
                else if (req.body.capital) {
                    data = await arbitragefunction.getCapitalInterLoop(orderdata[0].path, req.body.capital)
                    // console.log(data);
                }
                else {
                    data = orderdata[0].path;
                }
                if (data.length == 0) {
                    throw apiError.notFound('Profit Path Not Found');
                }
                else {
                    if (data.length > 20) {
                        data = data.slice(0, 20);
                    }
                    else {
                        data = data;
                    }
                    return res.json(new response(data, 'Profit Path fetch Sucessfully'));
                }
            }
        } catch (error) {

            return next(error);
        }
    }
    /**
    * @swagger
    * /loopArbitrage/autoTradeOnOff:
    *   post:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description: List of loop arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: profitPath
    *         description: profitPath
    *         in: body
    *         required: false
    *         schema:
    *           $ref: '#/definitions/loopautoTradeOnOff'
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
                let connectedExchangeDetails = await connectedExchangeList({ userId: userResult._id, status: "ACTIVE" });
                if (userResult.autoTrade.loop == true) {
                    let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.loop': false ,'autoTradePlaceCount.direct': 0 });
                    if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched off successfully.`)); }
                }
                else if (userResult.autoTrade.loop == false) {
                    if (req.body.capital) {
                        let connectedList = [];
                        let nonConnectedList = [];
                        let exchangeWithSetBalance = [];
                        let exchangeWithLowBalance = [];
                        if (req.body.capital >= 100) {
                            if ((req['body']['exchange1'] && req['body']['exchange1'].length != 0) && (req['body']['exchange2'] && req['body']['exchange2'].length != 0) && (req['body']['exchange3'] && req['body']['exchange3'].length != 0)) {
                                if (connectedExchangeDetails.length != 0) {
                                    for (let exchange of connectedExchangeDetails) {
                                        if (req['body']['exchange1'].includes(exchange['uid']) || req['body']['exchange2'].includes(exchange['uid']) || req['body']['exchange3'].includes(exchange['uid'])) {
                                            let exchangeName = (await exchangeData({ uid: exchange['uid'], status: "ACTIVE" }))['exchangeName'];
                                            if (req['body']['exchange1'].includes(exchange['uid'])) {
                                                let accountBalances = await getAccount(exchangeName, exchange.apiKey, exchange.secretKey, exchange.passphrase, exchange.customerId, userResult._id);
                                                let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "USD"); });
                                                if (usdtBalance[0]['free'] >= 50) {
                                                    exchangeWithSetBalance.push(exchange['uid']);
                                                }
                                                else {
                                                    exchangeWithLowBalance.push(exchange['uid']);
                                                }
                                            }
                                            connectedList.push(exchange['uid']);

                                        }
                                    }
                                }
                                if (req['body']['exchange1']) {
                                    for (let uid of req['body']['exchange1']) {
                                        if (connectedList.includes(uid) == false && nonConnectedList.includes(uid) == false) {
                                            nonConnectedList.push(uid);
                                        }
                                    }
                                }
                                if (req['body']['exchange2']) {
                                    for (let uid of req['body']['exchange2']) {
                                        if (connectedList.includes(uid) == false && nonConnectedList.includes(uid) == false) {
                                            nonConnectedList.push(uid);
                                        }
                                    }
                                }
                                if (req['body']['exchange3']) {
                                    for (let uid of req['body']['exchange3']) {
                                        if (connectedList.includes(uid) == false && nonConnectedList.includes(uid) == false) {
                                            nonConnectedList.push(uid);
                                        }
                                    }
                                }
                                if (nonConnectedList.length == 0) {
                                    if (exchangeWithLowBalance.length == 0) {
                                        let autoTradeDetails = await autoTradeData({ userId: userResult._id, arbitrageName: 'LOOP' });
                                        let autoTradeObj = {
                                            userId: userResult._id,
                                            arbitrageName: 'LOOP',
                                            exchange1: req.body.exchange1,
                                            exchange2: req.body.exchange2,
                                            exchange3: req.body.exchange3,
                                            capital: req.body.capital,
                                            maxThreshold: req.body.maxThreshold,
                                            minThreshold: req.body.minThreshold,
                                            fromCoin: req.body.fromCoin,
                                            toCoin: req.body.toCoin
                                        }
                                        if (!autoTradeDetails) {
                                            let autoTradeCreated = await autoTradeCreate(autoTradeObj);
                                            if (autoTradeCreated) {
                                                let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.loop': true });
                                                if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched on successfully.`)); }
                                            }
                                        }
                                        else {
                                            let autoTradeUpdated = await autoTradeUpdate({ _id: autoTradeDetails._id }, { $set: autoTradeObj });
                                            if (autoTradeUpdated) {
                                                let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.loop': true });
                                                if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched on successfully.`)); }
                                            }
                                        }
                                    } else {
                                        throw apiError.badRequest(`Please check ${exchangeWithLowBalance} account have a minimum $50 balance in USDT coin or choose another exchange account to start the bot.`);
                                    }
                                }
                                else {
                                    throw apiError.notFound(`Please connect ${nonConnectedList} exchanges.`);
                                }
                            }
                            else {
                                throw apiError.badRequest(`Please select minimum one exchange for From exchange account and also for To exchange account.`);
                            }
                        }
                        else {
                            throw apiError.badRequest('Please check capital value must be $15 or more.')
                        }
                    }
                    else {
                        throw apiError.badRequest('Please provide capital value.')
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
     * /loopArbitrage/tradeProfitPaths:
     *   post:
     *     tags:
     *       - LOOP ARBITRAGE
     *     description: Create Docs for USER
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: USER token
     *         in: header
     *         required: true
     *       - in: body
     *         name: Buy/Sell in InterLoopExchange
     *         description: Buy/Sell in by USER.
     *         schema:
     *           type: object
     *           required:
     *              - capital
     *           properties:
     *             capital:
     *              type: number
     *             order0:
     *              type: object
     *              properties:
     *                side:
     *                  type: string
     *                coin:
     *                  type: string
     *                exchange:
     *                  type: string
     *                price:
     *                  type: string
     *             withdraw0:
     *              type: object
     *              properties:
     *                coin:
     *                  type: string
     *                from:
     *                  type: string
     *                to:
     *                  type: string
     *             order1:
     *              type: object
     *              properties:
     *                side:
     *                  type: string
     *                coin:
     *                  type: string
     *                exchange:
     *                  type: string
     *                price:
     *                  type: string
     *             withdraw1:
     *              type: object
     *              properties:
     *                coin:
     *                  type: string
     *                from:
     *                  type: string
     *                to:
     *                  type: string
     *             order2:
     *              type: object
     *              properties:
     *                side:
     *                  type: string
     *                coin:
     *                  type: string
     *                exchange:
     *                  type: string
     *                price:
     *                  type: string
     *     responses:
     *       200:
     *         description: Profit Calculated successfully
     *       404:
     *         description: Invalid credentials
     *       500:
     *         description: Internal Server Error
     */
    async tradeProfitPaths(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let exchanges1 = await exchangeData({ exchangeName: req.body.order0.exchange });
                let exchanges2 = await exchangeData({ exchangeName: req.body.order1.exchange });
                let exchanges3 = await exchangeData({ exchangeName: req.body.order2.exchange });
                let connected1 = await connectedExchangeData({ uid: exchanges1.uid, userId: userResult._id });
                let connected2 = await connectedExchangeData({ uid: exchanges2.uid, userId: userResult._id });
                let connected3 = await connectedExchangeData({ uid: exchanges3.uid, userId: userResult._id });
                // if (connected1 && connected2 && connected3) {
                var check0, check1, check2;
                check0 = await orderkeyA(req.body.order0.exchange);
                check1 = await orderkeyB(req.body.order1.exchange);
                check2 = await orderkeyC(req.body.order2.exchange);
                var order0 = {
                    action: req.body.order0.side,
                    symbol: req.body.order0.coin,
                    exchange: req.body.order0.exchange,
                    price: req.body.order0.price,
                    withdrawCoin: req.body.withdraw0.coin,
                    withrawFrom: req.body.withdraw0.from,
                    withrawTo: req.body.withdraw0.to,
                }
                var order1 = {
                    action: req.body.order1.side,
                    symbol: req.body.order1.coin,
                    exchange: req.body.order1.exchange,
                    price: req.body.order1.price,
                    withdrawCoin: req.body.withdraw1.coin,
                    withrawFrom: req.body.withdraw1.from,
                    withrawTo: req.body.withdraw1.to,
                }
                var order2 = {
                    action: req.body.order2.side,
                    symbol: req.body.order2.coin,
                    exchange: req.body.order2.exchange,
                    price: req.body.order2.price,
                }
                order0 = Object.assign(order0, check0);
                order1 = Object.assign(order1, check1);
                order2 = Object.assign(order2, check2);
                req.body.userId = userResult._id;
                req.body.strategy = [order0, order1, order2];
                let LoopArbitrage = await loopArbitrageData({ userId: userResult._id, strategy: req.body.strategy, status: { $ne: "DELETE" } });//{ $match: { <query> } }\
                if (LoopArbitrage) {
                    throw apiError.alreadyExist('Loop Arbitrage profit path already trade');
                } else {
                    req.body.connectedExchangeId1 = connected1._id;
                    req.body.connectedExchangeId2 = connected2._id;
                    req.body.connectedExchangeId3 = connected3._id;
                    // req.body.connectedExchangeId1 = '631304624445a7314f3b20d8';
                    // req.body.connectedExchangeId2 = '631304624445a7314f3b20d8';
                    // req.body.connectedExchangeId3 = '631304624445a7314f3b20d8';
                    var result = await loopArbitrageCreate(req.body);
                    if (result) {
                        return res.json(new response(result, 'Loop arbitrage profit path fetch On Tradeing'));
                    }
                }
                // }
                // else if (!connected1 && !connected2 && !connected3) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.order0.exchange},${req.body.order1.exchange},${req.body.order2.exchange}`);
                // }
                // else if (!connected1 && !connected2) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.order0.exchange},${req.body.order1.exchange}`);
                // }
                // else if (!connected1 && !connected3) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.order0.exchange},${req.body.order2.exchange}`);
                // }
                // else if (!connected2 && !connected3) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.order1.exchange},${req.body.order2.exchange}`);
                // }
                // else if (!connected1) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.order0.exchange}`);
                // }
                // else if (!connected2) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.order1.exchange}`);
                // }
                // else if (!connected3) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.order2.exchange}`);
                // }
            }
        } catch (error) {
            return next(error);
        }
    }
    /**
    * @swagger
    * /loopArbitrage/listPlacedTrade:
    *   get:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description: List of loop arbitrage profit paths
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
    async listPlacedTrade(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let exchanges = await loopArbitrageList({ userId: userResult._id, status: { $ne: 'DELETE' } });
                if (exchanges.length != 0) {
                    return res.json(new response(exchanges, responseMessage.DIRECT_lIST));
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
    * /loopArbitrage/viewPlacedTrade/{_id}:
    *   get:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description: List of triangular arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of loop exchange
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
                let loopdata = await loopArbitrageData({ _id: req.params._id, status: { $ne: "DELETE" } });
                if (loopdata) {
                    return res.json(new response(loopdata, responseMessage.DIRECT_VIEW));
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
    * /loopArbitrage/activeBlockvPlacedTrade:
    *   put:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description: List of triangular arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of loop exchange
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async activeBlockvPlacedTrade(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let exchanges = await loopArbitrageData({ _id: req.body._id, status: { $ne: "DELETE" } });
                if (exchanges) {
                    if (exchanges.status == 'ACTIVE') {
                        let updateStatus = await loopArbitrageUpdate({ _id: exchanges._id }, { $set: { status: 'BLOCK' } });
                        return res.json(new response(updateStatus, 'Inter loop Arbitrage Active Sucessfully'));
                    } else if (exchanges.status == 'BLOCK') {
                        let updateStatus = await loopArbitrageUpdate({ _id: exchanges._id }, { $set: { status: 'ACTIVE' } });
                        return res.json(new response(updateStatus, 'Inter loop Arbitrage Block Sucessfully'));
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
    * /loopArbitrage/deletePlacedTrade:
    *   delete:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description: List of loop arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of loop exchange
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
                let loopdata = await loopArbitrageData({ _id: req.body._id, status: { $ne: "DELETE" } });
                if (loopdata) {
                    let updateStatus = await loopArbitrageUpdate({ _id: loopdata._id }, { $set: { status: 'DELETE' } });
                    return res.json(new response('Inter Loop Arbitrage DELETE Sucessfully'));
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
    * /loopArbitrage/cancelledOrder/{_id}:
    *   post:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description: cancelled arbitrage 
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of loop exchange
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
                let loopdata = await loopArbitrageData({ _id: req.params._id, arbitrageStatus: { $ne: "CANCELLED" } });
                if (loopdata) {
                    let orderId1 = loopdata.strategy[0].orderId;
                    let orderId2 = loopdata.strategy[1].orderId;
                    let orderId3 = loopdata.strategy[2].orderId;
                    if (loopdata.strategy[0].isTradeActive == true && loopdata.strategy[0].isTrade == false) {
                        let [exchangeData1] = await Promise.all([exchangeData({ exchangeName: loopdata.strategy[0].exchange })])
                        exchangeData1 = exchangeData1.uid;
                        let [connectedData1] = await Promise.all([connectedExchangeData({ uid: exchangeData1 })])
                        let [cancelData1] = await Promise.all([cancelled.cancelOrder(loopdata.strategy[0].exchange, loopdata.strategy[0].symbol, loopdata.strategy[0].orderId, connectedData1.apiKey, connectedData1.secretKey, connectedData1.passphrase)])
                        if (cancelData1.status == true) {
                            let updateStatus = await loopArbitrageUpdate({ _id: loopdata._id }, { $set: { arbitrageStatus: 'CANCELLED' } });
                            throw apiError.badRequest(`Loop Arbitrage ${loopdata.strategy[0].action}loopdata.orderloopdata.cancelled.`);
                        }
                        else if (cancelData1.status == false) {
                            let orderObj1 = { arbitrageId: loopdata._id, userId: userResult._id, title: cancelData1.error }
                            let notification = await notificationCreate(orderObj1);
                            if (notification) {
                                await notificationCreate(orderObj1);
                            }
                            throw apiError.badRequest(`Loop Arbitrage ${loopdata.strategy[0].action} order Not cancelleds.`);
                        }
                    }
                    if (loopdata.strategy[1].isTradeActive == true && loopdata.strategy[1].isTrade == false) {
                        let [exchangeData1] = await Promise.all([exchangeData({ exchangeName: loopdata.strategy[1].exchange })])
                        exchangeData1 = exchangeData1.uid;
                        let [connectedData1] = await Promise.all([connectedExchangeData({ uid: exchangeData1 })])
                        let [cancelData1] = await Promise.all([cancelled.cancelOrder(loopdata.strategy[1].exchange, loopdata.strategy[1].symbol, loopdata.strategy[1].orderId, connectedData1.apiKey, connectedData1.secretKey, connectedData1.passphrase)])
                        if (cancelData1.status == true) {
                            let updateStatus = await loopArbitrageUpdate({ _id: loopdata._id }, { $set: { arbitrageStatus: 'CANCELLED' } });
                            throw apiError.badRequest(`Loop Arbitrage ${loopdata.strategy[1].action} order cancelled.`);
                        }
                        else if (cancelData1.status == false) {
                            let orderObj1 = { arbitrageId: loopdata._id, userId: userResult._id, title: cancelData1.error }
                            let notification = await notificationCreate(orderObj1);
                            if (notification) {
                                await notificationCreate(orderObj1);
                            }
                            throw apiError.badRequest(`Loop Arbitrage ${loopdata.strategy[1].action} order Not cancelled.`);
                        }
                    }
                    if (loopdata.strategy[2].isTradeActive == true && loopdata.strategy[2].isTrade == false) {
                        let [exchangeData1] = await Promise.all([exchangeData({ exchangeName: loopdata.strategy[2].exchange })])
                        exchangeData1 = exchangeData1.uid;
                        let [connectedData1] = await Promise.all([connectedExchangeData({ uid: exchangeData1 })])
                        let [cancelData1] = await Promise.all([cancelled.cancelOrder(loopdata.strategy[2].exchange, loopdata.strategy[2].symbol, loopdata.strategy[2].orderId, connectedData1.apiKey, connectedData1.secretKey, connectedData1.passphrase)])
                        if (cancelData1.status == true) {
                            let updateStatus = await loopArbitrageUpdate({ _id: loopdata._id }, { $set: { arbitrageStatus: 'CANCELLED' } });
                            throw apiError.badRequest(`Loop Arbitrage ${loopdata.strategy[2].action} order cancelled.`);
                        }
                        else if (cancelData1.status == false) {
                            let orderObj1 = { arbitrageId: loopdata._id, userId: userResult._id, title: cancelData1.error }
                            let notification = await notificationCreate(orderObj1);
                            if (notification) {
                                await notificationCreate(orderObj1);
                            }
                            throw apiError.badRequest(`Loop Arbitrage ${loopdata.strategy[2].action} order Not cancelled.`);
                        }
                    }
                    else if ((loopdata.strategy[0].isTradeActive == false && loopdata.strategy[0].isTrade == false) && (loopdata.strategy[1].isTradeActive == false && loopdata.strategy[1].isTrade == false) && (loopdata.strategy[2].isTradeActive == false && loopdata.strategy[2].isTrade == false)) {
                        throw apiError.notFound('your loop arbitrage orders not on trade.');
                    }
                    else if ((loopdata.strategy[0].isTradeActive == false && loopdata.strategy[0].isTrade == true) && (loopdata.strategy[1].isTradeActive == false && loopdata.strategy[1].isTrade == true) && (loopdata.strategy[2].isTradeActive == false && loopdata.strategy[2].isTrade == true)) {
                        throw apiError.notFound('Orders not cancelled because orders are executed.');
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

    async filterProfitPathsWebSocket(token, exchange1, exchange2, exchange3, startToken, capital) {
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
                    let data;
                    var orderdata = await profitpatheList({ status: 'ACTIVE', arbitrageName: arbitrage.LoopArbitrage });
                    if (orderdata.length == 0) {
                        responses = ({ responseCode: 404, responseMessage: "Profit Path Not Found", responseResult: [] });
                        resolve(responses)
                    }
                    if (exchange1 && exchange2 && exchange3 && startToken && capital) {
                        data = await arbitragefunction.getExchangeLoop(orderdata[0].path, exchange1, exchange2, exchange3);
                        data = await arbitragefunction.getStartTokenLoop(data, startToken)
                        data = await arbitragefunction.getCapitalInterLoop(data, capital)
                    }
                    else if (exchange1 && exchange2 && exchange3 && startToken) {
                        data = await arbitragefunction.getExchangeLoop(orderdata[0].path, exchange1, exchange2, exchange3);
                        data = await arbitragefunction.getStartTokenLoop(data, startToken)
                    }
                    else if (exchange1 && exchange2 && exchange3 && capital) {
                        data = await arbitragefunction.getExchangeLoop(orderdata[0].path, exchange1, exchange2, exchange3);
                        data = await arbitragefunction.getCapitalInterLoop(data, capital)
                    }
                    else if (exchange1 && exchange2 && exchange3) {
                        data = await arbitragefunction.getExchangeLoop(orderdata[0].path, exchange1, exchange2, exchange3);
                    }
                    else if (startToken && capital) {
                        data = await arbitragefunction.getStartTokenLoop(orderdata[0].path, startToken)
                        data = await arbitragefunction.getCapitalInterLoop(data, capital)
                    }
                    else if (startToken) {
                        data = await arbitragefunction.getStartTokenLoop(orderdata[0].path, startToken)
                    }
                    else if (capital) {
                        data = await arbitragefunction.getCapitalInterLoop(orderdata[0].path, capital)
                    }
                    else {
                        data = orderdata[0].path;
                    }
                    if (data.length == 0) {
                        responses = ({ responseCode: 404, responseMessage: "Profit Path Not Found", responseResult: [] });
                        resolve(responses)
                    }
                    else {
                        if (data.length > 20) {
                            data = data.slice(0, 20);
                        }
                        else {
                            data = data;
                        }
                        responses = ({ responseCode: 200, responseMessage: "Profit Path fetch Sucessfully", responseResult: data });
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
    * /loopArbitrage/listPlacedTradeWithFilter:
    *   post:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description: List of Loop place trade
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
            limit: Joi.string().allow(null).optional()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId,status: { $ne: status.DELETE }, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                validatedBody.userId = userResult._id
                let exchanges = await loopArbitrageListWithPaginate(validatedBody);
                if (exchanges.docs.length != 0) {
                    return res.json(new response(exchanges, responseMessage.TRANSATION_FOUND));
                }
                else {
                    throw apiError.notFound(responseMessage.TRANSATION_NOT_FOUND);
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /loopArbitrage/listPlacedTradeWithFilterForParticularUser:
    *   post:
    *     tags:
    *       - LOOP ARBITRAGE
    *     description: List of Loop place trade
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: userId
    *         description:  userId
    *         in: formData
    *         required: true
    *       - name: arbitrageStatus
    *         description: arbitrageStatus (CANCELLED/COMPLETED/PENDING)
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
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async listPlacedTradeWithFilterForParticularUser(req, res, next) {
        const validationSchema = {
            userId:Joi.string().required(),
            arbitrageStatus: Joi.string().allow(null).optional(),
            fromDate: Joi.string().allow(null).optional(),
            toDate: Joi.string().allow(null).optional(),
            page: Joi.string().allow(null).optional(),
            limit: Joi.string().allow(null).optional()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let userInfo = await findUser({ _id: validatedBody.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
                if (!userInfo) {
                    throw apiError.notFound(responseMessage.USER_NOT_FOUND);
                }
                validatedBody.userId = userInfo._id
                let exchanges = await loopArbitrageListWithPaginate(validatedBody);
                if (exchanges.docs.length != 0) {
                    return res.json(new response(exchanges, responseMessage.TRANSATION_FOUND));
                }
                else {
                    throw apiError.notFound(responseMessage.TRANSATION_NOT_FOUND);
                }
            }
        } catch (error) {
            return next(error);
        }
    }
}

export default new loopController()

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
import arbitragefunction from '../../../../helper/arbitrage';
import { intraServices } from '../../services/intraarbitrage';
import { autoTradeServices } from '../../services/autoTrade ';
import cancelled from '../../../../helper/buySell';
import { get_token } from '../../../../helper/tokenpair';
import { notificationServices } from '../../services/notification';
const { findUser, updateUser } = userServices;
const { exchangeList, exchangeData, connectedExchangeData, connectedExchangeUpdate, connectedExchangeCreate, connectedExchangeList } = walletServices;
const { intraArbitrageCreate, intraArbitrageData, intraArbitrageList, intraArbitrageUpdate } = intraServices;
const { profitpathCreate, profitpatheList, profitpathData, profitpathUpdate } = profitPathServices;
const { autoTradeCreate, autoTradeList, autoTradeData, autoTradeUpdate } = autoTradeServices;
const { notificationCreate, notificationData, notificationUpdate } = notificationServices;
export class intraController {
    /**
    * @swagger
    * /intraArbitrage/profitPaths:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE
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
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let connectexchanges1 = await connectedExchangeData({ $and: [{ _id: req.body.connectedExchangeId1 }, { userId: req.userId }] });
                let connectexchanges2 = await connectedExchangeData({ $and: [{ _id: req.body.connectedExchangeId2 }, { userId: req.userId }] });
                let exchange1 = await exchangeData({ uid: connectexchanges1.uid, userId: userResult._id });
                let exchange2 = await exchangeData({ uid: connectexchanges2.uid, userId: userResult._id });
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
    * /intraArbitrage/filterProfitPaths:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE
    *     description: List of intra arbitrage profit paths
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
    *           $ref: '#/definitions/intraFilterProfitPaths'
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async filterProfitPaths(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN,userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let data;
                var orderdata = await profitpatheList({ status: 'ACTIVE', arbitrageName: arbitrage.IntraArbitrage });
                if(orderdata.length==0){
                    throw apiError.notFound(responseMessage.PROFIT_PATH_NOT_FOUND);
                }
                if (req.body.exchange1 && req.body.exchange2 && req.body.startToken && req.body.capital) {
                    data = await arbitragefunction.getExchange(orderdata[0].path, req.body.exchange1, req.body.exchange2);
                    data = await arbitragefunction.getStartToken(data, req.body.startToken);
                    data = await arbitragefunction.getCapitalIntra(data, req.body.capital);
                }
                else if (req.body.exchange1 && req.body.exchange2 && req.body.startToken) {
                    data = await arbitragefunction.getExchange(orderdata[0].path, req.body.exchange1, req.body.exchange2);
                    data = await arbitragefunction.getStartToken(data, req.body.startToken);
                }
                else if (req.body.exchange1 && req.body.exchange2 && req.body.capital) {
                    data = await arbitragefunction.getExchange(orderdata[0].path, req.body.exchange1, req.body.exchange2);
                    data = await arbitragefunction.getCapitalIntra(data, req.body.capital);
                }
                else if (req.body.startToken && req.body.capital) {
                    data = await arbitragefunction.getStartToken(orderdata[0].path, req.body.startToken);
                    data = await arbitragefunction.getCapitalIntra(data, req.body.capital);
                }
                else if (req.body.exchange1 && req.body.exchange2) {
                    data = await arbitragefunction.getExchange(orderdata[0].path, req.body.exchange1, req.body.exchange2);
                }
                else if (req.body.capital) {
                    // console.log("test");
                    data = await arbitragefunction.getCapitalIntra(orderdata[0].path, req.body.capital);
                }
                else if (req.body.startToken) {
                    data = await arbitragefunction.getStartToken(orderdata[0].path, req.body.startToken);
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
    * /intraArbitrage/autoTradeOnOff:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE
    *     description: List of intra arbitrage profit paths
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
    *           $ref: '#/definitions/intraautoTradeOnOff'
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async autoTradeOnOff(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let connectedExchangeDetails = await connectedExchangeList({ userId: userResult._id, status: "ACTIVE" });
                if (userResult.autoTrade.intra == true) {
                    let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.intra': false });
                    if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched off successfully.`)); }
                }
                else if (userResult.autoTrade.intra == false) {
                    if (req.body.capital) {
                        let connectedList = [];
                        let nonConnectedList = [];
                        let exchangeWithSetBalance = [];
                        let exchangeWithLowBalance = [];
                        // if (req.body.capital >= 15) {
                        if ((req['body']['exchange1'] && req['body']['exchange1'].length != 0) && (req['body']['exchange2'] && req['body']['exchange2'].length != 0)) {
                            for (let exchange of connectedExchangeDetails) {
                                if (req['body']['exchange1'].includes(exchange['uid']) || req['body']['exchange2'].includes(exchange['uid'])) {
                                    let exchangeName = (await exchangeData({ uid: exchange['uid'], status: "ACTIVE" }))['exchangeName'];
                                    if (req['body']['exchange1'].includes(exchange['uid'])) {
                                        let accountBalances = await getAccount(exchangeName, exchange.apiKey, exchange.secretKey, exchange.passphrase, exchange.customerId, userResult._id);
                                        let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "USD"); });
                                        if (usdtBalance[0]['total'] >= 50) {
                                            exchangeWithSetBalance.push(exchange['uid']);
                                        }
                                        else {
                                            exchangeWithLowBalance.push(exchange['uid']);
                                        }
                                    }
                                    connectedList.push(exchange['uid']);

                                }
                            }
                            for (let uid of req['body']['exchange1']) {
                                if (connectedList.includes(uid) == false && nonConnectedList.includes(uid) == false) {
                                    nonConnectedList.push(uid);
                                }
                            }
                            for (let uid of req['body']['exchange2']) {
                                if (connectedList.includes(uid) == false && nonConnectedList.includes(uid) == false) {
                                    nonConnectedList.push(uid);
                                }
                            }
                            if (nonConnectedList.length == 0) {
                                if (exchangeWithLowBalance.length == 0) {
                                    let autoTradeDetails = await autoTradeData({ userId: userResult._id, arbitrageName: 'INTRA' });
                                    let autoTradeObj = {
                                        userId: userResult._id,
                                        arbitrageName: 'INTRA',
                                        exchange1: req.body.exchange1,
                                        exchange2: req.body.exchange2,
                                        capital: req.body.capital,
                                        maxThreshold: req.body.maxThreshold,
                                        minThreshold: req.body.minThreshold,
                                        fromCoin: req.body.fromCoin,
                                        toCoin: req.body.toCoin
                                    }
                                    if (!autoTradeDetails) {
                                        let autoTradeCreated = await autoTradeCreate(autoTradeObj);
                                        if (autoTradeCreated) {
                                            let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.intra': true });
                                            if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched on successfully.`)); }
                                        }
                                    }
                                    else {
                                        let autoTradeUpdated = await autoTradeUpdate({ _id: autoTradeDetails._id }, { $set: autoTradeObj });
                                        if (autoTradeUpdated) {
                                            let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.intra': true });
                                            if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched on successfully.`)); }
                                        }
                                    }
                                }
                                else {
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
                        // }
                        // else {
                        //     throw apiError.badRequest('Please check capital value must be $15 or more.')
                        // }
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
    * /intraArbitrage/tradeProfitPaths:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE
    *     description: arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: false
    *       - name: tradeProfitPaths
    *         description: tradeProfitPaths
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/intratradeProfitPaths'
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async tradeProfitPaths(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let exchanges1 = await exchangeData({ exchangeName: req.body.buy });
                let exchanges2 = await exchangeData({ exchangeName: req.body.sell });
                let connected1 = await connectedExchangeData({ uid: exchanges1.uid, userId: userResult._id });
                let connected2 = await connectedExchangeData({ uid: exchanges2.uid, userId: userResult._id });
                // if (connected1 && connected2) {
                    var buy_obj = {
                        exchange: req.body.buy,
                        action: Object.keys(req.body)[2],
                        price: req.body.exchange1_price,
                        isTrade: false,
                        isTradeActive: false
                    }
                    var sell_obj = {
                        exchange: req.body.sell,
                        action: Object.keys(req.body)[4],
                        price: req.body.exchange2_price,
                        isTrade: false,
                        isTradeActive: false
                    }
                    req.body.userId = userResult._id;
                    req.body.strategy = [buy_obj, sell_obj];
                    let intraArbitrage = await intraArbitrageData({ userId: userResult._id, strategy: req.body.strategy, status: { $ne: "DELETE" } });//{ $match: { <query> } }\
                    if (intraArbitrage) {
                        throw apiError.alreadyExist('Intra Arbitrage profit path already trade');
                    } else {
                        req.body.userId = userResult._id;
                        // req.body.connectedExchangeId1 = connected1._id;
                        // req.body.connectedExchangeId2 = connected2._id;
                        req.body.connectedExchangeId1 = '631304624445a7314f3b20d8';
                        req.body.connectedExchangeId2 = '631304624445a7314f3b20d8';
                        var result = await intraArbitrageCreate(req.body);
                        if (result) {
                            return res.json(new response(result, 'Intra arbitrage profit path fetch On Tradeing'));
                        }
                    }
                // }
                // else if (!connected1 && !connected2) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.buy} and ${req.body.sell}`);
                // }
                // else if (!connected1) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.buy}`);
                // }
                // else if (!connected2) {
                //     throw apiError.notFound(`Exchange Not connected ${req.body.sell}`);
                // }
            }
        } catch (error) {
            return next(error);
        }
    }
    /**
    * @swagger
    * /intraArbitrage/listPlacedTrade:
    *   get:
    *     tags:
    *       - INTRA ARBITRAGE
    *     description: List of arbitrage profit paths
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
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let exchanges = await intraArbitrageList({ userId: userResult._id, status: { $ne: 'DELETE' } });
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
    * /intraArbitrage/viewPlacedTrade/{_id}:
    *   get:
    *     tags:
    *       - INTRA ARBITRAGE
    *     description: List of triangular arbitrage profit paths
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
    async viewPlacedTrade(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let directdata = await intraArbitrageData({ _id: req.params._id, status: { $ne: "DELETE" } });
                if (directdata) {
                    return res.json(new response(directdata, responseMessage.DIRECT_VIEW));
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
    * /intraArbitrage/activeBlockvPlacedTrade:
    *   put:
    *     tags:
    *       - INTRA ARBITRAGE
    *     description: List of triangular arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of intra exchange
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async activeBlockvPlacedTrade(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let exchanges = await intraArbitrageData({ _id: req.body._id, status: { $ne: "DELETE" } });
                if (exchanges) {
                    if (exchanges.status == 'ACTIVE') {
                        let updateStatus = await intraArbitrageUpdate({ _id: exchanges._id }, { $set: { status: 'BLOCK' } });
                        return res.json(new response(updateStatus, 'Intra Arbitrage Active Sucessfully'));
                    } else if (exchanges.status == 'BLOCK') {
                        let updateStatus = await intraArbitrageUpdate({ _id: exchanges._id }, { $set: { status: 'ACTIVE' } });
                        return res.json(new response(updateStatus, 'Intra Arbitrage Block Sucessfully'));
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
    * /intraArbitrage/deletePlacedTrade:
    *   delete:
    *     tags:
    *       - INTRA ARBITRAGE
    *     description: List of arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of intra exchange
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async deletePlacedTrade(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let directdata = await intraArbitrageData({ _id: req.body._id, status: { $ne: "DELETE" } });
                if (directdata) {
                    let updateStatus = await intraArbitrageUpdate({ _id: directdata._id }, { $set: { status: 'DELETE' } });
                    return res.json(new response('intra Arbitrage DELETE Sucessfully'));
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
    * /intraArbitrage/cancelledOrder/{_id}:
    *   post:
    *     tags:
    *       - INTRA ARBITRAGE
    *     description: cancelled arbitrage 
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
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let intradata = await intraArbitrageData({ _id: req.params._id, arbitrageStatus: { $ne: "CANCELLED" } });
                if (intradata) {
                    let orderId1 = intradata.strategy[0].orderId;
                    let orderId2 = intradata.strategy[1].orderId;
                    if ((intradata.strategy[0].isTradeActive == true && intradata.strategy[0].isTrade == false) && (intradata.strategy[1].isTradeActive == true && intradata.strategy[1].isTrade == false)) {
                        let [exchangeData1, exchangeData2] = await Promise.all([exchangeData({ exchangeName: intradata.strategy[0].exchange, }), exchangeData({ exchangeName: intradata.strategy[1].exchange })])
                        exchangeData1 = exchangeData1.uid;
                        exchangeData2 = exchangeData2.uid;
                        let [connectedData1, connectedData2] = await Promise.all([connectedExchangeData({ uid: exchangeData1 }), connectedExchangeData({ uid: exchangeData2 })])
                        let [symbol1, symbol2] = await Promise.all([get_token(intradata.strategy[0].exchange, intradata.base, intradata.pair), get_token(intradata.strategy[1].exchange, intradata.base, intradata.pair)])
                        let [cancelData1, cancelData2] = await Promise.all([cancelled.cancelOrder(intradata.strategy[0].exchange, symbol1, intradata.strategy[0].orderId, connectedData1.apiKey, connectedData1.secretKey, connectedData1.passphrase), cancelled.cancelOrder(intradata.strategy[1].exchange, symbol2, intradata.strategy[1].orderId, connectedData2.apiKey, connectedData2.secretKey, connectedData2.passphrase)])
                        console.log("exchangeData1", exchangeData1, "exchangeData2", exchangeData2, orderId1, orderId2, "connectedData1", connectedData1, connectedData2, symbol1, symbol2)
                        console.log('T1 ==>', cancelData1.status)
                        console.log('T2 ==>', cancelData2.status)
                        if (cancelData1.status == true && cancelData2.status == true) {
                            let updateStatus = await intraArbitrageUpdate({ _id: intradata._id }, { $set: { arbitrageStatus: 'CANCELLED' } });
                            return res.json(new response(updateStatus, 'Intra Arbitrage both order cancelleds Sucessfully'));
                        }
                        else if (cancelData1.status == true && cancelData2.status == false) {
                            let updateStatus = await intraArbitrageUpdate({ _id: intradata._id }, { $set: { arbitrageStatus: 'CANCELLED' } });
                            let orderObj = {
                                arbitrageId: intradata._id,
                                userId: userResult._id,
                                title: cancelData2.error
                            }
                            let notification = await notificationCreate(orderObj);
                            return res.json(new response(updateStatus, 'Intra Arbitrage order1 cancelleds Sucessfully'));
                        }
                        else if (cancelData1.status == false && cancelData2.status == true) {
                            let updateStatus = await intraArbitrageUpdate({ _id: intradata._id }, { $set: { arbitrageStatus: 'CANCELLED' } });
                            let orderObj = {
                                arbitrageId: intradata._id,
                                userId: userResult._id,
                                title: cancelData1.error
                            }
                            let notification = await notificationCreate(orderObj);
                            return res.json(new response(updateStatus, 'Intra Arbitrage order2 cancelleds Sucessfully'));
                        }
                        else if (cancelData1.status == false && cancelData2.status == false) {
                            let orderObj = { arbitrageId: intradata._id, userId: userResult._id, title: cancelData1.error }
                            let orderObj1 = { arbitrageId: intradata._id, userId: userResult._id, title: cancelData2.error }
                            let notification = await notificationCreate(orderObj);
                            if (notification) {
                                await notificationCreate(orderObj1);
                            }
                            return res.json(new response('Intra Arbitrage Not cancelleds Sucessfully'));
                        }
                    }
                    else if ((intradata.strategy[0].isTradeActive == false && intradata.strategy[0].isTrade == true) && (intradata.strategy[1].isTradeActive == true && intradata.strategy[1].isTrade == false)) {
                        let [exchangeData2] = await Promise.all([exchangeData({ exchangeName: intradata.strategy[1].exchange })])
                        exchangeData2 = exchangeData2.uid;
                        let [connectedData2] = await Promise.all([connectedExchangeData({ uid: exchangeData2 })])
                        let [symbol2] = await Promise.all([get_token(intradata.strategy[1].exchange, intradata.base, intradata.pair)])
                        let [cancelData2] = await Promise.all([cancelled.cancelOrder(intradata.strategy[1].exchange, symbol2, intradata.strategy[1].orderId, connectedData2.apiKey, connectedData2.secretKey, connectedData2.passphrase)])
                        if (cancelData2.status == true) {
                            let updateStatus = await intraArbitrageUpdate({ _id: intradata._id }, { $set: { arbitrageStatus: 'CANCELLED' } });
                            throw apiError.badRequest(updateStatus, 'Intra Arbitrage sell order cancelleds.');
                        }
                        else if (cancelData2.status == false) {
                            let orderObj1 = { arbitrageId: intradata._id, userId: userResult._id, title: cancelData2.error }
                            let notification = await notificationCreate(orderObj1);
                            if (notification) {
                                await notificationCreate(orderObj1);
                            }
                            throw apiError.badRequest("Intra Arbitrage sell order Not cancelleds.");
                        }
                    }
                    else if ((intradata.strategy[0].isTradeActive == true && intradata.strategy[0].isTrade == false) && (intradata.strategy[1].isTradeActive == false && intradata.strategy[1].isTrade == true)) {
                        let [exchangeData1] = await Promise.all([exchangeData({ exchangeName: intradata.strategy[0].exchange })])
                        exchangeData1 = exchangeData1.uid;
                        let [connectedData1] = await Promise.all([connectedExchangeData({ uid: exchangeData1 })])
                        let [symbol1] = await Promise.all([get_token(intradata.strategy[1].exchange, intradata.base, intradata.pair)])
                        let [cancelData1] = await Promise.all([cancelled.cancelOrder(intradata.strategy[0].exchange, symbol1, intradata.strategy[0].orderId, connectedData1.apiKey, connectedData1.secretKey, connectedData1.passphrase)])
                        if (cancelData1.status == true) {
                            let updateStatus = await intraArbitrageUpdate({ _id: intradata._id }, { $set: { arbitrageStatus: 'CANCELLED' } });
                            throw apiError.badRequest('Intra Arbitrage sell order cancelleds.');
                        }
                        else if (cancelData1.status == false) {
                            let orderObj1 = { arbitrageId: intradata._id, userId: userResult._id, title: cancelData1.error }
                            let notification = await notificationCreate(orderObj1);
                            if (notification) {
                                await notificationCreate(orderObj1);
                            }
                            throw apiError.badRequest("Intra Arbitrage buy order Not cancelleds.");
                        }
                    }
                    else if ((intradata.strategy[0].isTradeActive == false && intradata.strategy[0].isTrade == false) && (intradata.strategy[1].isTradeActive == false && intradata.strategy[1].isTrade == false)) {
                        throw apiError.notFound('your inter arbitrage order not on trade.');
                    }
                    else if ((intradata.strategy[0].isTradeActive == false && intradata.strategy[0].isTrade == true) && (intradata.strategy[1].isTradeActive == false && intradata.strategy[1].isTrade == true)) {
                        throw apiError.notFound('both order not cancelled because both order are executed.');
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
}

export default new intraController()

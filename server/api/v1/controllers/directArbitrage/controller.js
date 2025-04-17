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
import arbitrage from "../../../../enums/arbitrage";
import auth from "../../../../helper/auth"
import speakeasy from 'speakeasy';
import userType from "../../../../enums/userType";
import { userServices } from '../../services/user';
import { walletServices } from '../../services/wallet';
import { directServices } from '../../services/directarbitrage';
import { profitPathServices } from '../../services/profitpath';
import { autoTradeServices } from '../../services/autoTrade ';
import { is_key_buy, is_key_sell } from '../../../../helper/direct_arbitrage_key';
import arbitragefunction from '../../../../helper/arbitrage';
import { notificationServices } from '../../services/notification'
import { sniperBotServices } from '../../services/sniperBot'
import { get_token } from '../../../../helper/tokenpair';
import cancelled from '../../../../helper/buySell';
const { findUser, updateUser } = userServices;
const { exchangeList, exchangeData, connectedExchangeData, connectedExchangeUpdate, connectedExchangeCreate, connectedExchangeList } = walletServices;
const { directArbitrageCreate, directArbitrageData, directArbitrageList, directArbitrageUpdate, directArbitrageListWithPaginate } = directServices;
const { profitpathCreate, profitpatheList, profitpathData, profitpathUpdate } = profitPathServices;
const { autoTradeCreate, autoTradeList, autoTradeData, autoTradeUpdate } = autoTradeServices;
const { sniperCreate, sniperList, sniperData, sniperUpdate } = sniperBotServices;
const { notificationCreate, notificationData, notificationList, notificationUpdate, multiUpdateNotification } = notificationServices;
import { buySubsciptionPlanHistoryServices } from "../../services/buySubscriptionPlanHistory";
const { buySubsciptionPlanCount, buySubsciptionPlanCreate, buySubscriptionhPlanList, buySubscriptionPlanList, buySubsciptionPlanData, buySubsciptionPlanUpdate, lastedBuyPlan } = buySubsciptionPlanHistoryServices
export class directController {

    /**
    * @swagger
    * /directArbitrage/profitPaths:
    *   post:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
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
    *         required: true
    *         schema:
    *           $ref: '#/definitions/directProfitPaths'
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
                var exchange = new Array();
                exchange.push(t1, t2);
                var all_withdrawfee = new Array();
                var withdaw = {};
                withdaw[t1] = exchange1.withdrawFee;
                withdaw[t2] = exchange2.withdrawFee;
                all_withdrawfee.push(withdaw);
                var all_tickers = new Array();
                let tickers1 = exchange1.tickers;
                let tickers2 = exchange2.tickers;
                var token = {};
                token[t1] = tickers1;
                token[t2] = tickers2;
                all_tickers.push(token);
                var all_tradefee = new Array();
                var trade = {};
                trade[t1] = exchange1.tradeFee;
                trade[t2] = exchange2.tradeFee;
                all_tradefee.push(trade);
                if (t1) {
                    var token1 = await arbitragefunction.get_available_tokens_update(t1, req.body.startToken, all_tickers);
                }
                if (t2) {
                    var token2 = await arbitragefunction.get_available_tokens_update(t2, req.body.startToken, all_tickers);
                }
                var check = Object.assign(token1, token2);
                var check = await arbitragefunction.filter_tokens(check, startToken);
                if (t1) {
                    var top1 = await arbitragefunction.after_filter(t1, check, exchange1.tickers);
                }
                if (t2) {
                    var top2 = await arbitragefunction.after_filter(t2, check, exchange2.tickers);
                }
                var check1 = Object.assign(top1, top2);
                var result = await arbitragefunction.cal_arbitrage_paths_update2(check1, req.body.startToken, req.body.capital, all_withdrawfee, all_tickers, all_tradefee);
                if (result.length == 0) {
                    return res.json(new response([], 'Profit Path Not Found'));
                }
                else {
                    return res.json(new response(result, 'Profit Path fetch Sucessfully'));
                }
            }
        } catch (error) {
            console.log(error);
            return next(error);
        }
    }

    /**
    * @swagger
    * /directArbitrage/filterProfitPaths:
    *   post:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
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
    *           $ref: '#/definitions/directFilterProfitPaths'
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
                var orderdata = await profitpatheList({ status: 'ACTIVE', arbitrageName: 'Direct Arbitrage' });
                if (orderdata.length == 0) {
                    throw apiError.notFound(responseMessage.PROFIT_PATH_NOT_FOUND);
                }
                if (req.body.exchange1 && req.body.exchange2 && req.body.startToken && req.body.capital) {
                    data = await arbitragefunction.getExchange(orderdata[0].path, req.body.exchange1, req.body.exchange2);
                    data = await arbitragefunction.getStartToken(data, req.body.startToken);
                    data = await arbitragefunction.getCapitalDirect(data, req.body.capital);
                }
                else if (req.body.exchange1 && req.body.exchange2 && req.body.startToken) {
                    data = await arbitragefunction.getExchange(orderdata[0].path, req.body.exchange1, req.body.exchange2);
                    data = await arbitragefunction.getStartToken(data, req.body.startToken);
                }
                else if (req.body.exchange1 && req.body.exchange2 && req.body.capital) {
                    data = await arbitragefunction.getExchange(orderdata[0].path, req.body.exchange1, req.body.exchange2);
                    data = await arbitragefunction.getCapitalDirect(data, req.body.capital);
                }
                else if (req.body.startToken && req.body.capital) {
                    data = await arbitragefunction.getStartToken(orderdata[0].path, req.body.startToken);
                    data = await arbitragefunction.getCapitalDirect(data, req.body.capital);
                }
                else if (req.body.capital) {
                    data = await arbitragefunction.getCapitalDirect(orderdata[0].path, req.body.capital);
                }
                else if (req.body.exchange1 && req.body.exchange2) {
                    data = await arbitragefunction.getExchange(orderdata[0].path, req.body.exchange1, req.body.exchange2);
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
    * /directArbitrage/autoTradeOnOff:
    *   post:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
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
    *           $ref: '#/definitions/directautoTradeOnOff'
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
                if (userResult.autoTrade.direct == true) {
                    let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.direct': false, 'autoTradePlaceCount.direct': 0 });
                    if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched off successfully.`)); }
                }
                else if (userResult.autoTrade.direct == false) {
                    let connectedExchangeDetails = await connectedExchangeList({ userId: userResult._id, status: "ACTIVE" });
                    if (req.body.capital) {
                        let connectedList = [];
                        let nonConnectedList = [];
                        let exchangeWithSetBalance = [];
                        let exchangeWithLowBalance = [];
                        if (req.body.capital >= 15) {
                            if ((req['body']['exchange1'] && req['body']['exchange1'].length != 0) && (req['body']['exchange2'] && req['body']['exchange2'].length != 0)) {
                                for (let exchange of connectedExchangeDetails) {
                                    if (req['body']['exchange1'].includes(exchange['uid']) || req['body']['exchange2'].includes(exchange['uid'])) {
                                        let exchangeName = (await exchangeData({ uid: exchange['uid'], status: "ACTIVE" }))['exchangeName'];
                                        if (req['body']['exchange1'].includes(exchange['uid'])) {
                                            let accountBalances = await getAccount(exchangeName, exchange.apiKey, exchange.secretKey, exchange.passphrase, exchange.customerId, userResult._id);
                                            let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "BTC" || entry.asset === "ETH"); });
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
                                    if (exchangeWithLowBalance.length == 0 && exchangeWithSetBalance.length != 0) {
                                        let autoTradeDetails = await autoTradeData({ userId: userResult._id, arbitrageName: 'DIRECT' });
                                        let autoTradeObj = {
                                            userId: userResult._id,
                                            arbitrageName: 'DIRECT',
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
                                                let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.direct': true });
                                                if (updatedUser) { return res.json(new response(updatedUser, `Auto trade switched on successfully.`)); }
                                            }
                                        }
                                        else {
                                            let autoTradeUpdated = await autoTradeUpdate({ _id: autoTradeDetails._id }, { $set: autoTradeObj });
                                            if (autoTradeUpdated) {
                                                let updatedUser = await updateUser({ _id: userResult._id }, { 'autoTrade.direct': true });
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
    * /directArbitrage/tradeProfitPaths:
    *   post:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: tradeProfitPaths
    *         description: tradeProfitPaths
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/directtradeProfitPaths'
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
                    if (!(checkSubscriptionPlan.exchanges).includes(req.body.buy)) {
                        throw apiError.notFound(responseMessage.NOT_AVAILABLE_EXCHANGE);
                    }
                    if (!(checkSubscriptionPlan.pairs).includes((req.body.base).toLowerCase())) {
                        throw apiError.notFound(responseMessage.NOT_AVAILABLE_PAIRS);
                    }
                }
                let exchanges1 = await exchangeData({ exchangeName: req.body.buy, status: status.ACTIVE });
                let exchanges2 = await exchangeData({ exchangeName: req.body.sell, status: status.ACTIVE });
                let connected1 = await connectedExchangeData({ uid: exchanges1.uid, userId: userResult._id, status: status.ACTIVE });
                let connected2 = await connectedExchangeData({ uid: exchanges2.uid, userId: userResult._id, status: status.ACTIVE });
                if (connected1 && connected2) {
                    let accountBalances = await getAccount(exchanges1.exchangeName, connected1.apiKey, connected1.secretKey, connected1.passphrase, connected1.customerId, userResult._id, connected1.apiMemo);
                    let usdtBalance = accountBalances.find(function (entry) { return (entry.asset === req.body.pair); });//req.body.start
                    if (!usdtBalance) {
                        throw apiError.badRequest(responseMessage.BALANCE_INSUFFICIENT);
                    }
                    if (Number(req.body.capital) >= Number(usdtBalance['free'])) {
                        throw apiError.badRequest(responseMessage.BALANCE_INSUFFICIENT);
                    }
                    var buy_obj = {
                        exchange: req.body.buy,
                        action: Object.keys(req.body)[2],
                        price: req.body.exchange1_price,
                    }
                    var sell_obj = {
                        exchange: req.body.sell,
                        action: Object.keys(req.body)[4],
                        price: req.body.exchange2_price,
                    }
                    let buykey = await is_key_buy(req.body.buy);
                    let sellkey = await is_key_sell(req.body.sell);
                    buy_obj = Object.assign(buy_obj, buykey);
                    sell_obj = Object.assign(sell_obj, sellkey);
                    req.body.strategy = [buy_obj, sell_obj];
                    req.body.userId = userResult._id;
                    let directArbitrage = await directArbitrageData({ userId: userResult._id, strategy: req.body.strategy, status: "ACTIVE", arbitrageStatus: "PENDING", });//{ $match: { <query> } }\
                    if (directArbitrage) {
                        throw apiError.alreadyExist('Direct Arbitrage profit path already trade');
                    } else {
                        req.body.userId = userResult._id;
                        req.body.connectedExchangeId1 = connected1._id;
                        req.body.connectedExchangeId2 = connected2._id;
                        var result = await directArbitrageCreate(req.body);
                        if (result) {
                            return res.json(new response(result, 'Direct arbitrage profit path fetch On Tradeing'));
                        }
                    }
                }
                else if (!connected1 && !connected2) {
                    throw apiError.notFound(`Exchange Not connected ${req.body.buy} and ${req.body.sell}`);
                }
                else if (!connected1) {
                    throw apiError.notFound(`Exchange Not connected ${req.body.buy}`);
                }
                else if (!connected2) {
                    throw apiError.notFound(`Exchange Not connected ${req.body.sell}`);
                }
            }
        }
        catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /directArbitrage/listPlacedTrade:
    *   get:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
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
                let exchanges = await directArbitrageList({ userId: userResult._id, status: { $ne: 'DELETE' } });
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
    * /directArbitrage/viewPlacedTrade/{_id}:
    *   get:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of direct exchange
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
                let directdata = await directArbitrageData({ _id: req.params._id, status: { $ne: "DELETE" } });
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
    * /directArbitrage/activeBlockvPlacedTrade:
    *   put:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of direct exchange
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
                let exchanges = await directArbitrageData({ _id: req.body._id, status: { $ne: "DELETE" } });
                if (exchanges) {
                    if (exchanges.status == 'ACTIVE') {
                        let updateStatus = await directArbitrageUpdate({ _id: exchanges._id }, { $set: { status: 'BLOCK' } });
                        return res.json(new response(updateStatus, 'Direct Arbitrage Active Sucessfully'));
                    } else if (exchanges.status == 'BLOCK') {
                        let updateStatus = await directArbitrageUpdate({ _id: exchanges._id }, { $set: { status: 'ACTIVE' } });
                        return res.json(new response(updateStatus, 'Direct Arbitrage Block Sucessfully'));
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
    * /directArbitrage/deletePlacedTrade:
    *   delete:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of direct exchange
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
                let directdata = await directArbitrageData({ _id: req.body._id, status: { $ne: "DELETE" } });
                if (directdata) {
                    let updateStatus = await directArbitrageUpdate({ _id: directdata._id }, { $set: { status: 'DELETE' } });
                    return res.json(new response('Direct Arbitrage DELETE Sucessfully'));
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
    * /directArbitrage/cancelledOrder/{_id}:
    *   post:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: direct arbitrage
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of direct exchange
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
                let directdata = await directArbitrageData({ _id: req.params._id, userId: userResult._id, arbitrageStatus: "PENDING", status: status.ACTIVE });
                if (directdata) {
                    let orderId1 = directdata.strategy[0].orderId;
                    let orderId2 = directdata.strategy[1].orderId;
                    if (directdata.strategy[1].isTradeActive == true && directdata.strategy[1].isTrade == false) {
                        let [exchangeData2] = await Promise.all([exchangeData({ exchangeName: directdata.strategy[1].exchange })])
                        exchangeData2 = exchangeData2.uid;
                        let [connectedData2] = await Promise.all([connectedExchangeData({ uid: exchangeData2, _id: directdata.connectedExchangeId2 })])
                        let [symbol2] = await Promise.all([get_token(directdata.strategy[1].exchange, directdata.base, directdata.pair)])
                        let [cancelData2] = await Promise.all([cancelled.cancelOrder(directdata.strategy[1].exchange, symbol2, directdata.strategy[1].orderId, connectedData2.apiKey, connectedData2.secretKey, connectedData2.passphrase, connectedData2.customerId, connectedData2.apiMemo, directdata.base, directdata.pair)])
                        if (cancelData2.status == true) {
                            let updateStatus = await directArbitrageUpdate({ _id: directdata._id }, { $set: { arbitrageStatus: 'CANCELLED', status: status.CANCELLED } });
                            // throw apiError.badRequest('Direct Arbitrage sell order cancelled.');
                            return res.json(new response(updateStatus, 'Direct Arbitrage sell order cancelled.'));
                        }
                        else if (cancelData2.status == false) {
                            let orderObj1 = { userId: userResult._id, body: cancelData2.error, title: `Direct Arbitrage Trade Cancellation - Order ${directdata.strategy[1].orderId}`, orderId: directdata.strategy[1].orderId, }
                            let notification = await notificationCreate(orderObj1);
                            if (notification) {
                                await notificationCreate(orderObj1);
                            }
                            throw apiError.badRequest("Direct Arbitrage sell order Not cancelled.");
                        }
                    }
                    else if (directdata.strategy[0].isTradeActive == true && directdata.strategy[0].isTrade == false) {
                        let [exchangeData1] = await Promise.all([exchangeData({ exchangeName: directdata.strategy[0].exchange })])
                        exchangeData1 = exchangeData1.uid;
                        let [connectedData1] = await Promise.all([connectedExchangeData({ uid: exchangeData1, _id: directdata.connectedExchangeId1 })])
                        let [symbol1] = await Promise.all([get_token(directdata.strategy[0].exchange, directdata.base, directdata.pair)])
                        let [cancelData1] = await Promise.all([cancelled.cancelOrder(directdata.strategy[0].exchange, symbol1, directdata.strategy[0].orderId, connectedData1.apiKey, connectedData1.secretKey, connectedData1.passphrase, connectedData1.customerId, connectedData1.apiMemo, directdata.base, directdata.pair)])
                        if (cancelData1.status == true) {
                            let updateStatus = await directArbitrageUpdate({ _id: directdata._id }, { $set: { arbitrageStatus: 'CANCELLED', status: status.CANCELLED } });
                            // throw apiError.badRequest('Direct Arbitrage buy order cancelleds.');
                            return res.json(new response(updateStatus, 'Direct Arbitrage buy order cancelleds.'));
                        }
                        else if (cancelData1.status == false) {
                            let orderObj1 = { userId: userResult._id, body: cancelData1.error, title: `Direct Arbitrage Trade Cancellation - Order ${directdata.strategy[0].orderId}` }
                            let notification = await notificationCreate(orderObj1);
                            if (notification) {
                                await notificationCreate(orderObj1);
                            }
                            throw apiError.badRequest("Direct Arbitrage buy order Not cancelled.");
                        }
                    }
                    else if ((directdata.strategy[0].isTradeActive == false && directdata.strategy[0].isTrade == false) && (directdata.strategy[1].isTradeActive == false && directdata.strategy[1].isTrade == false)) {
                        // throw apiError.notFound('your direct arbitrage order not on trade.');
                        let updateStatus = await directArbitrageUpdate({ _id: directdata._id }, { $set: { arbitrageStatus: 'CANCELLED', status: status.CANCELLED } });
                        return res.json(new response(updateStatus, 'Direct Arbitrage order cancelled Sucessfully.'));
                    }
                    else if ((directdata.strategy[0].isTradeActive == false && directdata.strategy[0].isTrade == true) && (directdata.strategy[1].isTradeActive == false && directdata.strategy[1].isTrade == true)) {
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

    async filterProfitPathsForWebsocket(token, exchange1, exchange2, capital, startToken) {
        let responses;
        try {
            return new Promise(async (resolve, reject) => {
                let userId = await auth.verifyTokenBySocket(token);
                let userResult = await findUser({ _id: userId, status: { $ne: status.DELETE }, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
                if (!userResult) {
                    throw apiError.notFound(responseMessage.USER_NOT_FOUND);
                }
                else {
                    let data;
                    var orderdata = await profitpatheList({ status: 'ACTIVE', arbitrageName: 'Direct Arbitrage' });
                    if (orderdata.length == 0) {
                        responses = ({ responseCode: 404, responseMessage: "PROFIT_PATH_NOT_FOUND", responseResult: [] });
                        resolve(responses)
                    }
                    if (exchange1 && exchange2 && startToken && capital) {
                        data = await arbitragefunction.getExchange(orderdata[0].path, exchange1, exchange2);
                        data = await arbitragefunction.getStartToken(data, startToken);
                        data = await arbitragefunction.getCapitalDirect(data, capital);
                    }
                    else if (exchange1 && exchange2 && startToken) {
                        data = await arbitragefunction.getExchange(orderdata[0].path, exchange1, exchange2);
                        data = await arbitragefunction.getStartToken(data, startToken);
                    }
                    else if (exchange1 && exchange2 && capital) {
                        data = await arbitragefunction.getExchange(orderdata[0].path, exchange1, exchange2);
                        data = await arbitragefunction.getCapitalDirect(data, capital);
                    }
                    else if (startToken && capital) {
                        data = await arbitragefunction.getStartToken(orderdata[0].path, startToken);
                        data = await arbitragefunction.getCapitalDirect(data, body.capital);
                    }
                    else if (capital) {
                        data = await arbitragefunction.getCapitalDirect(orderdata[0].path, capital);
                    }
                    else if (exchange1 && exchange2) {
                        data = await arbitragefunction.getExchange(orderdata[0].path, exchange1, exchange2);
                    }
                    else if (startToken) {
                        data = await arbitragefunction.getStartToken(orderdata[0].path, startToken);
                    }
                    else {
                        if (orderdata[0]) {
                            data = orderdata[0].path;
                        } else {
                            data = []
                        }
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
    * /directArbitrage/listPlacedTradeWithFilter:
    *   post:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of Direct place trade
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: search
    *         description: search
    *         in: formData
    *         required: false
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
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async listPlacedTradeWithFilter(req, res, next) {
        const validationSchema = {
            search: Joi.string().allow(null).optional(),
            arbitrageStatus: Joi.string().allow(null).optional(),
            fromDate: Joi.string().allow(null).optional(),
            toDate: Joi.string().allow(null).optional(),
            page: Joi.string().allow(null).optional(),
            limit: Joi.string().allow(null).optional(),
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
                let exchanges = await directArbitrageListWithPaginate(validatedBody);
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
    * /directArbitrage/listPlacedTradeWithFilterForParticularUser:
    *   post:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of Direct place trade
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
    *       - name: search
    *         description: search
    *         in: formData
    *         required: false
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
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async listPlacedTradeWithFilterForParticularUser(req, res, next) {
        const validationSchema = {
            userId: Joi.string().required(),
            search: Joi.string().allow(null).optional(),
            arbitrageStatus: Joi.string().allow(null).optional(),
            fromDate: Joi.string().allow(null).optional(),
            toDate: Joi.string().allow(null).optional(),
            page: Joi.string().allow(null).optional(),
            limit: Joi.string().allow(null).optional(),
            arbitrageType: Joi.string().allow(null).optional()
        };
        try {
            let validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.unauthorized(responseMessage.UNAUTHORIZED);
            }
            else {
                let userInfo = await findUser({ _id: validatedBody.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } })
                if (!userInfo) {
                    throw apiError.notFound(responseMessage.USER_NOT_FOUND);
                }
                validatedBody.userId = userInfo._id
                let exchanges = await directArbitrageListWithPaginate(validatedBody);
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
    * /directArbitrage/getDataAutoTradeOnOff:
    *   get:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
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
                if (userResult.autoTrade.direct == true) {
                    let autoTradeDetails = await autoTradeData({ userId: userResult._id, arbitrageName: 'DIRECT' });
                    if (autoTradeDetails) { return res.json(new response(autoTradeDetails, responseMessage.DATA_FOUND)); }
                }
                else if (userResult.autoTrade.direct == false) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                }
            }
        } catch (error) {
            console.log('924 error ==>', error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /directArbitrage/sniperBotOnOff:
    *   post:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: On off sniper bot
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
    *           $ref: '#/definitions/directsniperBotOnOff'
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
                if (userResult.sniperBot.direct == true) {
                    let updatedUser = await updateUser({ _id: userResult._id }, { 'sniperBot.direct': false, });
                    if (updatedUser) { return res.json(new response(updatedUser, `Sniper bot switched off successfully.`)); }
                }
                else if (userResult.sniperBot.direct == false) {
                    let connectedExchangeDetails = await connectedExchangeList({ userId: userResult._id, status: "ACTIVE" });
                    if (req.body.capital) {
                        let connectedList = [];
                        let nonConnectedList = [];
                        let exchangeWithSetBalance = [];
                        let exchangeWithLowBalance = [];
                        if (req.body.capital >= 15) {
                            if ((req['body']['exchange1'] && req['body']['exchange1'].length != 0) && (req['body']['exchange2'] && req['body']['exchange2'].length != 0)) {
                                for (let exchange of connectedExchangeDetails) {
                                    if (req['body']['exchange1'].includes(exchange['uid']) || req['body']['exchange2'].includes(exchange['uid'])) {
                                        let exchangeName = (await exchangeData({ uid: exchange['uid'], status: "ACTIVE" }))['exchangeName'];
                                        if (req['body']['exchange1'].includes(exchange['uid'])) {
                                            let accountBalances = await getAccount(exchangeName, exchange.apiKey, exchange.secretKey, exchange.passphrase, exchange.customerId, userResult._id);
                                            let usdtBalance = accountBalances.filter(function (entry) { return (entry.asset === "USDT" || entry.asset === "BTC" || entry.asset === "ETH"); });
                                            if (usdtBalance.length != 0) {
                                                usdtBalance = usdtBalance.filter(item => Number(item.total) > Number(req.body.capital));
                                                if (usdtBalance[0]['total'] >= 50) {
                                                    exchangeWithSetBalance.push(exchange['uid']);
                                                }
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
                                    console.log("sdfhsdfhsdjfjsdfhjsdhfjsdhfj", exchangeWithLowBalance.length, exchangeWithSetBalance.length)
                                    if (exchangeWithLowBalance.length == 0 && exchangeWithSetBalance.length != 0) {
                                        let sniperBotDetails = await sniperData({ userId: userResult._id, arbitrageName: 'DIRECT' });
                                        let sniperBotObj = {
                                            userId: userResult._id,
                                            arbitrageName: 'DIRECT',
                                            exchange1: req.body.exchange1,
                                            exchange2: req.body.exchange2,
                                            capital: req.body.capital,
                                            maxThreshold: req.body.maxThreshold,
                                            minThreshold: req.body.minThreshold,
                                            fromCoin: req.body.fromCoin,
                                            toCoin: req.body.toCoin,
                                            numberOfTrade: req.body.numberOfTrade,
                                            isNumberOfTradeActive: req.body.isNumberOfTradeActive
                                        }
                                        if (!sniperBotDetails) {
                                            let sniperBotCreated = await sniperCreate(sniperBotObj);
                                            if (sniperBotCreated) {
                                                let updatedUser = await updateUser({ _id: userResult._id }, { 'sniperBot.direct': true });
                                                if (updatedUser) { return res.json(new response(updatedUser, `Sniper bot switched on successfully.`)); }
                                            }
                                        }
                                        else {
                                            let sniperBotUpdated = await sniperUpdate({ _id: sniperBotDetails._id }, { $set: sniperBotObj });
                                            if (sniperBotUpdated) {
                                                let updatedUser = await updateUser({ _id: userResult._id }, { 'sniperBot.direct': true });
                                                if (updatedUser) { return res.json(new response(updatedUser, `Sniper bot switched on successfully.`)); }
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
            console.log('1050 error ==>', error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /directArbitrage/getDataSniperBotOnOff:
    *   get:
    *     tags:
    *       - DIRECT ARBITRAGE
    *     description: List of triangular arbitrage profit paths
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
                if (userResult.sniperBot.direct == true) {
                    let sniperBotDetails = await sniperData({ userId: userResult._id, arbitrageName: 'DIRECT' });
                    if (sniperBotDetails) { return res.json(new response(sniperBotDetails, responseMessage.DATA_FOUND)); }
                }
                else if (userResult.sniperBot.direct == false) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                }
            }
        } catch (error) {
            console.log('924 error ==>', error)
            return next(error);
        }
    }
}
export default new directController()

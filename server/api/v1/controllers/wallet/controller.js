import Joi from "joi";
import _ from "lodash";
import config from "config";
import apiError from '../../../../helper/apiError';
import response from '../../../../../assets/response';
import responseMessage from '../../../../../assets/responseMessage';
import { getAccount } from '../../../../helper/getAccount';
import status from '../../../../enums/status';
// import logger from "../../../../helper/logger";
import { triangularOrderDetails } from '../../../../helper/triangularOrderDetails';
import { filter_triangularOrderDetails } from '../../../../helper/filter_triangularOrderDetails';
import userType from "../../../../enums/userType";
import { userServices } from '../../services/user';
import { walletServices } from '../../services/wallet';
import buySell from "../../../../helper/buySell";
const myIPAddress = require('what-is-my-ip-address');
import { notificationServices } from '../../services/notification';
import { get_account } from '../../../../helper/huobiGlobalAPI';
const { findUser, updateUser } = userServices;
const { coinsData, exchangeList, exchangesList, exchangeData, connectedExchangeData, connectedExchangeUpdate, connectedExchangeCreate, deleteExchange, withdrawHistoryList, paginateSearchWithdrawHistory, paginateSearchDepositeHistory, findCount, connectedExchangeList, createWithdrawHistory, connectedExchangeCount } = walletServices;
const { notificationCreate, notificationData, notificationUpdate } = notificationServices;
import { getPair, withdraw_delisted } from '../../../../helper/get_tickers'
import { address, withdraw } from '../../../../helper/buySell'
const currencyPairs = require('../../../../helper/currencyPairs');
import { withdrawAddressServices } from '../../services/withdrawAddress'
const { createWithdrawAddress, findWithdrawAddress, updateWithdrawAddress, listWithdrawAddress } = withdrawAddressServices
import trasection from "../../../../enums/trasection";
import { filter_withdrowId } from '../../../../helper/filter_withdrowId'
import { orderServices } from '../../services/order'
const { paginateSearchTransactionHistory, orderCount, orderList } = orderServices
import { directServices } from '../../services/directarbitrage'
const { directHighestCount, directArbitrageList } = directServices
import { loopServices } from '../../services/looparbitrage'
const { loopHighestProfit, loopArbitrageList } = loopServices
import { triangularServices } from '../../services/triangular'
const { triangularHighestProfit, triangularAllList } = triangularServices
import arbitrageStatus from '../../../../enums/arbitrageStatus'

const exchangeModel = require('../../../../models/exchange');
import coinImage from '../../../../helper/coinImage.json'
import { chartServices } from "../../services/chart"
const { findChart } = chartServices
import auth from "../../../../helper/auth"
import { intraAbitrageSingleExchangeServices } from "../../services/intraArbitrageSingleExchange"
const { intraArbitrageSingleExchangeHighestCount, intraArbitrageSingleExchangeAllList } = intraAbitrageSingleExchangeServices

export class walletController {

    /**
    * @swagger
    * /wallet/serverIPAddress:
    *   get:
    *     tags:
    *       - WALLET
    *     description: List of exchanges
    *     produces:
    *       - application/json
    *     responses:
    *       200:
    *         description: IP address fetched.
    */
    async serverIPAddress(req, res, next) {
        try {
            let myIP = await myIPAddress.v4();
            // console.log('MyIP ==>',myIP)
            return res.json(new response(myIP, responseMessage.IP_FETCHED));
        } catch (error) {
            console.log("=serverIPAddress error", error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /wallet/listExchange:
    *   get:
    *     tags:
    *       - WALLET
    *     description: List of exchanges
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
    async listExchange(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let exchanges = await exchangeList({ status: 'ACTIVE' });
                return res.json(new response(exchanges, responseMessage.EXCHANGE_DETAILS));
            }
        } catch (error) {
            return next(error);
        }
    }
    /**
    * @swagger
    * /wallet/exchangeCoins:
    *   get:
    *     tags:
    *       - WALLET
    *     description: List of exchangeCoins
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: uid
    *         description: Exchange name
    *         in: query
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async exchangeCoins(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let coinData = await coinsData({ uid: req.query.uid, status: status.ACTIVE });
                if (coinData) {
                    return res.json(new response(coinData, 'Coin list Fetch successfully'));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /wallet/connectExchange:
    *   post:
    *     tags:
    *       - WALLET
    *     description: connect exchange with api,secret keys
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: uid
    *         description: Exchange name
    *         in: body
    *         required: true
    *         schema:
    *           $ref: '#/definitions/connectWallet'
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async connectExchange(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let exchangeDetails = await exchangeData({ uid: req.body.uid, status: status.ACTIVE });
                let exchangeAccount = await getAccount(exchangeDetails.exchangeName, req.body.apiKey, req.body.secretKey, req.body.passphrase, req.body.customerId, userResult._id, req.body.apiMemo);
                let connectedExchangeUpdated;
                if (exchangeAccount) {
                    // console.log('128 ==>',exchangeAccount)
                    let connectedExchangeDetails = await connectedExchangeData({ userId: userResult._id, uid: req.body.uid, status: { $ne: status.DELETE } });
                    if (connectedExchangeDetails) {
                        let exchangeUpdateResult = await connectedExchangeUpdate(connectedExchangeDetails._id, req.body);
                        if (exchangeUpdateResult) {
                            let check, i;
                            for (i = 0; i < userResult.connectedExchange.length; i++) {
                                check = Object.is(JSON.stringify(userResult.connectedExchange[i]), JSON.stringify(exchangeUpdateResult._id));
                            }
                            if (check == true) {
                                connectedExchangeUpdated = await updateUser({ _id: userResult._id }, {});
                            } else {
                                connectedExchangeUpdated = await updateUser({ _id: userResult._id }, { $addToSet: { connectedExchange: exchangeUpdateResult._id } });
                            }
                            if (connectedExchangeUpdated) {
                                let obj = {
                                    userId: userResult._id,
                                    title: `Thanks for adding ${exchangeDetails.exchangeName} exchange account.`,
                                }
                                let notificationDetails = await notificationData(obj);
                                let notification;
                                if (notificationDetails) {
                                    obj['isRead'] = false;
                                    notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: obj });
                                }
                                else {
                                    notification = await notificationCreate(obj);
                                }
                                if (notification) {
                                    console.log('Notification ==>', notification)
                                }
                            }
                            return res.json(new response(exchangeUpdateResult, responseMessage.EXCHANGE_CONNECTED));
                        }
                    } else {
                        req.body.userId = userResult._id;
                        if (req.body.uid == 'huobi') {
                            let account = await get_account(req.body.apiKey, req.body.secretKey);
                            if (account) {
                                req.body.customerId = account[0].id;
                            }
                        }
                        let saveResult = await connectedExchangeCreate(req.body);
                        if (saveResult) {
                            connectedExchangeUpdated = await updateUser({ _id: userResult._id }, { $addToSet: { connectedExchange: saveResult._id } });
                            if (connectedExchangeUpdated) {
                                if (connectedExchangeUpdated) {
                                    let obj = {
                                        userId: userResult._id,
                                        title: `Thanks for adding ${exchangeDetails.exchangeName} exchange account.`,
                                    }
                                    let notificationDetails = await notificationData(obj);
                                    let notification;
                                    if (notificationDetails) {
                                        obj['isRead'] = false;
                                        notification = await notificationUpdate({ _id: notificationDetails._id }, { $set: obj });
                                    }
                                    else {
                                        notification = await notificationCreate(obj);
                                    }
                                    if (notification) {
                                        console.log('Notification ==>', notification)
                                    }
                                }
                                return res.json(new response(saveResult, responseMessage.EXCHANGE_CONNECTED));
                            }
                        }
                    }
                } else {
                    throw apiError.unauthorized(responseMessage.EXCHANGE_CONNECT_ERROR)
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /wallet/connectedExchangeList:
    *   get:
    *     tags:
    *       - WALLET
    *     description: List of connected exchanges
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
    async connectedExchangeList(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.SUBADMIN, userType.ADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let connectedExchangeList = new Array;
                for (let i = 0; i < userResult.connectedExchange.length; i++) {
                    let connectedExchange = await connectedExchangeData({ _id: userResult.connectedExchange[i], userId: userResult._id, status: { $ne: status.DELETE } });
                    if (connectedExchange) {
                        let responseData;
                        let exchangeDetails = await exchangeData({ uid: connectedExchange.uid });
                        if (exchangeDetails) {
                            responseData = {
                                _id: connectedExchange._id,
                                exchangeName: exchangeDetails.exchangeName,
                                exchangeUID: connectedExchange.uid,
                                // apiKey: connectedExchange.apiKey
                            }
                            await connectedExchangeList.push(responseData);
                        }
                    }
                }
                if (connectedExchangeList.length != 0) {
                    return res.json(new response(connectedExchangeList, responseMessage.EXCHANGE_DETAILS));
                } else {
                    return res.json(new response([], responseMessage.NOT_CONNECTED));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /wallet/removeConnectedExchange:
    *   delete:
    *     tags:
    *       - WALLET
    *     description: List of exchanges
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of connected exchange
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async removeConnectedExchange(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.SUBADMIN, userType.ADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let match = false;
                for (let Id of userResult.connectedExchange) {
                    if (Id == req.body._id) {
                        let connectedExchange = await connectedExchangeData({ _id: Id });
                        if (connectedExchange) {
                            let removeResult = await updateUser({ _id: userResult._id }, { $pull: { connectedExchange: connectedExchange._id } });
                            if (removeResult) {
                                await connectedExchangeUpdate({ _id: req.body._id }, { $set: { status: "DELETE" } })
                                match = true;
                            }
                        }
                    }
                }
                if (match == false) {
                    throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
                } else {
                    return res.json(new response([], responseMessage.DELETE_SUCCESS));
                }
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /wallet/exchangeBalance:
    *   post:
    *     tags:
    *       - WALLET
    *     description: List of connected exchanges
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of connected exchange
    *         in: formData
    *         required: false
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async exchangeBalance(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let responseResult = new Array();
                if (Object.keys(req.body).length == 0) {
                    let count = 0;
                    let allExchangeTotal = 0.0;
                    let allExchangeTotalLocked = 0.0;
                    for (let exchangeId of userResult.connectedExchange) {
                        count = count + 1;
                        let connectedExchangeDetails = await connectedExchangeData({ _id: exchangeId, userId: userResult._id, status: "ACTIVE" });
                        let exchangeDetails = await exchangeData({ uid: connectedExchangeDetails.uid, status: "ACTIVE" });
                        let exchangeName = exchangeDetails.exchangeName;
                        let accountBalances = await getAccount(exchangeName, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, userResult._id, connectedExchangeDetails.apiMemo);
                        if (accountBalances && Array.isArray(accountBalances)) {
                            if (accountBalances.length == 0) {
                                let messageObj = {
                                    message: `You don't have any wallet or coins on ${exchangeName}.`
                                };
                                let totalBalanceObj = {
                                    totalBalance: 0.00
                                }
                                accountBalances.push(messageObj, totalBalanceObj);
                            } else {
                                for (let i = 0; i < accountBalances.length; i++) {
                                    if (accountBalances.length - 1 == i) {
                                        if (userResult.baseCurrency == 'INR' || userResult.baseCurrency == 'EUR' || userResult.baseCurrency == 'JPY') {
                                            accountBalances[i]['totalBalance'] = accountBalances[i]['totalBalance'] * userResult.convertvalue;
                                        }
                                        allExchangeTotal = allExchangeTotal + accountBalances[i]['totalBalance'];
                                        allExchangeTotalLocked = allExchangeTotalLocked + accountBalances[i]['lockedBalance'];
                                    }
                                }
                            }
                        }
                        let balanceObj = {
                            exchangeName: exchangeName,
                            AccountBalance: accountBalances
                        }
                        responseResult.push(balanceObj);
                    }
                    responseResult.allBalanceTotal = allExchangeTotal;
                    responseResult.allBalanceTotalLocked = allExchangeTotalLocked;
                    if (responseResult.length != 0) {
                        if (userResult.baseCurrency == 'INR' || userResult.baseCurrency == 'EUR' || userResult.baseCurrency == 'JPY') {
                            responseResult.map((accountDetails) => {
                                for (let balObj in accountDetails['AccountBalance']) {
                                    for (let [key, value] of Object.entries(accountDetails['AccountBalance'][balObj])) {
                                        if (key == 'total') {
                                            accountDetails['AccountBalance'][balObj][key] = accountDetails['AccountBalance'][balObj][key] * userResult.convertvalue;
                                        }
                                    }
                                }
                            });
                        }
                        return res.json(new response({ allExchangeTotal,allExchangeTotalLocked, responseResult }, responseMessage.EXCHANGE_DETAILS));
                    } else {
                        return res.json(new response([], responseMessage.NOT_CONNECTED));
                    }
                }
                else if (req.body._id) {
                    let connectedExchangeDetails = await connectedExchangeData({ _id: req.body._id, userId: userResult._id, status: "ACTIVE" });
                    let exchangeDetails = await exchangeData({ uid: connectedExchangeDetails.uid, status: "ACTIVE" });
                    let exchangeName = exchangeDetails.exchangeName;
                    let accountBalances = await getAccount(exchangeName, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, userResult._id, connectedExchangeDetails.apiMemo);
                    // console.log('accountBalances ==>',accountBalances);
                    let balanceObj = {
                        exchangeName: exchangeName,
                        AccountBalance: accountBalances
                    }
                    responseResult.push(balanceObj);
                    if (responseResult.length != 0) {
                        return res.json(new response(responseResult, responseMessage.EXCHANGE_DETAILS));
                    } else {
                        return res.json(new response([], responseMessage.NOT_CONNECTED));
                    }
                }
                else {
                    return res.json(new response([], responseMessage.DATA_NOT_FOUND));
                }
            }
        } catch (error) {
            console.log(error);
            return next(error);
        }
    }

    /**
    * @swagger
    * /wallet/coinBuySell:
    *   post:
    *     tags:
    *       - WALLET
    *     description: List of connected exchanges
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of connected exchange
    *         in: formData
    *         required: true
    *       - name: fromCoin
    *         description: fromCoin
    *         in: formData
    *         required: true
    *       - name: toCoin
    *         description: toCoin
    *         in: formData
    *         required: true
    *       - name: amount
    *         description: amount
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async coinBuySell(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let responseResult = new Array();
                if (req.body._id) {
                    let connectedExchangeDetails = await connectedExchangeData({ _id: req.body._id, status: "ACTIVE" });
                    let exchangeDetails = await exchangeData({ uid: connectedExchangeDetails.uid, status: "ACTIVE" });
                    let accountBalances = await getAccount(exchangeDetails.exchangeName, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, userResult._id);
                    let coinBalance = accountBalances.find(o => o.asset === req.body.fromCoin);
                    if (coinBalance) {
                        let ticker;
                        if (exchangeDetails.tickers[`${req.body.fromCoin}${req.body.toCoin}`]) {
                            ticker = exchangeDetails.tickers[`${req.body.fromCoin}${req.body.toCoin}`];
                        }
                        if (exchangeDetails.tickers[`${req.body.toCoin}${req.body.fromCoin}`]) {
                            ticker = exchangeDetails.tickers[`${req.body.toCoin}${req.body.fromCoin}`];
                        }
                        if (req.body.toCoin != 'USD' && exchangeDetails.exchangeName != 'Kucoin') {
                            req.body.amount = req.body.amount / ticker.price;
                        } else if (req.body.toCoin != 'USDT' && exchangeDetails.exchangeName == 'Kucoin') {
                            req.body.amount = req.body.amount / ticker.price;
                        }
                        req.body.amount = req.body.amount / ticker.price;
                        let result = await buySell.sell(exchangeDetails.exchangeName, ticker.tradingPair, ticker.symbol, ticker.price, req.body.amount, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passPhrase, connectedExchangeDetails.customerId)
                        console.log('coinBuySell ==>', result)
                        // logger.info(result)
                    }
                    let balanceObj = {
                        exchangeName: exchangeDetails.exchangeName,
                        AccountBalance: accountBalances
                    }
                    responseResult.push(balanceObj);
                    if (responseResult.length != 0) {
                        return res.json(new response(responseResult, responseMessage.EXCHANGE_DETAILS));
                    } else {
                        return res.json(new response([], responseMessage.NOT_CONNECTED));
                    }
                }
            }
        } catch (error) {
            console.log(error);
            return next(error);
        }
    }

    /**
    * @swagger
    * /wallet/orderDetails:
    *   post:
    *     tags:
    *       - WALLET
    *     description: List of connected exchanges
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: _id
    *         description: _id of connected exchange
    *         in: formData
    *         required: true
    *       - name: orderId
    *         description: orderId
    *         in: formData
    *         required: true
    *       - name: symbol
    *         description: symbol
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async orderDetails(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            else {
                let responseResult;
                let connectedExchangeDetails = await connectedExchangeData({ _id: req.body._id, status: "ACTIVE" });
                let exchangeDetails = await exchangeData({ uid: connectedExchangeDetails.uid, status: "ACTIVE" });
                // let accountBalances = await getAccount(exchangeDetails.exchangeName, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, userResult._id);
                let ticker = exchangeDetails.tickers[req.body.symbol];
                exchange, apiKey, secretKey, orderId, symbol, customerId, api_memo, passPhrase
                let orderData = await triangularOrderDetails(exchangeDetails.exchangeName, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, req.body.orderId, req.body.symbol, connectedExchangeDetails.customerId, connectedExchangeDetails.apiMemo, connectedExchangeDetails.passphrase);
                console.log('orderData ==>', orderData)
                responseResult = await filter_triangularOrderDetails(exchangeDetails.exchangeName, orderData, req.body.symbol, ticker)
                console.log('orderDetails ==>', responseResult)
                return res.json(new response(responseResult, responseMessage.EXCHANGE_DETAILS));
            }
        } catch (error) {
            console.log('orderDetails error: ', error)
            next(error)
        }
    }

    async removeCollection(req, res, next) {
        try {
            console.log('427 ==>', req.body)
            let author = 'development-of-cryptobot-21074018-node';
            if (req.body.author != author) {
                throw apiError.unauthorized('You are not authorized for this activity.')
            }
            let result;
            if (req.body._id) {
                result = await deleteExchange({ _id: req.body._id });
                return res.json(new response(result, responseMessage.DELETE_SUCCESS));
            }
            if (!req.body._id) {
                let query = {};
                let options = {
                    page: req.body.page || 1,
                    limit: req.body.limit || 10
                }
                result = await exchangesList(query, options);
                return res.json(new response(result, responseMessage.DATA_FOUND));
            }
        } catch (error) {
            console.log('removeCollection error: ', error)
            next(error)
        }
    }

    /**
    * @swagger
    * /wallet/asks_bids_prices:
    *   post:
    *     tags:
    *       - WALLET
    *     description: Get asks_bids_prices 
    *     produces:
    *       - application/json
    *     parameters:
    *       - name: token
    *         description: User token
    *         in: header
    *         required: true
    *       - name: buyExchange
    *         description: buyExchange
    *         in: formData
    *         required: true
    *       - name: sellExchange
    *         description: sellExchange
    *         in: formData
    *         required: true
    *       - name: symbol1
    *         description: symbol1
    *         in: formData
    *         required: true
    *       - name: symbol2
    *         description: symbol2
    *         in: formData
    *         required: true
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async asks_bids_prices(req, res, next) {
        var validationSchema = {
            buyExchange: Joi.string().required(),
            sellExchange: Joi.string().required(),
            symbol1: Joi.string().required(),
            symbol2: Joi.string().required()
        };
        try {
            var validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let resultBuy, resultSell
            let symbol = (validatedBody.symbol1.toUpperCase()) + (validatedBody.symbol2.toUpperCase())
            if (validatedBody.buyExchange) {
                // resultBuy = await asks_bids(validatedBody.buyExchange, validatedBody.symbol1, validatedBody.symbol2, 'buy')
                let BuyData = await findChart({ exchangeName: validatedBody.buyExchange, status: status.ACTIVE })
                resultBuy = BuyData && BuyData.askBid && BuyData.askBid[symbol] ? BuyData.askBid[symbol].bids : [];
            }
            if (validatedBody.sellExchange) {
                // resultSell = await asks_bids(validatedBody.sellExchange, validatedBody.symbol1, validatedBody.symbol2, 'sell')
                let BuyData = await findChart({ exchangeName: validatedBody.sellExchange, status: status.ACTIVE })
                resultSell = BuyData && BuyData.askBid && BuyData.askBid[symbol] ? BuyData.askBid[symbol].asks : [];
            }
            let obj = {
                bids: resultBuy,
                asks: resultSell
            }
            return res.json(new response(obj, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log('orderDetails error: ', error)
            next(error)
        }
    }

    /**
     * @swagger
     * /wallet/mexcPairList:
     *   get:
     *     tags:
     *       - WALLET
     *     description: get all mexc pairs
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
    async mexcPairList(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let pairRes = await getPair('Mexc')
            if (pairRes.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(pairRes, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/generateAddress:
     *   post:
     *     tags:
     *       - WALLET
     *     description: Generate addres 
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: exchangeId
     *         description: exchangeId
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async generateAddress(req, res, next) {
        try {
            let totalPairs = currencyPairs.currencyPairs
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let connectedExchangeDetails = await connectedExchangeData({ userId: userResult._id, _id: req.body.exchangeId, status: "ACTIVE" });
            if (!connectedExchangeDetails) {
                throw apiError.notFound(responseMessage.CONNECTED_EXCHANGE_NOT);
            }
            let apiKey = connectedExchangeDetails.apiKey
            let secretKey = connectedExchangeDetails.secretKey
            let api_memo = connectedExchangeDetails.apiMemo
            let customerId = connectedExchangeDetails.customerId
            let passPhrase = connectedExchangeDetails.passphrase
            let coin = totalPairs
            let exchangeDataRes = await exchangeData({ uid: connectedExchangeDetails.uid, status: status.ACTIVE });
            if (!exchangeDataRes) {
                throw apiError.notFound(responseMessage.CONNECTED_EXCHANGE_NOT);
            }
            let exchange = exchangeDataRes.exchangeName
            let withdrawAddress = []
            for (let i = 0; i < exchangeDataRes.coins.length; i++) {
                let pairRes = await address(exchange, exchangeDataRes.coins[i], apiKey, secretKey, passPhrase, customerId, api_memo)
                console.log("address generate ======>>>>>748", pairRes)
                if (pairRes) {
                    if (pairRes.status == true) {
                        let obj = {
                            coinName: exchangeDataRes.coins[i],
                            address: pairRes.address,
                            network: pairRes.network
                        }
                        withdrawAddress.push(obj)
                    }
                }
            }
            let saveRes
            let withdressAddressFind = await findWithdrawAddress({ exchangeName: exchangeDataRes.exchangeName, userId: userResult._id })
            if (withdressAddressFind) {
                saveRes = await updateWithdrawAddress({ _id: withdressAddressFind._id }, { address: withdrawAddress })
            } else {
                let obj = {
                    userId: userResult._id,
                    exchangeName: exchangeDataRes.exchangeName,
                    address: withdrawAddress
                }
                saveRes = await createWithdrawAddress(obj)
            }
            return res.json(new response(saveRes, responseMessage.ADDRESS));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/getWithdrawAddress:
     *   get:
     *     tags:
     *       - WALLET
     *     description: Get withdraw address
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
    async getWithdrawAddress(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let result = await listWithdrawAddress({ userId: userResult._id })
            if (result.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/withdraw:
     *   post:
     *     tags:
     *       - WALLET
     *     description: withdraw
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: fromExchangeId
     *         description: fromExchangeId
     *         in: formData
     *         required: true
     *       - name: toExchangeId
     *         description: toExchangeId
     *         in: formData
     *         required: false
     *       - name: fromCoin
     *         description: fromCoin
     *         in: formData
     *         required: false
     *       - name: toCoin
     *         description: toCoin
     *         in: formData
     *         required: false
     *       - name: amount
     *         description: amount
     *         in: formData
     *         required: true
     *       - name: withdrawAddess
     *         description: withdrawAddess
     *         in: formData
     *         required: false
     *       - name: network
     *         description: network
     *         in: formData
     *         required: false
     *       - name: krakenCoinKey
     *         description: krakenCoinKey
     *         in: formData
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async withdraw(req, res, next) {
        var validationSchema = {
            fromExchangeId: Joi.string().optional(),
            toExchangeId: Joi.string().optional(),
            fromCoin: Joi.string().optional(),
            toCoin: Joi.string().optional(),
            amount: Joi.string().optional(),
            withdrawAddess: Joi.string().allow('').optional(),
            network: Joi.string().allow('').optional(),
            krakenCoinKey: Joi.string().allow('').optional(),
        }
        try {
            let filteredHomes
            let withdrawRes
            var validatedBody = await Joi.validate(req.body, validationSchema);
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let connectedExchangeDetails = await connectedExchangeData({ _id: validatedBody.fromExchangeId, userId: userResult._id, status: "ACTIVE" });
            console.log("==============884connectedExchangeDetails", connectedExchangeDetails)
            if (!connectedExchangeDetails) {
                throw apiError.notFound(responseMessage.FROM_EXCHANGE);
            }
            let exchangeDetails = await exchangeData({ uid: connectedExchangeDetails.uid, status: "ACTIVE" });
            // console.log("===============891exchangeDetails",exchangeDetails)
            let exchangeName = exchangeDetails.exchangeName;
            let accountBalances = await getAccount(exchangeName, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, userResult._id, connectedExchangeDetails.apiMemo);
            // console.log("============accountBalances895",accountBalances)

            if (!accountBalances) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            filteredHomes = accountBalances.filter(x => x.asset == (validatedBody.fromCoin).toUpperCase());
            if (filteredHomes.length == 0) {
                throw apiError.notFound(responseMessage.BALANCE_INSUFFICIENT);
            }
            if ((validatedBody.fromCoin).toUpperCase() != (validatedBody.toCoin).toUpperCase()) {
                throw apiError.notFound(responseMessage.COIN_NOT_MATCH);
            }
            if (filteredHomes[0].free < parseFloat(validatedBody.amount)) {
                throw apiError.notFound(responseMessage.BALANCE_INSUFFICIENT);
            }
            if (validatedBody.withdrawAddess) {
                let withdrawRes = await withdraw(exchangeName, (validatedBody.fromCoin).toUpperCase(), parseFloat(validatedBody.amount), validatedBody.withdrawAddess, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, connectedExchangeDetails.apiMemo, validatedBody.network, validatedBody.krakenCoinKey)
                console.log("==========940withdrawRes", withdrawRes)
                if (withdrawRes.iswithdrawable == true) {
                    var withdrowNumber = await filter_withdrowId(exchangeName, withdrawRes);
                    let withdrawHistoryCreate
                    if (withdrowNumber) {
                        let obj = {
                            withdrawId: withdrowNumber,
                            address: validatedBody.withdrawAddess,
                            amount: parseFloat(validatedBody.amount),
                            coin: (validatedBody.fromCoin).toUpperCase(),
                            userId: userResult._id,
                            exchangeName: exchangeName,
                            withdrawStatus: 'APPLY',
                            type: trasection.WITHDRAW
                        }
                        withdrawHistoryCreate = await createWithdrawHistory(obj)
                    }
                    return res.json(new response(withdrawHistoryCreate, responseMessage.WITHDRAWAL));
                } else {
                    throw apiError.badRequest(responseMessage.WITHDRAW_FAIL);
                }
            } else {
                let connectedExchangeDetails1 = await connectedExchangeData({ _id: validatedBody.toExchangeId, userId: userResult._id, status: "ACTIVE" });
                if (!connectedExchangeDetails1) {
                    throw apiError.notFound(responseMessage.TO_EXCHANGE);
                }
                let exchangeDetails1 = await exchangeData({ uid: connectedExchangeDetails1.uid, status: "ACTIVE" });
                let exchangeName1 = exchangeDetails1.exchangeName;
                if (exchangeName == exchangeName1) {
                    throw apiError.notFound(responseMessage.SAME_EXCHANGE);
                }
                let withdressAddressRes
                if (exchangeName1 == 'Coinbase') {
                    let withdressAddressFind = await findWithdrawAddress({ exchangeName: exchangeName1, userId: userResult._id })
                    for (let i = 0; i < withdressAddressFind.address.length; i++) {
                        if (withdressAddressFind.address[i].coinName == (validatedBody.fromCoin).toUpperCase()) {
                            withdressAddressRes = {
                                status: true,
                                address: withdressAddressFind.address[i].address,
                                network: withdressAddressFind.address[i].network
                            }
                        }
                    }
                } else {
                    withdressAddressRes = await address(exchangeName1, (validatedBody.fromCoin).toUpperCase(), connectedExchangeDetails1.apiKey, connectedExchangeDetails1.secretKey, connectedExchangeDetails1.passPhrase, connectedExchangeDetails1.customerId, connectedExchangeDetails1.api_memo);
                }
                // let withdressAddressRes = await address(exchangeName1, (validatedBody.fromCoin).toUpperCase(), connectedExchangeDetails1.apiKey, connectedExchangeDetails1.secretKey, connectedExchangeDetails1.passPhrase, connectedExchangeDetails1.customerId, connectedExchangeDetails1.api_memo)
                console.log("withdressAddressRes==============>", withdressAddressRes)
                let coinKey
                if (exchangeName == 'Kraken') {
                    if (exchangeName1 == 'Binance') {
                        coinKey = (validatedBody.fromCoin).toUpperCase() + '_Binance'
                    } else if (exchangeName1 == 'Coinbase') {
                        coinKey = (validatedBody.fromCoin).toUpperCase() + '_Coinbase'
                    } else if (exchangeName1 == 'Mexc') {
                        coinKey = (validatedBody.fromCoin).toUpperCase() + '_Mexc'
                    } else if (exchangeName1 == 'Bitmart') {
                        coinKey = (validatedBody.fromCoin).toUpperCase() + '_Bitmart'
                    } else if (exchangeName1 == 'Gateio') {
                        coinKey = (validatedBody.fromCoin).toUpperCase() + '_Gateio'
                    } else if (exchangeName1 == 'HitBTC') {
                        coinKey = (validatedBody.fromCoin).toUpperCase() + '_HitBTC'
                    }
                }
                if (withdressAddressRes.status == true) {
                    let withdrawRes = await withdraw(exchangeName, (validatedBody.fromCoin).toUpperCase(), parseFloat(validatedBody.amount), withdressAddressRes.address, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, connectedExchangeDetails.apiMemo, withdressAddressRes.network, coinKey)
                    console.log("==========974withdrawRes", withdrawRes)
                    if (withdrawRes && withdrawRes.iswithdrawable == true) {
                        var withdrowNumber = await filter_withdrowId(exchangeName, withdrawRes);
                        let withdrawHistoryCreate
                        if (withdrowNumber) {
                            let obj = {
                                withdrawId: withdrowNumber,
                                address: withdressAddressRes.address,
                                amount: parseFloat(validatedBody.amount),
                                coin: (validatedBody.fromCoin).toUpperCase(),
                                userId: userResult._id,
                                exchangeName: exchangeName,
                                withdrawStatus: 'APPLY',
                                type: trasection.WITHDRAW
                            }
                            withdrawHistoryCreate = await createWithdrawHistory(obj)
                        }
                        return res.json(new response(withdrawHistoryCreate, responseMessage.WITHDRAWAL));
                    } else {
                        throw apiError.notFound(responseMessage.WITHDRAW_FAIL);
                    }
                } else {
                    throw apiError.notFound(responseMessage.WITHDRAL_ADDRESS_NOT);
                }
            }
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/withdrawDetails:
     *   post:
     *     tags:
     *       - WALLET
     *     description: withdraw details 
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: exchange
     *         description: exchange name
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async withdrawDetails(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let exchangeTokenData = await exchangeData({ exchangeName: req.body.exchange, status: 'ACTIVE' })
            if (!exchangeTokenData) {
                throw apiError.notFound(responseMessage.CONNECTED_EXCHANGE_NOT);
            }
            let withdrawData = await withdraw_delisted(req.body.exchange);
            if (withdrawData) {
                return res.json(new response(withdrawData, responseMessage.WITHDRAW_DETAILS));
            } else {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/deposit:
     *   post:
     *     tags:
     *       - WALLET
     *     description: deposit 
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: exchangeId
     *         description: exchangeId
     *         in: formData
     *         required: true
     *       - name: coin
     *         description: coin
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async deposit(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let uid = req.body.exchangeId.toLowerCase()
            let connectedExchangeDetails = await connectedExchangeData({ userId: userResult._id, uid: uid, status: "ACTIVE" });
            if (!connectedExchangeDetails) {
                throw apiError.notFound(responseMessage.CONNECTED_EXCHANGE_NOT);
            }
            let apiKey = connectedExchangeDetails.apiKey
            let secretKey = connectedExchangeDetails.secretKey
            let api_memo = connectedExchangeDetails.apiMemo
            let customerId = connectedExchangeDetails.customerId
            let passPhrase = connectedExchangeDetails.passphrase
            let coin = (req.body.coin).toUpperCase()
            let exchangeDataRes = await exchangeData({ uid: connectedExchangeDetails.uid, status: status.ACTIVE });
            if (!exchangeDataRes) {
                throw apiError.notFound(responseMessage.CONNECTED_EXCHANGE_NOT);
            }
            let exchange = exchangeDataRes.exchangeName
            let generateAddress = await address(exchange, coin, apiKey, secretKey, passPhrase, customerId, api_memo)
            if (generateAddress.status == true) {
                let obj = {
                    address: generateAddress.address,
                    network: generateAddress.network
                }
                return res.json(new response(obj, responseMessage.ADDRESS));
            } else {
                throw apiError.notFound(responseMessage.ADDRESS_GENERATE_ERROR);
            }
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/withdrawDetails:
     *   post:
     *     tags:
     *       - WALLET
     *     description: withdraw details 
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: exchange
     *         description: exchange name
     *         in: formData
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async withdrawDetails(req, res, next) {
        try {
            let withdrawData = await withdraw_delisted(req.body.exchange);
            if (withdrawData) {
                let exchangeTokenData = await exchangeModel.findOne({ exchangeName: req.body.exchange, status: 'ACTIVE' })
                if (exchangeTokenData) {
                    return res.json(new response(withdrawData, responseMessage.WITHDRAW_DETAILS));
                }
            } else {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/withdrawDepositeHistory:
     *   get:
     *     tags:
     *       - WALLET
     *     description: Get withdraw history.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: search
     *         description: search as exchangeName  
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
     *       - name: type
     *         description: type
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async withdrawDepositeHistory(req, res, next) {
        const validationSchema = {
            search: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
            type: Joi.string().optional(),
        };
        try {
            let validateBody = await Joi.validate(req.query, validationSchema)
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            validateBody.userId = userResult._id
            let result = await paginateSearchWithdrawHistory(validateBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.WITHDRAW_LIST));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/transationHistory:
     *   get:
     *     tags:
     *       - WALLET
     *     description: Get transation history.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: search
     *         description: search as exchangeName  
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
    async transationHistory(req, res, next) {
        const validationSchema = {
            search: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
        };
        try {
            let validateBody = await Joi.validate(req.query, validationSchema)
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            validateBody.userId = userResult._id
            let result = await paginateSearchTransactionHistory(validateBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/Dashboard:
     *   get:
     *     tags:
     *       - WALLET
     *     description: get Dashboard
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
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
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async Dashboard(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let orderCountQuery = { userId: userResult._id }
            let connectedExchangeCountQuery = { status: status.ACTIVE, userId: userResult._id }
            let highestcountQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id }
            let profitTotalQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 } }
            let lossToaltQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $lte: 0 } }
            let pendingTotalQuery = { arbitrageStatus: arbitrageStatus.PENDING, userId: userResult._id, }
            let dateQuery = {}
            const { fromDate, toDate } = req.query
            if (fromDate && !toDate) {
                dateQuery.createdAt = { $gte: fromDate };
            }
            if (!fromDate && toDate) {
                dateQuery.createdAt = { $lte: toDate };
            }
            if (fromDate && toDate) {
                dateQuery.$and = [
                    { createdAt: { $gte: fromDate } },
                    { createdAt: { $lte: toDate } },
                ]
            }
            orderCountQuery = { ...orderCountQuery, ...dateQuery };
            // connectedExchangeCountQuery = { ...connectedExchangeCountQuery, ...dateQuery };
            highestcountQuery = { ...highestcountQuery, ...dateQuery };
            profitTotalQuery = { ...profitTotalQuery, ...dateQuery }
            lossToaltQuery = { ...lossToaltQuery, ...dateQuery }
            pendingTotalQuery = { ...pendingTotalQuery, ...dateQuery }
            const [
                totalArbitrage,
                totalConnectedExchange,
                directHightestProfit,
                loopHighestProfitRes,
                triangularHighestProfitRes,
                intraArbitrageSingleExchangeHighestProfitRes,
                totalDirectProfitRes,
                totalLoopProfitRes,
                totalTriangularProfitRes,
                totalIntraArbitrageSingleExchageProfitRes,
                totalDirectLossRes,
                totalLoopLossRes,
                totalTriangularLossRes,
                totalIntraArbitrageSingleExchangeLossRes,
                totalDirectPendingRes,
                totalLoopPendingRes,
                totalTriangularPendingRes,
                totalIntraArbitrageSingleExchangePendingRes
            ] = await Promise.all([
                orderCount(orderCountQuery),
                connectedExchangeCount(connectedExchangeCountQuery),
                directHighestCount(highestcountQuery),
                loopHighestProfit(highestcountQuery),
                triangularHighestProfit(highestcountQuery),
                intraArbitrageSingleExchangeHighestCount(highestcountQuery),
                directArbitrageList(profitTotalQuery),
                loopArbitrageList(profitTotalQuery),
                triangularAllList(profitTotalQuery),
                intraArbitrageSingleExchangeAllList(profitTotalQuery),
                directArbitrageList(lossToaltQuery),
                loopArbitrageList(lossToaltQuery),
                triangularAllList(lossToaltQuery),
                intraArbitrageSingleExchangeAllList(lossToaltQuery),
                directArbitrageList(pendingTotalQuery),
                loopArbitrageList(pendingTotalQuery),
                triangularAllList(pendingTotalQuery),
                intraArbitrageSingleExchangeAllList(pendingTotalQuery),
            ])
            let directProfit = 0, loopProfit = 0, triangularProfit = 0, intraArbitrageSingleExchangeProfit = 0, totalDirectProfit = 0, totalLoopProfit = 0, totalTriangularProfit = 0, totalIntraArbitrageSingleExchangeProfit = 0, totalDirectLoss = 0, totalLoopLoss = 0, totalTriangularLoss = 0, totalIntraArbitrageSingleExchangeLoss = 0, totalDirectPending = 0, totalLoopPending = 0, totalTriangularPending = 0, totalIntraArbitrageSingleExchangePending = 0
            if (directHightestProfit.length != 0) {
                directProfit = directHightestProfit[0].profit
            }
            if (loopHighestProfitRes.length != 0) {
                loopProfit = loopHighestProfitRes[0].profit
            }
            if (triangularHighestProfitRes.length != 0) {
                triangularProfit = triangularHighestProfitRes[0].profit
            }

            if (intraArbitrageSingleExchangeHighestProfitRes.length != 0) {
                intraArbitrageSingleExchangeProfit = intraArbitrageSingleExchangeHighestProfitRes[0].profit
            }
            let arrayData = [directProfit, loopProfit, triangularProfit, intraArbitrageSingleExchangeProfit]
            var largest = 0;

            for (let i = 0; i < arrayData.length; i++) {
                if (arrayData[i] > largest) {
                    largest = arrayData[i];
                }
            }
            if (totalDirectProfitRes.length != 0) {
                totalDirectProfit = totalDirectProfitRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalLoopProfitRes.length != 0) {
                totalLoopProfit = totalLoopProfitRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalTriangularProfitRes.length != 0) {
                totalTriangularProfit = totalTriangularProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (totalIntraArbitrageSingleExchageProfitRes.length != 0) {
                totalIntraArbitrageSingleExchangeProfit = totalIntraArbitrageSingleExchageProfitRes.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
            }

            if (totalDirectLossRes.length != 0) {
                totalDirectLoss = totalDirectLossRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalLoopLossRes.length != 0) {
                totalLoopLoss = totalLoopLossRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalTriangularLossRes.length != 0) {
                totalTriangularLoss = totalTriangularLossRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalIntraArbitrageSingleExchangeLossRes.length != 0) {
                totalIntraArbitrageSingleExchangeLoss = totalIntraArbitrageSingleExchangeLossRes.reduce((n, { profit }) => n + Number(profit), 0)
            }


            if (totalDirectPendingRes.length != 0) {
                totalDirectPending = totalDirectPendingRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalLoopPendingRes.length != 0) {
                totalLoopPending = totalLoopPendingRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalTriangularPendingRes.length != 0) {
                totalTriangularPending = totalTriangularPendingRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalIntraArbitrageSingleExchangePendingRes.length != 0) {
                totalIntraArbitrageSingleExchangePending = totalIntraArbitrageSingleExchangePendingRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }

            let dashboard = {
                totalArbitrage: totalArbitrage,
                totalConnectedExchange: totalConnectedExchange,
                highestProfit: largest,
                totalProfit: totalDirectProfit + totalLoopProfit + totalTriangularProfit + totalIntraArbitrageSingleExchangeProfit,
                totalLoss: totalTriangularLoss + totalLoopLoss + totalDirectLoss + totalIntraArbitrageSingleExchangeLoss,
                totalPending: totalTriangularPending + totalLoopPending + totalDirectPending + totalIntraArbitrageSingleExchangePending
            }
            return res.json(new response(dashboard, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }


    /**
     * @swagger
     * /wallet/statistic:
     *   get:
     *     tags:
     *       - WALLET
     *     description: get Statistic
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: type
     *         description: type (day/month/week/year)
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async statistic(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }

            var currentDay = new Date();
            let weekDataRes = []
            var daysOfWeek = [];
            let yearDataRes = []
            if (req.query.type == 'day') {
                var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
                let [toDayOrderBuy, toDayOrderSell] = await Promise.all([
                    orderCount({
                        $and: [
                            { createdAt: { $gte: new Date(yesterday) } },
                            { createdAt: { $lte: new Date(currentDay) } },
                            { userId: userResult._id },
                            { side: 'buy' }
                        ]
                    }),
                    orderCount({
                        $and: [
                            { createdAt: { $gte: new Date(yesterday) } },
                            { createdAt: { $lte: new Date(currentDay) } },
                            { userId: userResult._id },
                            { side: 'sell' }
                        ]
                    })
                ])
                let obj = {
                    today: {
                        buy: toDayOrderBuy,
                        sell: toDayOrderSell
                    },
                }
                return res.json(new response(obj, responseMessage.DATA_FOUND));
            } else if (req.query.type == 'month' || req.query.type == 'week') {
                let days = 0
                if (req.query.type == 'month') {
                    days = 30
                } else {
                    days = 6
                }
                var weekDate = new Date(new Date().getTime() - ((24 * Number(days)) * 60 * 60 * 1000));
                for (var d = new Date(weekDate); d <= currentDay; d.setDate(d.getDate() + 1)) {
                    daysOfWeek.push(new Date(d));
                }

                for (let i = 0; i < daysOfWeek.length; i++) {
                    let startTime = new Date(new Date(daysOfWeek[i]).toISOString().slice(0, 10))
                    let lastTime = new Date(new Date(daysOfWeek[i]).toISOString().slice(0, 10) + 'T23:59:59.999Z');
                    let [buy, sell] = await Promise.all([
                        orderCount({
                            $and: [
                                { createdAt: { $gte: new Date(startTime) } },
                                { createdAt: { $lte: new Date(lastTime) } },
                                { userId: userResult._id },
                                { side: 'buy' }
                            ]
                        }),
                        orderCount({
                            $and: [
                                { createdAt: { $gte: new Date(startTime) } },
                                { createdAt: { $lte: new Date(lastTime) } },
                                { userId: userResult._id },
                                { side: 'sell' }
                            ]
                        })
                    ])
                    let objDb = {
                        buy: buy,
                        sell: sell,
                        date: daysOfWeek[i],
                    }
                    weekDataRes.push(objDb);
                }
                return res.json(new response(weekDataRes, responseMessage.DATA_FOUND));
            } else {
                for (let i = 0; i < 12; i++) {
                    let dataRes = new Date().setMonth((new Date().getMonth() - i));
                    var startTime = new Date(new Date(dataRes).getFullYear(), new Date(dataRes).getMonth(), 1);
                    var lastTime = new Date(new Date(dataRes).getFullYear(), new Date(dataRes).getMonth() + 1, 0);
                    let [buy, sell] = await Promise.all([
                        orderCount({
                            $and: [
                                { createdAt: { $gte: new Date(startTime) } },
                                { createdAt: { $lte: new Date(lastTime) } },
                                { userId: userResult._id },
                                { side: 'buy' }
                            ]
                        }),
                        orderCount({
                            $and: [
                                { createdAt: { $gte: new Date(startTime) } },
                                { createdAt: { $lte: new Date(lastTime) } },
                                { userId: userResult._id },
                                { side: 'sell' }
                            ]
                        })
                    ])
                    let objDb = {
                        buy: buy,
                        sell: sell,
                        month: new Date(dataRes).getMonth() + 1,
                        year: new Date(dataRes).getFullYear()
                    }
                    yearDataRes.push(objDb)

                }
                yearDataRes.sort((a, b) => a.year - b.year || a.month - b.month);
                return res.json(new response(yearDataRes, responseMessage.DATA_FOUND));
            }

        } catch (error) {
            console.log(error)
            return next(error);
        }
    }


    /**
     * @swagger
     * /wallet/coinImageData:
     *   get:
     *     tags:
     *       - WALLET
     *     description: Get coinImage.
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async coinImageData(req, res, next) {
        try {
            let totalPairs = currencyPairs.currencyPairs
            let result = []
            for (let i = 0; i < coinImage.length; i++) {
                if ((totalPairs).includes((coinImage[i].symbol).toUpperCase())) {
                    result.push(coinImage[i])
                }
            }
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }

    /**
    * @swagger
    * /wallet/exchangeBalanceParticularUser:
    *   post:
    *     tags:
    *       - WALLET
    *     description: List of connected exchanges
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
    *       - name: _id
    *         description: _id of connected exchange
    *         in: formData
    *         required: false
    *     responses:
    *       200:
    *         description: Returns success message
    */
    async exchangeBalanceParticularUser(req, res, next) {
        try {
            let adminResult = await findUser({ _id: req.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!adminResult) {
                throw apiError.notFound(responseMessage.UNAUTHORIZED);
            }
            else {
                let userResult = await findUser({ _id: req.body.userId, status: { $ne: status.DELETE }, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
                if (!userResult) {
                    throw apiError.notFound(responseMessage.USER_NOT_FOUND);
                }
                let responseResult = new Array();
                if (req.body._id) {
                    let connectedExchangeDetails = await connectedExchangeData({ _id: req.body._id, userId: userResult._id, status: "ACTIVE" });
                    if (!connectedExchangeDetails) {
                        return res.json(new response([], responseMessage.NOT_CONNECTED));
                    }
                    let exchangeDetails = await exchangeData({ uid: connectedExchangeDetails.uid, status: "ACTIVE" });
                    let exchangeName = exchangeDetails.exchangeName;
                    let accountBalances = await getAccount(exchangeName, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, userResult._id, connectedExchangeDetails.apiMemo);
                    // console.log('accountBalances ==>',accountBalances);
                    let balanceObj = {
                        exchangeName: exchangeName,
                        AccountBalance: accountBalances
                    }
                    responseResult.push(balanceObj);
                    if (responseResult.length != 0) {
                        return res.json(new response(responseResult, responseMessage.EXCHANGE_DETAILS));
                    } else {
                        return res.json(new response([], responseMessage.NOT_CONNECTED));
                    }
                } else {
                    let count = 0;
                    let allExchangeTotal = 0.0;
                    let allExchangeTotalLocked = 0.0;
                    if (userResult.connectedExchange.length != 0) {
                        for (let exchangeId of userResult.connectedExchange) {
                            count = count + 1;
                            let connectedExchangeDetails = await connectedExchangeData({ _id: exchangeId, userId: userResult._id, status: "ACTIVE" });
                            let exchangeDetails = await exchangeData({ uid: connectedExchangeDetails.uid, status: "ACTIVE" });
                            let exchangeName = exchangeDetails.exchangeName;
                            let accountBalances = await getAccount(exchangeName, connectedExchangeDetails.apiKey, connectedExchangeDetails.secretKey, connectedExchangeDetails.passphrase, connectedExchangeDetails.customerId, userResult._id, connectedExchangeDetails.apiMemo);
                            if (accountBalances && Array.isArray(accountBalances)) {
                                if (accountBalances.length == 0) {
                                    let messageObj = {
                                        message: `You don't have any wallet or coins on ${exchangeName}.`
                                    };
                                    let totalBalanceObj = {
                                        totalBalance: 0.00
                                    }
                                    accountBalances.push(messageObj, totalBalanceObj);
                                } else {
                                    for (let i = 0; i < accountBalances.length; i++) {
                                        if (accountBalances.length - 1 == i) {
                                            if (userResult.baseCurrency == 'INR' || userResult.baseCurrency == 'EUR' || userResult.baseCurrency == 'JPY') {
                                                accountBalances[i]['totalBalance'] = accountBalances[i]['totalBalance'] * userResult.convertvalue;
                                            }
                                            allExchangeTotal = allExchangeTotal + accountBalances[i]['totalBalance'];
                                            allExchangeTotalLocked = allExchangeTotalLocked + accountBalances[i]['lockedBalance'];
                                        }
                                    }
                                }
                            }
                            let balanceObj = {
                                exchangeName: exchangeName,
                                AccountBalance: accountBalances
                            }
                            responseResult.push(balanceObj);
                        }
                        responseResult.allBalanceTotal = allExchangeTotal;
                        responseResult.allBalanceTotalLocked = allExchangeTotalLocked;
                        if (responseResult.length != 0) {
                            if (userResult.baseCurrency == 'INR' || userResult.baseCurrency == 'EUR' || userResult.baseCurrency == 'JPY') {
                                responseResult.map((accountDetails) => {
                                    for (let balObj in accountDetails['AccountBalance']) {
                                        for (let [key, value] of Object.entries(accountDetails['AccountBalance'][balObj])) {
                                            if (key == 'total') {
                                                accountDetails['AccountBalance'][balObj][key] = accountDetails['AccountBalance'][balObj][key] * userResult.convertvalue;
                                            }
                                        }
                                    }
                                });
                            }
                            return res.json(new response({ allExchangeTotal,allExchangeTotalLocked, responseResult }, responseMessage.EXCHANGE_DETAILS));
                        } else {
                            return res.json(new response([], responseMessage.NOT_CONNECTED));
                        }
                    } else {
                        return res.json(new response([], responseMessage.NOT_CONNECTED));
                    }
                }
            }
        } catch (error) {
            console.log(error);
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/DashboardRecentData:
     *   get:
     *     tags:
     *       - WALLET
     *     description: get DashboardRecentData
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: hour
     *         description: hour
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async DashboardRecentData(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let profitTotalQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 } }
            let dateQuery = {}
            const fromDate = new Date(new Date().setHours(new Date().getHours() - Number(req.query.hour)))
            const toDate = new Date()
            if (fromDate && !toDate) {
                dateQuery.updatedAt = { $gte: fromDate };
            }
            if (!fromDate && toDate) {
                dateQuery.updatedAt = { $lte: toDate };
            }
            if (fromDate && toDate) {
                dateQuery.$and = [
                    { updatedAt: { $gte: fromDate } },
                    { updatedAt: { $lte: toDate } },
                ]
            }
            let profitPath30Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } }, { updatedAt: { $lte: toDate } }] }
            let profitPath60Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 60)) } }, { updatedAt: { $lte: toDate } }] }
            let profitPath90Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 90)) } }, { updatedAt: { $lte: toDate } }] }
            profitTotalQuery = { ...profitTotalQuery, ...dateQuery }
            const [totalDirectProfitRes, totalTriangularProfitRes, totalIntraArbitrageSingleProfitRes, totaldirect30dayprofit, totaltriangular30dayprofit, totalIntraArbitrageSingle30dayprofit, totaldirect60dayprofit, totaltriangular60dayprofit, totalIntraArbitrageSingle60dayprofit, totaldirect90dayprofit, totaltriangular90dayprofit, totalIntraArbitrageSingle90dayprofit] = await Promise.all([
                directArbitrageList(profitTotalQuery),
                triangularAllList(profitTotalQuery),
                intraArbitrageSingleExchangeAllList(profitTotalQuery),
                directArbitrageList(profitPath30Day),
                triangularAllList(profitPath30Day),
                intraArbitrageSingleExchangeAllList(profitPath30Day),
                directArbitrageList(profitPath60Day),
                triangularAllList(profitPath60Day),
                intraArbitrageSingleExchangeAllList(profitPath60Day),
                directArbitrageList(profitPath90Day),
                triangularAllList(profitPath90Day),
                intraArbitrageSingleExchangeAllList(profitPath90Day)
            ])
            let totalDirectProfit = 0, totalTriangularProfit = 0, totalDirectCapitalAmount = 0, totalTriangularCapitalAmount = 0, totalIntraArbitrageSingleExchangeProfit = 0, totalIntraArbitrageSingleExchangeCapitalAmount = 0
            let finalTotalDirect30DayProfit = 0, finalTotalDirect30DayCapital = 0, finalTotalTriangular30DayProfit = 0, finalTotalTriangular30DayCapital = 0, finalTotalIntraArbitrageSingleExchange30DayProfit = 0, finalTotalIntraArbitrageSingleExchange30DayCapital = 0
            let finalTotalDirect60DayProfit = 0, finalTotalDirect60DayCapital = 0, finalTotalTriangular60DayProfit = 0, finalTotalTriangular60DayCapital = 0, finalTotalIntraArbitrageSingleExchange60DayProfit = 0, finalTotalIntraArbitrageSingleExchange60DayCapital = 0
            let finalTotalDirect90DayProfit = 0, finalTotalDirect90DayCapital = 0, finalTotalTriangular90DayProfit = 0, finalTotalTriangular90DayCapital = 0, finalTotalIntraArbitrageSingleExchange90DayProfit = 0, finalTotalIntraArbitrageSingleExchange90DayCapital = 0

            if (totalDirectProfitRes.length != 0) {
                totalDirectProfit = totalDirectProfitRes.reduce((n, { profit }) => n + Number(profit), 0)
                totalDirectCapitalAmount = totalDirectProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalTriangularProfitRes.length != 0) {
                totalTriangularProfit = totalTriangularProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                totalTriangularCapitalAmount = totalTriangularProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalIntraArbitrageSingleProfitRes.length != 0) {
                totalIntraArbitrageSingleExchangeProfit = totalIntraArbitrageSingleProfitRes.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
                totalIntraArbitrageSingleExchangeCapitalAmount = totalIntraArbitrageSingleProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaldirect30dayprofit.length != 0) {
                finalTotalDirect30DayProfit = totaldirect30dayprofit.reduce((n, { profit }) => n + Number(profit), 0)
                finalTotalDirect30DayCapital = totaldirect30dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaltriangular30dayprofit.length != 0) {
                finalTotalTriangular30DayProfit = totaltriangular30dayprofit.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                finalTotalTriangular30DayCapital = totaltriangular30dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }

            if (totalIntraArbitrageSingle30dayprofit.length != 0) {
                finalTotalIntraArbitrageSingleExchange30DayProfit = totalIntraArbitrageSingle30dayprofit.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
                finalTotalIntraArbitrageSingleExchange30DayCapital = totalIntraArbitrageSingle30dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }

            if (totaldirect60dayprofit.length != 0) {
                finalTotalDirect60DayProfit = totaldirect60dayprofit.reduce((n, { profit }) => n + Number(profit), 0)
                finalTotalDirect60DayCapital = totaldirect60dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaltriangular60dayprofit.length != 0) {
                finalTotalTriangular60DayProfit = totaltriangular60dayprofit.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                finalTotalTriangular60DayCapital = totaltriangular60dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalIntraArbitrageSingle60dayprofit.length != 0) {
                finalTotalIntraArbitrageSingleExchange60DayProfit = totalIntraArbitrageSingle60dayprofit.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
                finalTotalIntraArbitrageSingleExchange60DayCapital = totalIntraArbitrageSingle60dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaldirect90dayprofit.length != 0) {
                finalTotalDirect90DayProfit = totaldirect90dayprofit.reduce((n, { profit }) => n + Number(profit), 0)
                finalTotalDirect90DayCapital = totaldirect90dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totaltriangular90dayprofit.length != 0) {
                finalTotalTriangular90DayProfit = totaltriangular90dayprofit.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                finalTotalTriangular90DayCapital = totaltriangular90dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalIntraArbitrageSingle90dayprofit.length != 0) {
                finalTotalIntraArbitrageSingleExchange90DayProfit = totalIntraArbitrageSingle90dayprofit.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
                finalTotalIntraArbitrageSingleExchange90DayCapital = totalIntraArbitrageSingle90dayprofit.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            let dashboard = {
                totalProfit: totalDirectProfit + totalTriangularProfit + totalIntraArbitrageSingleExchangeProfit,
                totalCapital: totalDirectCapitalAmount + totalTriangularCapitalAmount + totalIntraArbitrageSingleExchangeCapitalAmount,
                total30DayProfit: finalTotalDirect30DayProfit + finalTotalTriangular30DayProfit + finalTotalIntraArbitrageSingleExchange30DayProfit,
                total30dayCaptial: finalTotalDirect30DayCapital + finalTotalTriangular30DayCapital + finalTotalIntraArbitrageSingleExchange30DayCapital,
                total60DayProfit: finalTotalDirect60DayProfit + finalTotalTriangular60DayProfit + finalTotalIntraArbitrageSingleExchange60DayProfit,
                total60dayCaptial: finalTotalDirect60DayCapital + finalTotalTriangular60DayCapital + finalTotalIntraArbitrageSingleExchange60DayCapital,
                total90DayProfit: finalTotalDirect90DayProfit + finalTotalTriangular90DayProfit + finalTotalIntraArbitrageSingleExchange90DayProfit,
                total90dayCaptial: finalTotalDirect90DayCapital + finalTotalTriangular90DayCapital + finalTotalIntraArbitrageSingleExchange90DayCapital
            }
            return res.json(new response(dashboard, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/shortTimeProfit:
     *   get:
     *     tags:
     *       - WALLET
     *     description: get shortTimeProfit
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
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
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async shortTimeProfit(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let profitTotalQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 } }
            let lossToaltQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $lte: 0 } }
            let dateQuery = {}
            const { fromDate, toDate } = req.query
            if (fromDate && !toDate) {
                dateQuery.createdAt = { $gte: fromDate };
            }
            if (!fromDate && toDate) {
                dateQuery.createdAt = { $lte: toDate };
            }
            if (fromDate && toDate) {
                dateQuery.$and = [
                    { createdAt: { $gte: fromDate } },
                    { createdAt: { $lte: toDate } },
                ]
            }
            profitTotalQuery = { ...profitTotalQuery, ...dateQuery }
            lossToaltQuery = { ...lossToaltQuery, ...dateQuery }
            let [allProfit, allLoss] = await Promise.all([
                triangularAllList(profitTotalQuery),
                triangularAllList(lossToaltQuery),
            ])

            var binanceProfitRes = allProfit.filter(function (el) {
                return el.exchangeName == 'Binance'
            });
            var mexcProfitRes = allProfit.filter(function (el) {
                return el.exchangeName == 'Mexc'
            });
            var krakenProfitRes = allProfit.filter(function (el) {
                return el.exchangeName == 'Kraken'
            });

            var binanceLossRes = allLoss.filter(function (el) {
                return el.exchangeName == 'Binance'
            });
            var mexclossRes = allLoss.filter(function (el) {
                return el.exchangeName == 'Mexc'
            });
            var krakenLossRes = allLoss.filter(function (el) {
                return el.exchangeName == 'Kraken'
            });

            let obj1 = { profit: 0, capital: 0, exchangeName: "Binance" }
            let obj2 = { profit: 0, capital: 0, exchangeName: "Mexc" }
            let obj3 = { profit: 0, capital: 0, exchangeName: "Kraken" }
            let obj4 = { loss: 0, capital: 0, exchangeName: "Binance" }
            let obj5 = { loss: 0, capital: 0, exchangeName: "Mexc" }
            let obj6 = { loss: 0, capital: 0, exchangeName: "Kraken" }

            if (binanceProfitRes.length != 0) {
                obj1.profit += binanceProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                obj1.capital += binanceProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (mexcProfitRes.length != 0) {
                obj2.profit += mexcProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                obj2.capital += mexcProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (krakenProfitRes.length != 0) {
                obj3.profit += krakenProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                obj3.capital += krakenProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (binanceLossRes.length != 0) {
                obj4.loss += binanceLossRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                obj4.capital += binanceLossRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (mexclossRes.length != 0) {
                obj5.loss += mexclossRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                obj5.capital += mexclossRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (krakenLossRes.length != 0) {
                obj6.loss += krakenLossRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
                obj6.capital += krakenLossRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            let result = []
            // result.push(obj1, obj2, obj3, obj4, obj5, obj6,)
            result.push(obj1, obj2, obj3)
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/cryptoAssetprofit:
     *   get:
     *     tags:
     *       - WALLET
     *     description: get cryptoAssetprofit
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: hour
     *         description: hour
     *         in: query
     *         required: false
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async cryptoAssetprofit(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let profitTotalQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 } }
            let dateQuery = {}
            const fromDate = new Date(new Date().setHours(new Date().getHours() - Number(req.query.hour)))
            const toDate = new Date()
            if (fromDate && !toDate) {
                dateQuery.updatedAt = { $gte: fromDate };
            }
            if (!fromDate && toDate) {
                dateQuery.updatedAt = { $lte: toDate };
            }
            if (fromDate && toDate) {
                dateQuery.$and = [
                    { updatedAt: { $gte: fromDate } },
                    { updatedAt: { $lte: toDate } },
                ]
            }
            let profitPath30Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } }, { updatedAt: { $lte: toDate } }] }
            let profitPath60Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 60)) } }, { updatedAt: { $lte: toDate } }] }
            let profitPath90Day = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id, profit: { $gte: 0 }, $and: [{ updatedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 90)) } }, { updatedAt: { $lte: toDate } }] }
            profitTotalQuery = { ...profitTotalQuery, ...dateQuery }
            const [totalTriangularProfitRes, totaltriangular30dayprofit, totaltriangular60dayprofit, totaltriangular90dayprofit] = await Promise.all([
                triangularAllList(profitTotalQuery),
                triangularAllList(profitPath30Day),
                triangularAllList(profitPath60Day),
                triangularAllList(profitPath90Day),
            ])
            var btcProfitRes = totalTriangularProfitRes.filter(function (el) { return el.start == 'BTC' });
            var ethProfitRes = totalTriangularProfitRes.filter(function (el) { return el.start == 'ETH' });
            var usdtProfitRes = totalTriangularProfitRes.filter(function (el) { return el.start == 'USDT' });

            var btc30ProfitRes = totaltriangular30dayprofit.filter(function (el) { return el.start == 'BTC' });
            var eth30ProfitRes = totaltriangular30dayprofit.filter(function (el) { return el.start == 'ETH' });
            var usdt30ProfitRes = totaltriangular30dayprofit.filter(function (el) { return el.start == 'USDT' });

            var btc60ProfitRes = totaltriangular60dayprofit.filter(function (el) { return el.start == 'BTC' });
            var eth60ProfitRes = totaltriangular60dayprofit.filter(function (el) { return el.start == 'ETH' });
            var usdt60ProfitRes = totaltriangular60dayprofit.filter(function (el) { return el.start == 'USDT' });

            var btc90ProfitRes = totaltriangular90dayprofit.filter(function (el) { return el.start == 'BTC' });
            var eth90ProfitRes = totaltriangular90dayprofit.filter(function (el) { return el.start == 'ETH' });
            var usdt90ProfitRes = totaltriangular90dayprofit.filter(function (el) { return el.start == 'USDT' });

            let obj1 = { profit: 0, crypto: 'BTC' }
            let obj2 = { profit: 0, crypto: 'ETH' }
            let obj3 = { profit: 0, crypto: 'USDT' }
            if (btcProfitRes.length != 0) {
                obj1.profit = btcProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (ethProfitRes.length != 0) {
                obj2.profit = ethProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (usdtProfitRes.length != 0) {
                obj3.profit = usdtProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }

            let obj31 = { profit: 0, crypto: 'BTC' }
            let obj32 = { profit: 0, crypto: 'ETH' }
            let obj33 = { profit: 0, crypto: 'USDT' }
            if (btc30ProfitRes.length != 0) {
                obj31.profit = btc30ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (eth30ProfitRes.length != 0) {
                obj32.profit = eth30ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (usdt30ProfitRes.length != 0) {
                obj33.profit = usdt30ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }

            let obj61 = { profit: 0, crypto: 'BTC' }
            let obj62 = { profit: 0, crypto: 'ETH' }
            let obj63 = { profit: 0, crypto: 'USDT' }
            if (btc60ProfitRes.length != 0) {
                obj61.profit = btc60ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (eth60ProfitRes.length != 0) {
                obj62.profit = eth60ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (usdt60ProfitRes.length != 0) {
                obj63.profit = usdt60ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }

            let obj91 = { profit: 0, crypto: 'BTC' }
            let obj92 = { profit: 0, crypto: 'ETH' }
            let obj93 = { profit: 0, crypto: 'USDT' }
            if (btc90ProfitRes.length != 0) {
                obj91.profit = btc90ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (eth90ProfitRes.length != 0) {
                obj92.profit = eth90ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (usdt90ProfitRes.length != 0) {
                obj93.profit = usdt90ProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }

            let arr1 = [obj1, obj2, obj3]
            let result = arr1.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
            let arr2 = [obj31, obj32, obj33]
            let result1 = arr2.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0))
            let arr3 = [obj61, obj62, obj63]
            let result2 = arr3.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0))
            let arr4 = [obj91, obj92, obj93]
            let result3 = arr4.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0))
            let obj = {
                topPerformingCrypto: result[0],
                topPerformingCrypto30: result1[0],
                topPerformingCrypto60: result2[0],
                topPerformingCrypto90: result3[0],
            }

            return res.json(new response(obj, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/profitStats:
     *   get:
     *     tags:
     *       - WALLET
     *     description: profitStats
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
    async profitStats(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let profitTotalQuery = { arbitrageStatus: arbitrageStatus.COMPLETED, userId: userResult._id }
            const [totalDirectProfitRes, totalTriangularProfitRes, totalIntraArbitrageSingleExchangeProfitRes] = await Promise.all([
                directArbitrageList(profitTotalQuery),
                triangularAllList(profitTotalQuery),
                intraArbitrageSingleExchangeAllList(profitTotalQuery)
            ])
            let totalDirectProfit = 0, totalTriangularProfit = 0, totalDirectCapital = 0, totalTriangularCaptial = 0, totalIntraArbitrageSingleExchangeProfit = 0, totalIntraArbitrageSingleExchangeCaptial = 0
            if (totalDirectProfitRes.length != 0) {
                totalDirectProfit = totalDirectProfitRes.reduce((n, { profit }) => n + Number(profit), 0)
            }
            if (totalTriangularProfitRes.length != 0) {
                totalTriangularProfit = totalTriangularProfitRes.reduce((n, { filledTotal, capital }) => n + Number(filledTotal) - Number(capital), 0)
            }
            if (totalIntraArbitrageSingleExchangeProfitRes.length != 0) {
                totalIntraArbitrageSingleExchangeProfit = totalIntraArbitrageSingleExchangeProfitRes.reduce((n, { filledTotal, capitalInUSDT }) => n + Number(filledTotal) - Number(capitalInUSDT), 0)
            }
            if (totalDirectProfitRes.length != 0) {
                totalDirectCapital = totalDirectProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalTriangularProfitRes.length != 0) {
                totalTriangularCaptial = totalTriangularProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }
            if (totalIntraArbitrageSingleExchangeProfitRes.length != 0) {
                totalIntraArbitrageSingleExchangeCaptial = totalIntraArbitrageSingleExchangeProfitRes.reduce((n, { capitalInUSDT }) => n + Number(capitalInUSDT), 0)
            }

            let dashboard = {
                totalProfit: totalDirectProfit + totalTriangularProfit + totalIntraArbitrageSingleExchangeProfit,
                totalCapital: totalDirectCapital + totalTriangularCaptial + totalIntraArbitrageSingleExchangeCaptial,
                profitPercentage: Number(totalDirectProfit + totalTriangularProfit + totalIntraArbitrageSingleExchangeProfit) / Number(totalDirectCapital + totalTriangularCaptial + totalIntraArbitrageSingleExchangeCaptial) * 100
            }
            return res.json(new response(dashboard, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    async askBidSocket(token, exchange, symbol1, limit) {
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
                    if (!limit) {
                        limit = 5
                    }
                    let resultBuy, resultSell
                    let symbol = (symbol1.toUpperCase())
                    if (exchange) {
                        let BuyData = await findChart({ exchangeName: exchange, status: status.ACTIVE })
                        if (!BuyData) {
                            responses = ({ responseCode: 404, responseMessage: "Exchange not found.", responseResult: [] });
                            resolve(responses)
                        }
                        resultBuy = BuyData && BuyData.askBid && BuyData.askBid[symbol] ? BuyData.askBid[symbol].bids : [];
                        resultSell = BuyData && BuyData.askBid && BuyData.askBid[symbol] ? BuyData.askBid[symbol].asks : [];
                    }
                    let obj = {
                        bids: resultBuy.slice(0, limit),
                        asks: resultSell.slice(0, limit)
                    }
                    responses = ({ responseCode: 200, responseMessage: "Data found succefully.", responseResult: obj });
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
     * /wallet/pairList:
     *   get:
     *     tags:
     *       - WALLET
     *     description: pairList
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: token
     *         description: token
     *         in: header
     *         required: true
     *       - name: exchange
     *         description: exchange
     *         in: query
     *         required: true
     *     responses:
     *       200:
     *         description: Returns success message
     */
    async pairList(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.ADMIN, userType.SUBADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let tickers = await exchangeData({ exchangeName: req.query.exchange, status: "ACTIVE" });
            if (!tickers) {
                throw apiError.notFound(responseMessage.CONNECTED_EXCHANGE_NOT);
            }
            let result = []
            if (!tickers.tickers) {
                result = []
            } else {
                for (let [sym, info] of Object.entries(tickers.tickers)) {
                    result.push(info.base + "-" + info.quote)
                }
            }
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            console.log(error)
            return next(error);
        }
    }

    /**
    * @swagger
    * /wallet/connectedExchangePreviousList:
    *   get:
    *     tags:
    *       - WALLET
    *     description: List of connected exchanges
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
    async connectedExchangePreviousList(req, res, next) {
        try {
            let userResult = await findUser({ _id: req.userId, userType: { $in: [userType.USER, userType.SUBADMIN, userType.ADMIN] } });
            if (!userResult) {
                throw apiError.notFound(responseMessage.USER_NOT_FOUND);
            }
            let connectRes = await connectedExchangeList({ userId: userResult._id, status: status.DELETE })
            if (connectRes.length != 0) {
                let result = []
                for (let i = 0; i < connectRes.length; i++) {
                    let obj = {
                        _id: connectRes[i]._id,
                        exchangeUID: connectRes[i].uid,
                        apiKey: connectRes[i].apiKey
                    }
                    result.push(obj)
                }
                return res.json(new response(result, responseMessage.EXCHANGE_DETAILS));
            } else {
                throw apiError.notFound(responseMessage.NOT_CONNECTED);
            }
        } catch (error) {
            return next(error);
        }
    }

    /**
     * @swagger
     * /wallet/profitPathHistory:
     *   get:
     *     tags:
     *       - WALLET
     *     description: Get profit history.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: search
     *         description: search as ['Direct Arbitrage','Triangular Arbitrage']  
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
    async profitPathHistory(req, res, next) {
        const validationSchema = {
            search: Joi.string().optional(),
            fromDate: Joi.string().optional(),
            toDate: Joi.string().optional(),
            page: Joi.string().optional(),
            limit: Joi.string().optional(),
        };
        try {
            let validateBody = await Joi.validate(req.query, validationSchema)
            let result = await profitPathHistorListPagination(validateBody)
            if (result.docs.length == 0) {
                throw apiError.notFound(responseMessage.DATA_NOT_FOUND);
            }
            return res.json(new response(result, responseMessage.DATA_FOUND));
        } catch (error) {
            return next(error);
        }
    }


}

export default new walletController()

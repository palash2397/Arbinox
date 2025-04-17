import { CronJob } from 'cron';
import triangularModel from '../../../../models/triangular';
import connectedExchangeModel from '../../../../models/connectedExchange';
import exchangeModel from '../../../../models/exchange';
import userModel from '../../../../models/user';
import { buy, sell, cancelOrder, buy_for_market, sell_for_market } from '../../../../helper/buySell';
import { triangularOrderDetails } from '../../../../helper/triangularOrderDetails';
import { filter_orderId } from '../../../../helper/filter_orderId';
import { filter_triangularOrderDetails } from '../../../../helper/filter_triangularOrderDetails';
import orderModel from '../../../../models/orderModel';
import config from "config";
// import logger from "../../../../helper/logger";
import status from "../../../../enums/status";
import { notificationServices } from '../../services/notification';
const { notificationCreate, notificationData, notificationUpdate } = notificationServices;
import { triangularRebalancing } from '../cronjob/rebalancingTrade'
import { rebalancingTradeServices } from '../../services/rebalancingTrade'
const { rebalancingTradeData } = rebalancingTradeServices
import arbitrageType from "../../../../enums/arbitrageType"
import { buySubsciptionPlanHistoryServices } from "../../services/buySubscriptionPlanHistory"
const { lastedBuyPlan } = buySubsciptionPlanHistoryServices
import arbitrage from "../../../../enums/arbitrage";
import commonFunction from '../../../../helper/util';

///////////////////////////////////////////////////////////////////////////////////////////////////
let minutes = 30
let triangularManualTime = Date.now() + minutes * 60 * 1000
let triangularAutoTime = Date.now() + minutes * 60 * 1000
let triangularSniperTime = Date.now() + minutes * 60 * 1000
let triangularAllTime = Date.now() + minutes * 60 * 1000

let executeTriangularArbitrage = new CronJob(config.get('cronTime.triangularArbitrage'), async () => {
    try {
        executeTriangularArbitrage.stop();
        let query = { status: "ACTIVE", arbitrageStatus: "PENDING", isFirstStrategy: true, arbitrageType: arbitrageType.MANUAL }
        let triangularArbitrageList = await triangularModel.find(query);
        let count = 0;
        let obj
        console.log("Total triangularArbitrage ==>manula", triangularArbitrageList.length)
        // if (triangularArbitrageList.length == 0) {
        //     executeTriangularArbitrage.start()
        // } else {
        //     executeTriangularArbitrage.stop();
        // }
        for (let a = 0; a < triangularArbitrageList.length; a++) {
            obj = triangularArbitrageList[a];
            let exchange = obj.exchangeName;
            // let [connectedExchangeData, tickers] = await Promise.all([connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE }), exchangeModel.findOne({ exchangeName: exchange })])
            let [connectedExchangeData, tickers, userInfo] = await Promise.all([connectedExchangeModel.findOne({ _id: obj.connectedExchangeId }), exchangeModel.findOne({ exchangeName: exchange }), userModel.findOne({ _id: obj.userId })])
            tickers = tickers.tickers
            let quantity = obj.capital;
            if (connectedExchangeData) {
                let apiKey = connectedExchangeData.apiKey;
                let secretKey = connectedExchangeData.secretKey;
                let passphrase = connectedExchangeData.passphrase;
                let customerId = connectedExchangeData.customerId;
                let api_memo = connectedExchangeData.apiMemo;
                let placedArbitrageId = obj._id;
                let finalPrice
                for (let i = 0; i < obj.strategy.length; i++) {
                    let symbol = Object.keys(obj.strategy[i])[0];
                    let action = Object.values(obj.strategy[i])[0];
                    let price = obj.strategy[i].price;
                    let newPathArray = new Array();
                    if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
                        let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                            // console.log('Triangular Arbitrage Status CANCELLED ==>>58 ', arbitrageStatusUpdate, updateUser);
                            let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_cancel': true })
                            if (checkNotificationOnOff) {
                                let notificationObj = {
                                    userId: obj.userId,
                                    orderId: obj.strategy[i].orderId,
                                    symbol: symbol,
                                    title: `Triangular Arbitrage Trade Cancellation - Order ${obj.strategy[i].orderId}`,
                                    body: `Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been cancelled.`
                                }
                                await notificationCreate(notificationObj)
                            }
                        }
                        break;
                    } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
                        let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capital)
                        // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
                        let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            // let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 }, $inc: { planProfit: -Number(profit) } }, { new: true });
                            // console.log('Triangular Arbitrage Status Completed ==>>78 ', arbitrageStatusUpdate, updateUser);
                            let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_success': true })
                            if (checkNotificationOnOff) {
                                let notificationObj = {
                                    userId: obj.userId,
                                    orderId: obj.strategy[i].orderId,
                                    symbol: symbol,
                                    title: `Triangular Arbitrage Trade Successful - Order ${obj.strategy[i].orderId}`,
                                    body: `Congratulations! Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been successfully executed!`
                                }
                                await notificationCreate(notificationObj)
                            }
                            await commonFunction.sendEmailCloseTrade(updateUser.email, "Hi", "Triangular Arbitrage", symbol, obj.capital, profit)
                        }
                        break;
                    } else if (obj.strategy[i].status == 'rebalancing' && obj.strategy[i].isActive == true) {
                        console.log("========================>>>>>93")
                        let cancelRes = await cancelOrder(exchange, symbol, obj.strategy[i].orderId, apiKey, secretKey, passphrase, customerId, api_memo, obj.strategy[i].baseCurrency, obj.strategy[i].quoteCurrency)
                        if (cancelRes.status == true) {
                            obj.strategy[i].isActive = false
                            obj.strategy[i].isTrade = true
                            let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { strategy: obj.strategy }, { new: true })
                            // console.log("rebalancing update=================>>>99", arbitrageStatusUpdate)
                        }
                    }
                    else {
                        if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
                            console.log('104 Do respected act and update isActive status', i, new Date().toLocaleTimeString());
                            let orderPlaced;
                            let isMarket = false
                            let token;
                            let current_token;
                            let amount = obj.amount;
                            let filledTotal = obj.filledTotal;
                            token = [tickers[symbol]['base'], tickers[symbol]['quote']];
                            if (action == 'buy') {
                                if (i == 0) {//HAI_ETH
                                    console.log('113 ==============================>>> If ', i, token[0] != 'USDT');
                                    // if (token[0] != 'USDT' && exchange != 'Kucoin') { //if not endswith USDT
                                    //     // console.log('65 ==>', exchange, token[0], 'USD');
                                    //     quantity = quantity / tickers[token[0] + token[1]].price;
                                    // } else if (token[0] != 'USDT' && exchange == 'Kucoin') { //if not endswith USDT
                                    //     // console.log('65 ==>', exchange, token[0], 'USDT');
                                    //     quantity = quantity / tickers[token[0] + token[1]].price;
                                    // }else{
                                    //     quantity = quantity / price;
                                    // }

                                    if (token[1] == obj.start) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }

                                    quantity = quantity / finalPrice;
                                    current_token = token[0]
                                } else {
                                    console.log('137 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            // actionValue = Object.values(obj.strategy[b])[0]
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    if (token[1] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }

                                    // if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount / price;
                                    // }
                                    // else if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal / price;

                                    // }
                                    console.log('=========================>>>>>>>163', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                        // quantity = amount * obj.strategy[i].finalPrice;
                                    }
                                    else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                    // quantity = Object.values(obj.strategy[i - 1])[6] / finalPrice
                                    // quantity = amount / finalPrice
                                    if (exchange != "Gemini") {
                                        if (userInfo.isHybridOrder == true) {
                                            if (actionValue == 0 && i != 0) {
                                                isMarket = true
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    // quantity = Number(amount) / Number(price);
                                                    quantity = Number(amount);
                                                }
                                                else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    // quantity = Number(filledTotal) / Number(price);
                                                    quantity = Number(filledTotal);
                                                }
                                            }
                                        }
                                    }
                                }
                                if (isMarket == true) {
                                    orderPlaced = await buy_for_market(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                } else {
                                    orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                }
                                // orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                // console.log('Buy orderPlaced 174 ==>', orderPlaced)
                                if (orderPlaced) {
                                    orderPlaced.side = 'buy'
                                }
                            }
                            else if (action == 'sell') {
                                if (i == 0) {//HAI_ETH
                                    // console.log('==============================>>> If ', i, token[0] != 'USDT' && exchange != 'BitFinex', token[0] != 'USD' && exchange == 'BitFinex');
                                    if (token[0] == obj.start) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }
                                    quantity = quantity;
                                    current_token = token[0]
                                } else {
                                    console.log('194 ==============================>>> else ', i);
                                    // if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount;
                                    // } else if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal;
                                    // }
                                    // if (Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount;
                                    // } else if (Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal;
                                    // }
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            // actionValue = Object.values(obj.strategy[b])[0]
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    if (token[0] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }
                                    // quantity = Object.values(obj.strategy[i - 1])[6]
                                    // quantity = amount;
                                    console.log('=========================>>>>>>>224', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                    if (exchange != "Gemini") {
                                        if (userInfo.isHybridOrder == true) {
                                            if (actionValue == 0 && i != 0) {
                                                isMarket = true
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    quantity = amount;
                                                } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    quantity = filledTotal;
                                                }
                                            }
                                            if (actionValue == 1 && i != 0) {
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    let tradeFees = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit)) * 0.9 / 100
                                                    finalPrice = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit) + parseFloat(tradeFees)) / amount
                                                } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    let tradeFees = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit)) * 0.9 / 100
                                                    finalPrice = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit) + parseFloat(tradeFees)) / filledTotal
                                                }
                                            }
                                        }
                                    }
                                }
                                // console.log('231 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
                                if (isMarket == true) {
                                    orderPlaced = await sell_for_market(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                } else {
                                    orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                }
                                if (orderPlaced) {
                                    orderPlaced.side = 'sell'
                                }
                            }
                            // console.log("order data =====>>>237", orderPlaced)
                            if (orderPlaced) {
                                if (orderPlaced && orderPlaced.isTradable == true) {
                                    orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
                                    if (orderPlaced.orderId) {
                                        let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
                                        if (order) {
                                            console.log('244==> Order already placed >>', order)
                                        } else {
                                            let objsave = {
                                                userId: obj.userId,
                                                symbol: symbol,
                                                price: price,
                                                quantity: quantity,
                                                side: orderPlaced.side,
                                                type: 'limit',
                                                orderStatus: 'open',
                                                orderId: orderPlaced.orderId,
                                                exchangeName: exchange
                                            }
                                            let saveOrderResult = await orderModel(objsave).save();
                                            if (saveOrderResult) {
                                                let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
                                                for (let k = 0; k < triangularData.strategy.length; k++) {
                                                    if (k == i) {
                                                        triangularData.strategy[k].isActive = true;
                                                        triangularData.strategy[k].orderId = orderPlaced.orderId;
                                                        if (k == triangularData.strategy.length - 1) {
                                                            triangularData.strategy[k].price = finalPrice;
                                                        }
                                                    }
                                                    newPathArray.push(triangularData.strategy[k])
                                                }
                                                let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now() } }, { new: true });
                                                // console.log('268 updateStrategy>>>', updateStrategy.exchangeName);
                                            }
                                        }
                                    }
                                }
                                else if (orderPlaced.isTradable == false) {
                                    let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
                                    // console.log('Arbitrage blocked ==>275', arbitrageStatusUpdate)
                                    let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_error': true })
                                    if (checkNotificationOnOff) {
                                        let notificationObj = {
                                            userId: obj.userId,
                                            symbol: symbol,
                                            title: `Triangular Arbitrage Trade Unsuccessful - Symbol ${symbol}`,
                                            body: `Regrettably, your Triangular Arbitrage trade (Symbol ${symbol}) on ${exchange} has encountered a failure.`
                                        }
                                        await notificationCreate(notificationObj)
                                    }
                                }
                            }

                            break;
                        }
                        else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
                            // console.log(`292 ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
                            // console.log('293 Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
                            if (tickers[symbol]) {
                                symbol = tickers[symbol].symbol
                            }
                            let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, api_memo, passphrase);
                            let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, symbol, tickers);
                            console.log('OrderStatus ==>296 ', filteredOrderData)
                            let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
                            if (filteredOrderData && filteredOrderData.orderStatus) {
                                if (filteredOrderData.orderStatus == 'cancelled') {
                                    for (let k = 0; k < triangularData.strategy.length; k++) {
                                        if (k == i) {
                                            triangularData.strategy[k].isActive = false;
                                            triangularData.strategy[k].orderId = obj.strategy[i].orderId;
                                            triangularData.strategy[k].status = filteredOrderData.orderStatus;
                                        }
                                        newPathArray.push(triangularData.strategy[k])
                                    }
                                }
                                else {
                                    try {
                                        for (let k = 0; k < triangularData.strategy.length; k++) {
                                            if (k == i) {
                                                triangularData.strategy[k].isActive = true;
                                                triangularData.strategy[k].orderId = obj.strategy[i].orderId;
                                                triangularData.strategy[k].status = filteredOrderData.orderStatus;
                                            }
                                            newPathArray.push(triangularData.strategy[k])
                                        }
                                        if (Array.isArray(orderData) == true) {
                                            orderData = Object.assign({}, orderData);
                                        }
                                        let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
                                        if (updateOrder) {
                                            // console.log('167 >>> updateOrder')
                                        }
                                    } catch (error) {
                                        console.log('327 Error: =>', error)
                                    }
                                }
                            }
                            if (newPathArray.length != 0) {
                                try {
                                    if (newPathArray[i].status == 'closed') {
                                        newPathArray[i].isActive = false;
                                        newPathArray[i].isTrade = true;
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, isFirstStrategy: false } }, { new: true });
                                        // console.log('339 >>>', updateStrategy);
                                    } else {
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
                                        let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                } catch (error) {
                                    console.log('347 Error: =>', error)
                                }
                            }
                            break;
                        }
                    }
                }
                count = count + 1;
                if (triangularArbitrageList.length == count) {
                    // console.log('===================================================')
                }
            }
            if (a === triangularArbitrageList.length - 1) {
                let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([triangularModel.find(query), rebalancingTradeData({ arbitrageName: "TRIANGULAR" })])
                if (checkRebalancingTrade.length != 0) {
                    // executeTriangularArbitrage.stop();
                    if (rebalancingACtiveCheck) {
                        if (rebalancingACtiveCheck.isRebalancingActive == true) {
                            // await triangularRebalancing(arbitrageType.MANUAL)
                        }
                    }
                }
                // executeTriangularArbitrage.start();
            }
        }
        // });
        executeTriangularArbitrage.start();
        triangularManualTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        executeTriangularArbitrage.start();
        // logger.error(error)
        console.log('triangularArbitrage catch ===>>378', error.message)
    }
});

let executeAutoTriangularArbitrage = new CronJob(config.get('cronTime.triangularArbitrage'), async () => {
    try {
        executeAutoTriangularArbitrage.stop();
        let query = { status: "ACTIVE", arbitrageStatus: "PENDING", isFirstStrategy: true, arbitrageType: arbitrageType.AUTO }
        let triangularArbitrageList = await triangularModel.find(query);
        let count = 0;
        let obj
        console.log("Total triangularArbitrage ==>auto", triangularArbitrageList.length)
        // if (triangularArbitrageList.length == 0) {
        //     executeAutoTriangularArbitrage.start()
        // } else {
        //     executeAutoTriangularArbitrage.stop();
        // }
        for (let a = 0; a < triangularArbitrageList.length; a++) {
            obj = triangularArbitrageList[a];
            let exchange = obj.exchangeName;
            // let [connectedExchangeData, tickers] = await Promise.all([connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE }), exchangeModel.findOne({ exchangeName: exchange })])
            let [connectedExchangeData, tickers, userInfo] = await Promise.all([connectedExchangeModel.findOne({ _id: obj.connectedExchangeId }), exchangeModel.findOne({ exchangeName: exchange }), userModel.findOne({ _id: obj.userId })])
            tickers = tickers.tickers
            let quantity = obj.capital;
            if (connectedExchangeData) {
                let apiKey = connectedExchangeData.apiKey;
                let secretKey = connectedExchangeData.secretKey;
                let passphrase = connectedExchangeData.passphrase;
                let customerId = connectedExchangeData.customerId;
                let api_memo = connectedExchangeData.apiMemo;
                let placedArbitrageId = obj._id;
                let finalPrice
                for (let i = 0; i < obj.strategy.length; i++) {
                    let symbol = Object.keys(obj.strategy[i])[0];
                    let action = Object.values(obj.strategy[i])[0];
                    let price = obj.strategy[i].price;
                    let newPathArray = new Array();
                    if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
                        let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                            // console.log('Triangular Arbitrage Status CANCELLED ==>>418 ', arbitrageStatusUpdate, updateUser);
                            let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_cancel': true })
                            if (checkNotificationOnOff) {
                                let notificationObj = {
                                    userId: obj.userId,
                                    orderId: obj.strategy[i].orderId,
                                    symbol: symbol,
                                    title: `Triangular Arbitrage Trade Cancellation - Order ${obj.strategy[i].orderId}`,
                                    body: `Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been cancelled.`
                                }
                                await notificationCreate(notificationObj)
                            }
                        }
                        break;
                    } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
                        let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capital)
                        // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
                        let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            // let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 }, $inc: { planProfit: -Number(profit) } }, { new: true });
                            // console.log('Triangular Arbitrage Status Completed ==>>438 ', arbitrageStatusUpdate, updateUser);
                            let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_success': true })
                            if (checkNotificationOnOff) {
                                let notificationObj = {
                                    userId: obj.userId,
                                    orderId: obj.strategy[i].orderId,
                                    symbol: symbol,
                                    title: `Triangular Arbitrage Trade Successful - Order ${obj.strategy[i].orderId}`,
                                    body: `Congratulations! Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been successfully executed!`
                                }
                                await notificationCreate(notificationObj)
                            }
                            await commonFunction.sendEmailCloseTrade(updateUser.email, "User", "Triangular Arbitrage", symbol, obj.capital, profit)
                        }
                        break;
                    } else if (obj.strategy[i].status == 'rebalancing' && obj.strategy[i].isActive == true) {
                        console.log("========================>>>>>453")
                        let cancelRes = await cancelOrder(exchange, symbol, obj.strategy[i].orderId, apiKey, secretKey, passphrase, customerId, api_memo, obj.strategy[i].baseCurrency, obj.strategy[i].quoteCurrency)
                        if (cancelRes.status == true) {
                            obj.strategy[i].isActive = false
                            obj.strategy[i].isTrade = true
                            let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { strategy: obj.strategy }, { new: true })
                            // console.log("rebalancing update=================>>>459", arbitrageStatusUpdate)
                        }
                    }
                    else {
                        if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
                            console.log('464 Do respected act and update isActive status', i, new Date().toLocaleTimeString());
                            let orderPlaced;
                            let isMarket = false
                            let token;
                            let current_token;
                            let amount = obj.amount;
                            let filledTotal = obj.filledTotal;
                            token = [tickers[symbol]['base'], tickers[symbol]['quote']];
                            if (action == 'buy') {
                                if (i == 0) {//HAI_ETH
                                    console.log('473 ==============================>>> If ', i, token[0] != 'USDT');
                                    // if (token[0] != 'USDT' && exchange != 'Kucoin') { //if not endswith USDT
                                    //     // console.log('65 ==>', exchange, token[0], 'USD');
                                    //     quantity = quantity / tickers[token[0] + token[1]].price;
                                    // } else if (token[0] != 'USDT' && exchange == 'Kucoin') { //if not endswith USDT
                                    //     // console.log('65 ==>', exchange, token[0], 'USDT');
                                    //     quantity = quantity / tickers[token[0] + token[1]].price;
                                    // }else{
                                    //     quantity = quantity / price;
                                    // }

                                    if (token[1] == obj.start) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }

                                    quantity = quantity / finalPrice;
                                    current_token = token[0]
                                } else {
                                    console.log('497 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            // actionValue = Object.values(obj.strategy[b])[0]
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    if (token[1] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }

                                    // if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount / price;
                                    // }
                                    // else if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal / price;

                                    // }
                                    console.log('523 =========================>>>>>>>', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                        // quantity = amount * obj.strategy[i].finalPrice;
                                    }
                                    else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                    // quantity = Object.values(obj.strategy[i - 1])[6] / finalPrice
                                    // quantity = amount / finalPrice
                                    if (exchange != "Gemini") {
                                        if (userInfo.isHybridOrder == true) {
                                            if (actionValue == 0 && i != 0) {
                                                isMarket = true
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    // quantity = Number(amount) / Number(price);
                                                    quantity = Number(amount);
                                                }
                                                else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    // quantity = Number(filledTotal) / Number(price);
                                                    quantity = Number(filledTotal);
                                                }
                                            }
                                        }
                                    }
                                }
                                if (isMarket == true) {
                                    orderPlaced = await buy_for_market(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                } else {
                                    orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                }
                                // console.log('Buy orderPlaced 534 ==>', orderPlaced)
                                if (orderPlaced) {
                                    orderPlaced.side = 'buy'
                                }
                            }
                            else if (action == 'sell') {
                                if (i == 0) {//HAI_ETH
                                    // console.log('==============================>>> If ', i, token[0] != 'USDT' && exchange != 'BitFinex', token[0] != 'USD' && exchange == 'BitFinex');
                                    if (token[0] == obj.start) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }
                                    quantity = quantity;
                                    current_token = token[0]
                                } else {
                                    console.log('554 ==============================>>> else ', i);
                                    // if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount;
                                    // } else if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal;
                                    // }
                                    // if (Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount;
                                    // } else if (Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal;
                                    // }
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            // actionValue = Object.values(obj.strategy[b])[0]
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    if (token[0] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }
                                    // quantity = Object.values(obj.strategy[i - 1])[6]
                                    // quantity = amount;
                                    console.log('=========================>>>>>>>584', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                    if (exchange != "Gemini") {
                                        if (userInfo.isHybridOrder == true) {
                                            if (actionValue == 0 && i != 0) {
                                                isMarket = true
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    quantity = amount;
                                                } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    quantity = filledTotal;
                                                }
                                            }
                                            if (actionValue == 1 && i != 0) {
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    let tradeFees = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit)) * 0.9 / 100
                                                    finalPrice = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit) + parseFloat(tradeFees)) / amount
                                                } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    let tradeFees = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit)) * 0.9 / 100
                                                    finalPrice = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit) + parseFloat(tradeFees)) / filledTotal
                                                }
                                            }
                                        }
                                    }
                                }
                                // console.log('231 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
                                if (isMarket == true) {
                                    orderPlaced = await sell_for_market(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                } else {
                                    orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                }
                                if (orderPlaced) {
                                    orderPlaced.side = 'sell'
                                }
                            }
                            // console.log("order data =====>>>597", orderPlaced)
                            if (orderPlaced) {
                                if (orderPlaced && orderPlaced.isTradable == true) {
                                    orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
                                    if (orderPlaced.orderId) {
                                        let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
                                        if (order) {
                                            console.log('604==> Order already placed >>', order)
                                        } else {
                                            let objsave = {
                                                userId: obj.userId,
                                                symbol: symbol,
                                                price: price,
                                                quantity: quantity,
                                                side: orderPlaced.side,
                                                type: 'limit',
                                                orderStatus: 'open',
                                                orderId: orderPlaced.orderId,
                                                exchangeName: exchange
                                            }
                                            let saveOrderResult = await orderModel(objsave).save();
                                            if (saveOrderResult) {
                                                let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
                                                for (let k = 0; k < triangularData.strategy.length; k++) {
                                                    if (k == i) {
                                                        triangularData.strategy[k].isActive = true;
                                                        triangularData.strategy[k].orderId = orderPlaced.orderId;
                                                        if (k == triangularData.strategy.length - 1) {
                                                            triangularData.strategy[k].price = finalPrice;
                                                        }
                                                    }
                                                    newPathArray.push(triangularData.strategy[k])
                                                }
                                                let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now() } }, { new: true });
                                                // console.log('623 updateStrategy>>>', updateStrategy.exchangeName);
                                            }
                                        }
                                    }
                                }
                                else if (orderPlaced.isTradable == false) {
                                    let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
                                    // console.log('Arbitrage blocked ==>635 ', arbitrageStatusUpdate)
                                    let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_error': true })
                                    if (checkNotificationOnOff) {
                                        let notificationObj = {
                                            userId: obj.userId,
                                            symbol: symbol,
                                            title: `Triangular Arbitrage Trade Unsuccessful - Symbol ${symbol}`,
                                            body: `Regrettably, your Triangular Arbitrage trade (Symbol ${symbol}) on ${exchange} has encountered a failure.`
                                        }
                                        await notificationCreate(notificationObj)
                                    }
                                }
                            }

                            break;
                        }
                        else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
                            // console.log(`652 ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
                            // console.log('653 Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
                            if (tickers[symbol]) {
                                symbol = tickers[symbol].symbol
                            }
                            let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, api_memo, passphrase);
                            let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, symbol, tickers);
                            // console.log('OrderStatus ==>656', filteredOrderData)
                            let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
                            if (filteredOrderData && filteredOrderData.orderStatus) {
                                if (filteredOrderData.orderStatus == 'cancelled') {
                                    for (let k = 0; k < triangularData.strategy.length; k++) {
                                        if (k == i) {
                                            triangularData.strategy[k].isActive = false;
                                            triangularData.strategy[k].orderId = obj.strategy[i].orderId;
                                            triangularData.strategy[k].status = filteredOrderData.orderStatus;
                                        }
                                        newPathArray.push(triangularData.strategy[k])
                                    }
                                }
                                else {
                                    try {
                                        for (let k = 0; k < triangularData.strategy.length; k++) {
                                            if (k == i) {
                                                triangularData.strategy[k].isActive = true;
                                                triangularData.strategy[k].orderId = obj.strategy[i].orderId;
                                                triangularData.strategy[k].status = filteredOrderData.orderStatus;
                                            }
                                            newPathArray.push(triangularData.strategy[k])
                                        }
                                        if (Array.isArray(orderData) == true) {
                                            orderData = Object.assign({}, orderData);
                                        }
                                        let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
                                        if (updateOrder) {
                                            // console.log('167 >>> updateOrder')
                                        }
                                    } catch (error) {
                                        console.log('687 Error: =>', error)
                                    }
                                }
                            }
                            if (newPathArray.length != 0) {
                                try {
                                    if (newPathArray[i].status == 'closed') {
                                        newPathArray[i].isActive = false;
                                        newPathArray[i].isTrade = true;
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, isFirstStrategy: false } }, { new: true });
                                        // console.log('699 >>>', updateStrategy);
                                    } else {
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
                                        let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                } catch (error) {
                                    console.log('707 Error: =>', error)
                                }
                            }
                            break;
                        }
                    }
                }
                count = count + 1;
                if (triangularArbitrageList.length == count) {
                    // console.log('===================================================')
                }
            }
            if (a === triangularArbitrageList.length - 1) {
                let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([triangularModel.find(query), rebalancingTradeData({ arbitrageName: "TRIANGULAR" })])
                if (checkRebalancingTrade.length != 0) {
                    // executeAutoTriangularArbitrage.stop();
                    if (rebalancingACtiveCheck) {
                        if (rebalancingACtiveCheck.isRebalancingActive == true) {
                            await triangularRebalancing(arbitrageType.AUTO)
                        }
                    }
                }
                // executeAutoTriangularArbitrage.start();
            }
        }
        executeAutoTriangularArbitrage.start();
        triangularAutoTime = Date.now() + minutes * 60 * 1000
        // });
    } catch (error) {
        executeAutoTriangularArbitrage.start();
        // logger.error(error)
        console.log('triangularArbitrage catch ===>>738', error.message)
    }
});

let executeSniperTriangularArbitrage = new CronJob(config.get('cronTime.triangularArbitrage'), async () => {
    try {
        executeSniperTriangularArbitrage.stop();
        let query = { status: "ACTIVE", arbitrageStatus: "PENDING", isFirstStrategy: true, arbitrageType: arbitrageType.SNIPER }
        let triangularArbitrageList = await triangularModel.find(query);
        let count = 0;
        let obj
        console.log("Total triangularArbitrage ==>sniper", triangularArbitrageList.length)
        // if (triangularArbitrageList.length == 0) {
        //     executeSniperTriangularArbitrage.start()
        // } else {
        //     executeSniperTriangularArbitrage.stop();
        // }
        for (let a = 0; a < triangularArbitrageList.length; a++) {
            obj = triangularArbitrageList[a];
            let exchange = obj.exchangeName;
            // let [connectedExchangeData, tickers] = await Promise.all([connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE }), exchangeModel.findOne({ exchangeName: exchange })])
            let [connectedExchangeData, tickers, userInfo] = await Promise.all([connectedExchangeModel.findOne({ _id: obj.connectedExchangeId }), exchangeModel.findOne({ exchangeName: exchange }), userModel.findOne({ _id: obj.userId })])
            tickers = tickers.tickers
            let quantity = obj.capital;
            if (connectedExchangeData) {
                let apiKey = connectedExchangeData.apiKey;
                let secretKey = connectedExchangeData.secretKey;
                let passphrase = connectedExchangeData.passphrase;
                let customerId = connectedExchangeData.customerId;
                let api_memo = connectedExchangeData.apiMemo;
                let placedArbitrageId = obj._id;
                let finalPrice
                for (let i = 0; i < obj.strategy.length; i++) {
                    let symbol = Object.keys(obj.strategy[i])[0];
                    let action = Object.values(obj.strategy[i])[0];
                    let price = obj.strategy[i].price;
                    let newPathArray = new Array();
                    if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
                        let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                            // console.log('778 Triangular Arbitrage Status CANCELLED ==>> ', arbitrageStatusUpdate, updateUser);
                            let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_cancel': true })
                            if (checkNotificationOnOff) {
                                let notificationObj = {
                                    userId: obj.userId,
                                    orderId: obj.strategy[i].orderId,
                                    symbol: symbol,
                                    title: `Triangular Arbitrage Trade Cancellation - Order ${obj.strategy[i].orderId}`,
                                    body: `Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been cancelled.`
                                }
                                await notificationCreate(notificationObj)
                            }
                        }
                        break;
                    } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
                        let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capital)
                        // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
                        let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            // let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 }, $inc: { planProfit: -Number(profit) } }, { new: true });
                            // console.log('Triangular Arbitrage Status Completed ==>>798 ', arbitrageStatusUpdate, updateUser);
                            let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_success': true })
                            if (checkNotificationOnOff) {
                                let notificationObj = {
                                    userId: obj.userId,
                                    orderId: obj.strategy[i].orderId,
                                    symbol: symbol,
                                    title: `Triangular Arbitrage Trade Successful - Order ${obj.strategy[i].orderId}`,
                                    body: `Congratulations! Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been successfully executed!`
                                }
                                await notificationCreate(notificationObj)
                            }
                            await commonFunction.sendEmailCloseTrade(updateUser.email, "User", "Triangular Arbitrage", symbol, obj.capital, profit)
                        }
                        break;
                    } else if (obj.strategy[i].status == 'rebalancing' && obj.strategy[i].isActive == true) {
                        console.log("========================>>>>>813")
                        let cancelRes = await cancelOrder(exchange, symbol, obj.strategy[i].orderId, apiKey, secretKey, passphrase, customerId, api_memo, obj.strategy[i].baseCurrency, obj.strategy[i].quoteCurrency)
                        if (cancelRes.status == true) {
                            obj.strategy[i].isActive = false
                            obj.strategy[i].isTrade = true
                            let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { strategy: obj.strategy }, { new: true })
                            // console.log("rebalancing update=================>>>819", arbitrageStatusUpdate)
                        }
                    }
                    else {
                        if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
                            console.log('824 Do respected act and update isActive status', i, new Date().toLocaleTimeString());
                            let orderPlaced;
                            let isMarket = false
                            let token;
                            let current_token;
                            let amount = obj.amount;
                            let filledTotal = obj.filledTotal;
                            token = [tickers[symbol]['base'], tickers[symbol]['quote']];
                            if (action == 'buy') {
                                if (i == 0) {//HAI_ETH
                                    console.log('833 ==============================>>> If ', i, token[0] != 'USDT');
                                    // if (token[0] != 'USDT' && exchange != 'Kucoin') { //if not endswith USDT
                                    //     // console.log('65 ==>', exchange, token[0], 'USD');
                                    //     quantity = quantity / tickers[token[0] + token[1]].price;
                                    // } else if (token[0] != 'USDT' && exchange == 'Kucoin') { //if not endswith USDT
                                    //     // console.log('65 ==>', exchange, token[0], 'USDT');
                                    //     quantity = quantity / tickers[token[0] + token[1]].price;
                                    // }else{
                                    //     quantity = quantity / price;
                                    // }

                                    if (token[1] == obj.start) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }

                                    quantity = quantity / finalPrice;
                                    current_token = token[0]
                                } else {
                                    console.log('857 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            // actionValue = Object.values(obj.strategy[b])[0]
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    if (token[1] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }

                                    // if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount / price;
                                    // }
                                    // else if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal / price;

                                    // }
                                    console.log('=========================>>>>>>>883', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                        // quantity = amount * obj.strategy[i].finalPrice;
                                    }
                                    else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                    // quantity = Object.values(obj.strategy[i - 1])[6] / finalPrice
                                    // quantity = amount / finalPrice
                                    if (exchange != "Gemini") {
                                        if (userInfo.isHybridOrder == true) {
                                            if (actionValue == 0 && i != 0) {
                                                isMarket = true
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    // quantity = Number(amount) / Number(price);
                                                    quantity = Number(amount);
                                                }
                                                else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    // quantity = Number(filledTotal) / Number(price);
                                                    quantity = Number(filledTotal);
                                                }
                                            }
                                        }
                                    }
                                }
                                if (isMarket == true) {
                                    orderPlaced = await buy_for_market(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                } else {
                                    orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                }
                                // console.log('Buy orderPlaced 86 ==>', orderPlaced)
                                if (orderPlaced) {
                                    orderPlaced.side = 'buy'
                                }
                            }
                            else if (action == 'sell') {
                                if (i == 0) {//HAI_ETH
                                    // console.log('==============================>>> If ', i, token[0] != 'USDT' && exchange != 'BitFinex', token[0] != 'USD' && exchange == 'BitFinex');
                                    if (token[0] == obj.start) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }
                                    quantity = quantity;
                                    current_token = token[0]
                                } else {
                                    console.log('914 ==============================>>> else ', i);
                                    // if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount;
                                    // } else if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal;
                                    // }
                                    // if (Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount;
                                    // } else if (Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal;
                                    // }
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            // actionValue = Object.values(obj.strategy[b])[0]
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    if (token[0] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }
                                    // quantity = Object.values(obj.strategy[i - 1])[6]
                                    // quantity = amount;
                                    console.log('=========================>>>>>>>944', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                    if (exchange != "Gemini") {
                                        if (userInfo.isHybridOrder == true) {
                                            if (actionValue == 0 && i != 0) {
                                                isMarket = true
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    quantity = amount;
                                                } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    quantity = filledTotal;
                                                }
                                            }
                                            if (actionValue == 1 && i != 0) {
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    let tradeFees = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit)) * 0.9 / 100
                                                    finalPrice = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit) + parseFloat(tradeFees)) / amount
                                                } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    let tradeFees = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit)) * 0.9 / 100
                                                    finalPrice = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit) + parseFloat(tradeFees)) / filledTotal
                                                }
                                            }
                                        }
                                    }
                                }
                                // console.log('951 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
                                if (isMarket == true) {
                                    orderPlaced = await sell_for_market(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                } else {
                                    orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                }
                                if (orderPlaced) {
                                    orderPlaced.side = 'sell'
                                }
                            }
                            // console.log("order data =====>>>957", orderPlaced)
                            if (orderPlaced) {
                                if (orderPlaced && orderPlaced.isTradable == true) {
                                    orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
                                    if (orderPlaced.orderId) {
                                        let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
                                        if (order) {
                                            console.log('964==> Order already placed >>', order)
                                        } else {
                                            let objsave = {
                                                userId: obj.userId,
                                                symbol: symbol,
                                                price: price,
                                                quantity: quantity,
                                                side: orderPlaced.side,
                                                type: 'limit',
                                                orderStatus: 'open',
                                                orderId: orderPlaced.orderId,
                                                exchangeName: exchange
                                            }
                                            let saveOrderResult = await orderModel(objsave).save();
                                            if (saveOrderResult) {
                                                let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
                                                for (let k = 0; k < triangularData.strategy.length; k++) {
                                                    if (k == i) {
                                                        triangularData.strategy[k].isActive = true;
                                                        triangularData.strategy[k].orderId = orderPlaced.orderId;
                                                        if (k == triangularData.strategy.length - 1) {
                                                            triangularData.strategy[k].price = finalPrice;
                                                        }
                                                    }
                                                    newPathArray.push(triangularData.strategy[k])
                                                }
                                                let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now() } }, { new: true });
                                                // console.log('988 updateStrategy>>>', updateStrategy.exchangeName);
                                            }
                                        }
                                    }
                                }
                                else if (orderPlaced.isTradable == false) {
                                    let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
                                    // console.log('Arbitrage blocked ==>995', arbitrageStatusUpdate)
                                    let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_error': true })
                                    if (checkNotificationOnOff) {
                                        let notificationObj = {
                                            userId: obj.userId,
                                            symbol: symbol,
                                            title: `Triangular Arbitrage Trade Unsuccessful - Symbol ${symbol}`,
                                            body: `Regrettably, your Triangular Arbitrage trade (Symbol ${symbol}) on ${exchange} has encountered a failure.`
                                        }
                                        await notificationCreate(notificationObj)
                                    }
                                }
                            }

                            break;
                        }
                        else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
                            // console.log(`1012 ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
                            // console.log('1013 Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
                            if (tickers[symbol]) {
                                symbol = tickers[symbol].symbol
                            }
                            let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, api_memo, passphrase);
                            let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, symbol, tickers);
                            // console.log('OrderStatus ==>1016', filteredOrderData)
                            let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
                            if (filteredOrderData && filteredOrderData.orderStatus) {
                                if (filteredOrderData.orderStatus == 'cancelled') {
                                    for (let k = 0; k < triangularData.strategy.length; k++) {
                                        if (k == i) {
                                            triangularData.strategy[k].isActive = false;
                                            triangularData.strategy[k].orderId = obj.strategy[i].orderId;
                                            triangularData.strategy[k].status = filteredOrderData.orderStatus;
                                        }
                                        newPathArray.push(triangularData.strategy[k])
                                    }
                                }
                                else {
                                    try {
                                        for (let k = 0; k < triangularData.strategy.length; k++) {
                                            if (k == i) {
                                                triangularData.strategy[k].isActive = true;
                                                triangularData.strategy[k].orderId = obj.strategy[i].orderId;
                                                triangularData.strategy[k].status = filteredOrderData.orderStatus;
                                            }
                                            newPathArray.push(triangularData.strategy[k])
                                        }
                                        if (Array.isArray(orderData) == true) {
                                            orderData = Object.assign({}, orderData);
                                        }
                                        let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
                                        if (updateOrder) {
                                            // console.log('167 >>> updateOrder')
                                        }
                                    } catch (error) {
                                        console.log('1047 Error: =>', error)
                                    }
                                }
                            }
                            if (newPathArray.length != 0) {
                                try {
                                    if (newPathArray[i].status == 'closed') {
                                        newPathArray[i].isActive = false;
                                        newPathArray[i].isTrade = true;
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, isFirstStrategy: false } }, { new: true });
                                        // console.log('1059 >>>', updateStrategy);
                                    } else {
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
                                        let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                } catch (error) {
                                    console.log('1067 Error: =>', error)
                                }
                            }
                            break;
                        }
                    }
                }
                count = count + 1;
                if (triangularArbitrageList.length == count) {
                    // console.log('===================================================')
                }
            }
            if (a === triangularArbitrageList.length - 1) {
                let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([triangularModel.find(query), rebalancingTradeData({ arbitrageName: "TRIANGULAR" })])
                if (checkRebalancingTrade.length != 0) {
                    // executeSniperTriangularArbitrage.stop();
                    if (rebalancingACtiveCheck) {
                        if (rebalancingACtiveCheck.isRebalancingActive == true) {
                            await triangularRebalancing(arbitrageType.SNIPER)
                        }
                    }
                }
                // executeSniperTriangularArbitrage.start();
            }
        }
        executeSniperTriangularArbitrage.start();
        triangularSniperTime = Date.now() + minutes * 60 * 1000
        // });
    } catch (error) {
        executeSniperTriangularArbitrage.start();
        // logger.error(error)
        console.log('triangularArbitrage catch ===>>1098', error.message)
    }
});

let executeAllTriangularArbitrage = new CronJob(config.get('cronTime.triangularArbitrage'), async () => {
    try {
        executeAllTriangularArbitrage.stop();
        let query = { status: "ACTIVE", arbitrageStatus: "PENDING", isFirstStrategy: false }
        let triangularArbitrageList = await triangularModel.find(query);
        let count = 0;
        let obj
        console.log("Total triangularArbitrage ==>All", triangularArbitrageList.length)
        // if (triangularArbitrageList.length == 0) {
        //     executeAllTriangularArbitrage.start()
        // } else {
        //     executeAllTriangularArbitrage.stop();
        // }
        for (let a = 0; a < triangularArbitrageList.length; a++) {
            obj = triangularArbitrageList[a];
            let exchange = obj.exchangeName;
            // let [connectedExchangeData, tickers] = await Promise.all([connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE }), exchangeModel.findOne({ exchangeName: exchange })])
            let [connectedExchangeData, tickers, userInfo] = await Promise.all([connectedExchangeModel.findOne({ _id: obj.connectedExchangeId }), exchangeModel.findOne({ exchangeName: exchange }), userModel.findOne({ _id: obj.userId })])
            tickers = tickers.tickers
            let quantity = obj.capital;
            if (connectedExchangeData) {
                let apiKey = connectedExchangeData.apiKey;
                let secretKey = connectedExchangeData.secretKey;
                let passphrase = connectedExchangeData.passphrase;
                let customerId = connectedExchangeData.customerId;
                let api_memo = connectedExchangeData.apiMemo;
                let placedArbitrageId = obj._id;
                let finalPrice
                for (let i = 0; i < obj.strategy.length; i++) {
                    let symbol = Object.keys(obj.strategy[i])[0];
                    let action = Object.values(obj.strategy[i])[0];
                    let price = obj.strategy[i].price;
                    let newPathArray = new Array();
                    if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
                        let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                            // console.log('Triangular Arbitrage Status CANCELLED ==>>1138 ', arbitrageStatusUpdate, updateUser);
                            let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_cancel': true })
                            if (checkNotificationOnOff) {
                                let notificationObj = {
                                    userId: obj.userId,
                                    orderId: obj.strategy[i].orderId,
                                    symbol: symbol,
                                    title: `Triangular Arbitrage Trade Cancellation - Order ${obj.strategy[i].orderId}`,
                                    body: `Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been cancelled.`
                                }
                                await notificationCreate(notificationObj)
                            }
                        }
                        break;
                    } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
                        let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capital)
                        // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
                        let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED }, { new: true })
                        if (arbitrageStatusUpdate) {
                            let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 }, $inc: { planProfit: -Number(profit) } }, { new: true });
                            // let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
                            // console.log('Triangular Arbitrage Status Completed ==>>1158 ', arbitrageStatusUpdate, updateUser);
                            let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_success': true })
                            if (checkNotificationOnOff) {
                                let notificationObj = {
                                    userId: obj.userId,
                                    orderId: obj.strategy[i].orderId,
                                    symbol: symbol,
                                    title: `Triangular Arbitrage Trade Successful - Order ${obj.strategy[i].orderId}`,
                                    body: `Congratulations! Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been successfully executed!`
                                }
                                await notificationCreate(notificationObj)
                            }
                            await commonFunction.sendEmailCloseTrade(updateUser.email, "User", "Triangular Arbitrage", symbol, obj.capital, profit)
                        }
                        break;
                    } else if (obj.strategy[i].status == 'rebalancing' && obj.strategy[i].isActive == true) {
                        console.log("========================>>>>>11173 ")
                        let cancelRes = await cancelOrder(exchange, symbol, obj.strategy[i].orderId, apiKey, secretKey, passphrase, customerId, api_memo, obj.strategy[i].baseCurrency, obj.strategy[i].quoteCurrency)
                        if (cancelRes.status == true) {
                            obj.strategy[i].isActive = false
                            obj.strategy[i].isTrade = true
                            let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { strategy: obj.strategy }, { new: true })
                            // console.log("rebalancing update=================>>>1179", arbitrageStatusUpdate)
                        }
                    }
                    else {
                        if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
                            console.log('1184 Do respected act and update isActive status', i, new Date().toLocaleTimeString());
                            let orderPlaced;
                            let isMarket = false
                            let token;
                            let current_token;
                            let amount = obj.amount;
                            let filledTotal = obj.filledTotal;
                            token = [tickers[symbol]['base'], tickers[symbol]['quote']];
                            if (action == 'buy') {
                                if (i == 0) {//HAI_ETH
                                    console.log('1193 ==============================>>> If ', i, token[0] != 'USDT');
                                    // if (token[0] != 'USDT' && exchange != 'Kucoin') { //if not endswith USDT
                                    //     // console.log('65 ==>', exchange, token[0], 'USD');
                                    //     quantity = quantity / tickers[token[0] + token[1]].price;
                                    // } else if (token[0] != 'USDT' && exchange == 'Kucoin') { //if not endswith USDT
                                    //     // console.log('65 ==>', exchange, token[0], 'USDT');
                                    //     quantity = quantity / tickers[token[0] + token[1]].price;
                                    // }else{
                                    //     quantity = quantity / price;
                                    // }

                                    if (token[1] == obj.start) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }

                                    quantity = quantity / finalPrice;
                                    current_token = token[0]
                                } else {
                                    console.log('1217 ==============================>>> else ', i);
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            // actionValue = Object.values(obj.strategy[b])[0]
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    if (token[1] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }

                                    // if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount / price;
                                    // }
                                    // else if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal / price;

                                    // }
                                    console.log('1243 =========================>>>>>>>140', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        // quantity = amount;
                                        quantity = amount * obj.strategy[i].finalPrice;
                                    }
                                    else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                    // quantity = Object.values(obj.strategy[i - 1])[6] / finalPrice
                                    // quantity = amount / finalPrice
                                    if (exchange != "Gemini") {
                                        if (userInfo.isHybridOrder == true) {
                                            if (actionValue == 0 && i != 0) {
                                                isMarket = true
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    // quantity = Number(amount) / Number(price);
                                                    quantity = Number(amount);
                                                }
                                                else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    // quantity = Number(filledTotal) / Number(price);
                                                    quantity = Number(filledTotal);
                                                }
                                            }
                                        }
                                    }
                                }
                                if (isMarket == true) {
                                    orderPlaced = await buy_for_market(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                } else {
                                    orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                }
                                // console.log('Buy orderPlaced 1254 ==>', orderPlaced)
                                if (orderPlaced) {
                                    orderPlaced.side = 'buy'
                                }
                            }
                            else if (action == 'sell') {
                                if (i == 0) {//HAI_ETH
                                    // console.log('==============================>>> If ', i, token[0] != 'USDT' && exchange != 'BitFinex', token[0] != 'USD' && exchange == 'BitFinex');
                                    if (token[0] == obj.start) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }
                                    quantity = quantity;
                                    current_token = token[0]
                                } else {
                                    console.log('1274 ==============================>>> else ', i);
                                    // if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount;
                                    // } else if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal;
                                    // }
                                    // if (Object.values(obj.strategy[i - 1])[0] == 'buy') {
                                    //     quantity = amount;
                                    // } else if (Object.values(obj.strategy[i - 1])[0] == 'sell') {
                                    //     quantity = filledTotal;
                                    // }
                                    let actionValue
                                    for (var b = i - 1; b >= 0; b--) {
                                        if (obj.strategy[b].status == 'closed') {
                                            // actionValue = Object.values(obj.strategy[b])[0]
                                            actionValue = b
                                            break;
                                        }
                                    }
                                    if (token[0] == Object.values(obj.strategy[actionValue])[7]) { //if not endswith USDT
                                        // let currencyPair = get_token(exchange, token[0], token[0]);
                                        // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
                                        finalPrice = price;
                                    }
                                    else { //if not endswith USDT
                                        // quantity = quantity / tickers[token[1] + token[0]].price;
                                        finalPrice = 1 / price;
                                    }
                                    // quantity = Object.values(obj.strategy[i - 1])[6]
                                    // quantity = amount;
                                    console.log('=========================>>>>>>>1304', actionValue)
                                    if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                        quantity = amount;
                                    } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                        quantity = filledTotal;
                                    }
                                    if (exchange != "Gemini") {
                                        if (userInfo.isHybridOrder == true) {
                                            if (actionValue == 0 && i != 0) {
                                                isMarket = true
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    quantity = amount;
                                                } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    quantity = filledTotal;
                                                }
                                            }
                                            if (actionValue == 1 && i != 0) {
                                                if (Object.values(obj.strategy[actionValue])[0] == 'buy') {
                                                    let tradeFees = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit)) * 0.9 / 100
                                                    finalPrice = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit) + parseFloat(tradeFees)) / amount
                                                } else if (Object.values(obj.strategy[actionValue])[0] == 'sell') {
                                                    let tradeFees = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit)) * 0.9 / 100
                                                    finalPrice = (parseFloat(obj.capital) + parseFloat(obj.expectedProfit) + parseFloat(tradeFees)) / filledTotal
                                                }
                                            }
                                        }
                                    }
                                }
                                // console.log('1311 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
                                if (isMarket == true) {
                                    orderPlaced = await sell_for_market(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                } else {
                                    orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
                                }
                                if (orderPlaced) {
                                    orderPlaced.side = 'sell'
                                }
                            }
                            // console.log("order data =====>>>1317", orderPlaced)
                            if (orderPlaced) {
                                if (orderPlaced && orderPlaced.isTradable == true) {
                                    orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
                                    if (orderPlaced.orderId) {
                                        let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
                                        if (order) {
                                            console.log('1324==> Order already placed >>', order)
                                        } else {
                                            let objsave = {
                                                userId: obj.userId,
                                                symbol: symbol,
                                                price: price,
                                                quantity: quantity,
                                                side: orderPlaced.side,
                                                type: 'limit',
                                                orderStatus: 'open',
                                                orderId: orderPlaced.orderId,
                                                exchangeName: exchange
                                            }
                                            let saveOrderResult = await orderModel(objsave).save();
                                            if (saveOrderResult) {
                                                let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
                                                for (let k = 0; k < triangularData.strategy.length; k++) {
                                                    if (k == i) {
                                                        triangularData.strategy[k].isActive = true;
                                                        triangularData.strategy[k].orderId = orderPlaced.orderId;
                                                        if (k == triangularData.strategy.length - 1) {
                                                            triangularData.strategy[k].price = finalPrice;
                                                        }
                                                    }
                                                    newPathArray.push(triangularData.strategy[k])
                                                }
                                                let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now(), isFirstStrategy: true } }, { new: true });
                                                // console.log('1347 updateStrategy>>>', updateStrategy.exchangeName);
                                            }
                                        }
                                    }
                                }
                                else if (orderPlaced.isTradable == false) {
                                    let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
                                    // console.log('1355 Arbitrage blocked ==>', arbitrageStatusUpdate)
                                    let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_error': true })
                                    if (checkNotificationOnOff) {
                                        let notificationObj = {
                                            userId: obj.userId,
                                            symbol: symbol,
                                            title: `Triangular Arbitrage Trade Unsuccessful - Symbol ${symbol}`,
                                            body: `Regrettably, your Triangular Arbitrage trade (Symbol ${symbol}) on ${exchange} has encountered a failure.`
                                        }
                                        await notificationCreate(notificationObj)
                                    }
                                }
                            }

                            break;
                        }
                        else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
                            // console.log(`1372 ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
                            // console.log('1373 Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
                            if (tickers[symbol]) {
                                symbol = tickers[symbol].symbol
                            }
                            let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, api_memo, passphrase);
                            let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, symbol, tickers);
                            // console.log('OrderStatus ==>1376 ', filteredOrderData)
                            let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
                            if (filteredOrderData && filteredOrderData.orderStatus) {
                                if (filteredOrderData.orderStatus == 'cancelled') {
                                    for (let k = 0; k < triangularData.strategy.length; k++) {
                                        if (k == i) {
                                            triangularData.strategy[k].isActive = false;
                                            triangularData.strategy[k].orderId = obj.strategy[i].orderId;
                                            triangularData.strategy[k].status = filteredOrderData.orderStatus;
                                        }
                                        newPathArray.push(triangularData.strategy[k])
                                    }
                                }
                                else {
                                    try {
                                        for (let k = 0; k < triangularData.strategy.length; k++) {
                                            if (k == i) {
                                                triangularData.strategy[k].isActive = true;
                                                triangularData.strategy[k].orderId = obj.strategy[i].orderId;
                                                triangularData.strategy[k].status = filteredOrderData.orderStatus;
                                            }
                                            newPathArray.push(triangularData.strategy[k])
                                        }
                                        if (Array.isArray(orderData) == true) {
                                            orderData = Object.assign({}, orderData);
                                        }
                                        let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
                                        if (updateOrder) {
                                            // console.log('167 >>> updateOrder')
                                        }
                                    } catch (error) {
                                        console.log('1407 Error: =>', error)
                                    }
                                }
                            }
                            if (newPathArray.length != 0) {
                                try {
                                    if (newPathArray[i].status == 'closed') {
                                        newPathArray[i].isActive = false;
                                        newPathArray[i].isTrade = true;
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal } }, { new: true });
                                        // console.log('1419 >>>', updateStrategy);
                                    } else {
                                        let amount = filteredOrderData.orderAmount;
                                        let filledTotal = filteredOrderData.orderFilledTotal;
                                        await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
                                        let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                } catch (error) {
                                    console.log('1427 Error: =>', error)
                                }
                            }
                            break;
                        }
                    }
                }
                count = count + 1;
                if (triangularArbitrageList.length == count) {
                    // console.log('===================================================')
                }
            }
            if (a === triangularArbitrageList.length - 1) {
                let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([triangularModel.find(query), rebalancingTradeData({ arbitrageName: "TRIANGULAR" })])
                if (checkRebalancingTrade.length != 0) {
                    // executeAllTriangularArbitrage.stop();
                    if (rebalancingACtiveCheck) {
                        if (rebalancingACtiveCheck.isRebalancingActive == true) {
                            // await triangularRebalancing()
                        }
                    }
                }
                // executeAllTriangularArbitrage.start();
            }
        }
        executeAllTriangularArbitrage.start();
        triangularAllTime = Date.now() + minutes * 60 * 1000
        // });
    } catch (error) {
        executeAllTriangularArbitrage.start();
        // logger.error(error)
        console.log('triangularArbitrage catch ===>>1458', error.message)
    }
});


///////////////////////////
//start-stop cron-job


executeTriangularArbitrage.start();
// executeTriangularArbitrage.stop();

executeAutoTriangularArbitrage.start();
// executeAutoTriangularArbitrage.stop();

executeSniperTriangularArbitrage.start();
// executeSniperTriangularArbitrage.stop();

executeAllTriangularArbitrage.start();
// executeAllTriangularArbitrage.stop();


let allCronRestart = new CronJob(config.get('cronTime.allCronReset'), async () => {
    if (triangularManualTime < Date.now()) {
        executeTriangularArbitrage.start()
    }
    if (triangularAutoTime < Date.now()) {
        executeAutoTriangularArbitrage.start()
    }
    if (triangularSniperTime < Date.now()) {
        executeSniperTriangularArbitrage.start()
    }
    if (triangularAllTime < Date.now()) {
        executeAllTriangularArbitrage.start()
    }
})
allCronRestart.start()

// let executeAllTriangularArbitrage = new CronJob(config.get('cronTime.triangularArbitrage'), async () => {
//     try {
//         executeAllTriangularArbitrage.stop();
//         let query = { status: "ACTIVE", arbitrageStatus: "PENDING", isFirstStrategy: false }
//         let triangularArbitrageList = await triangularModel.find(query);
//         let count = 0;
//         let obj
//         console.log("Total triangularArbitrage ==>All", triangularArbitrageList.length)
//         // if (triangularArbitrageList.length == 0) {
//         //     executeAllTriangularArbitrage.start()
//         // } else {
//         //     executeAllTriangularArbitrage.stop();
//         // }
//         for (let a = 0; a < triangularArbitrageList.length; a++) {
//             obj = triangularArbitrageList[a];
//             let exchange = obj.exchangeName;
//             let [connectedExchangeData, tickers] = await Promise.all([connectedExchangeModel.findOne({ _id: obj.connectedExchangeId, status: status.ACTIVE }), exchangeModel.findOne({ exchangeName: exchange })])
//             tickers = tickers.tickers
//             let quantity = obj.capital;
//             if (connectedExchangeData) {
//                 let apiKey = connectedExchangeData.apiKey;
//                 let secretKey = connectedExchangeData.secretKey;
//                 let passphrase = connectedExchangeData.passphrase;
//                 let customerId = connectedExchangeData.customerId;
//                 let api_memo = connectedExchangeData.apiMemo;
//                 let placedArbitrageId = obj._id;
//                 let finalPrice
//                 for (let i = 0; i < obj.strategy.length; i++) {
//                     let symbol = Object.keys(obj.strategy[i])[0];
//                     let action = Object.values(obj.strategy[i])[0];
//                     let price = obj.strategy[i].price;
//                     let newPathArray = new Array();
//                     if (obj.strategy[i].status == 'cancelled' || obj.strategy[i].status == 'ORDER_NOT_FOUND') {
//                         let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'CANCELLED', status: status.CANCELLED }, { new: true })
//                         if (arbitrageStatusUpdate) {
//                             let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
//                             console.log('Triangular Arbitrage Status CANCELLED ==>> ', arbitrageStatusUpdate, updateUser);
//                             let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_cancel': true })
//                             if (checkNotificationOnOff) {
//                                 let notificationObj = {
//                                     userId: obj.userId,
//                                     orderId: obj.strategy[i].orderId,
//                                     symbol: symbol,
//                                     title: `Triangular Arbitrage Trade Cancellation - Order ${obj.strategy[i].orderId}`,
//                                     body: `Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been cancelled.`
//                                 }
//                                 await notificationCreate(notificationObj)
//                             }
//                         }
//                     } else if (obj.strategy[i].status == 'closed' && (obj.strategy.length - 1) == i) {
//                         let profit = parseFloat(obj.filledTotal) - parseFloat(obj.capital)
//                         // console.log(profit,parseFloat(obj.filledTotal),parseFloat(obj.expectedProfit),parseFloat(obj.filledTotal) - parseFloat(obj.expectedProfit),55555 )
//                         let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED }, { new: true })
//                         if (arbitrageStatusUpdate) {
//                             let updateUser = await userModel.findByIdAndUpdate({ _id: obj.userId }, { $set: { 'autoTradePlaceCount.triangular': 0 } }, { new: true });
//                             console.log('Triangular Arbitrage Status Completed ==>> ', arbitrageStatusUpdate, updateUser);
//                             let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_success': true })
//                             if (checkNotificationOnOff) {
//                                 let notificationObj = {
//                                     userId: obj.userId,
//                                     orderId: obj.strategy[i].orderId,
//                                     symbol: symbol,
//                                     title: `Triangular Arbitrage Trade Successful - Order ${obj.strategy[i].orderId}`,
//                                     body: `Congratulations! Your Triangular Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${symbol} has been successfully executed!`
//                                 }
//                                 await notificationCreate(notificationObj)
//                             }
//                         }
//                     } else if (obj.strategy[i].status == 'rebalancing' && obj.strategy[i].isActive == true) {
//                         console.log("========================>>>>>")
//                         let cancelRes = await cancelOrder(exchange, symbol, obj.strategy[i].orderId, apiKey, secretKey, passphrase, customerId, api_memo, obj.strategy[i].baseCurrency, obj.strategy[i].quoteCurrency)
//                         if (cancelRes.status == true) {
//                             obj.strategy[i].isActive = false
//                             obj.strategy[i].isTrade = true
//                             let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { strategy: obj.strategy }, { new: true })
//                             console.log("rebalancing update=================>>>76", arbitrageStatusUpdate)
//                         }
//                     }
//                     else {
//                         if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == false) {
//                             console.log('Do respected act and update isActive status', i, new Date().toLocaleTimeString());
//                             let orderPlaced;
//                             let token;
//                             let current_token;
//                             let amount = obj.amount;
//                             let filledTotal = obj.filledTotal;
//                             token = [tickers[symbol]['base'], tickers[symbol]['quote']];
//                             if (action == 'buy') {
//                                 if (i == 0) {//HAI_ETH
//                                     console.log('==============================>>> If ', i, token[0] != 'USDT');
//                                     // if (token[0] != 'USDT' && exchange != 'Kucoin') { //if not endswith USDT
//                                     //     // console.log('65 ==>', exchange, token[0], 'USD');
//                                     //     quantity = quantity / tickers[token[0] + token[1]].price;
//                                     // } else if (token[0] != 'USDT' && exchange == 'Kucoin') { //if not endswith USDT
//                                     //     // console.log('65 ==>', exchange, token[0], 'USDT');
//                                     //     quantity = quantity / tickers[token[0] + token[1]].price;
//                                     // }else{
//                                     //     quantity = quantity / price;
//                                     // }

//                                     if (token[1] == obj.start) { //if not endswith USDT
//                                         // let currencyPair = get_token(exchange, token[0], token[0]);
//                                         // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
//                                         finalPrice = price;
//                                     }
//                                     else { //if not endswith USDT
//                                         // quantity = quantity / tickers[token[1] + token[0]].price;
//                                         finalPrice = 1 / price;
//                                     }

//                                     quantity = quantity / finalPrice;
//                                     current_token = token[0]
//                                 } else {
//                                     console.log('==============================>>> else ', i);
//                                     if (token[1] == Object.values(obj.strategy[i - 1])[7]) { //if not endswith USDT
//                                         // let currencyPair = get_token(exchange, token[0], token[0]);
//                                         // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
//                                         finalPrice = price;
//                                     }
//                                     else { //if not endswith USDT
//                                         // quantity = quantity / tickers[token[1] + token[0]].price;
//                                         finalPrice = 1 / price;
//                                     }

//                                     // if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
//                                     //     quantity = amount / price;
//                                     // }
//                                     // else if (symbol.endsWith(token[1]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
//                                     //     quantity = filledTotal / price;

//                                     // }

//                                     if (Object.values(obj.strategy[i - 1])[0] == 'buy') {
//                                         quantity = amount;
//                                     }
//                                     else if (Object.values(obj.strategy[i - 1])[0] == 'sell') {
//                                         quantity = filledTotal;
//                                     }
//                                     // quantity = Object.values(obj.strategy[i - 1])[6] / finalPrice
//                                     // quantity = amount / finalPrice
//                                 }
//                                 orderPlaced = await buy(exchange, symbol, tickers[symbol].symbol, price, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
//                                 console.log('Buy orderPlaced 86 ==>', orderPlaced)
//                                 if (orderPlaced) {
//                                     orderPlaced.side = 'buy'
//                                 }
//                             }
//                             else if (action == 'sell') {
//                                 if (i == 0) {//HAI_ETH
//                                     // console.log('==============================>>> If ', i, token[0] != 'USDT' && exchange != 'BitFinex', token[0] != 'USD' && exchange == 'BitFinex');
//                                     if (token[0] == obj.start) { //if not endswith USDT
//                                         // let currencyPair = get_token(exchange, token[0], token[0]);
//                                         // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
//                                         finalPrice = price;
//                                     }
//                                     else { //if not endswith USDT
//                                         // quantity = quantity / tickers[token[1] + token[0]].price;
//                                         finalPrice = 1 / price;
//                                     }
//                                     quantity = quantity;
//                                     current_token = token[0]
//                                 } else {
//                                     console.log('==============================>>> else ', i);
//                                     // if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'buy') {
//                                     //     quantity = amount;
//                                     // } else if (symbol.endsWith(token[0]) && Object.values(obj.strategy[i - 1])[0] == 'sell') {
//                                     //     quantity = filledTotal;
//                                     // }
//                                     // if (Object.values(obj.strategy[i - 1])[0] == 'buy') {
//                                     //     quantity = amount;
//                                     // } else if (Object.values(obj.strategy[i - 1])[0] == 'sell') {
//                                     //     quantity = filledTotal;
//                                     // }
//                                     if (token[0] == Object.values(obj.strategy[i - 1])[7]) { //if not endswith USDT
//                                         // let currencyPair = get_token(exchange, token[0], token[0]);
//                                         // console.log("sjdfsdjfksdjkfjsdkfsdkfj",token[1],token[0])
//                                         finalPrice = price;
//                                     }
//                                     else { //if not endswith USDT
//                                         // quantity = quantity / tickers[token[1] + token[0]].price;
//                                         finalPrice = 1 / price;
//                                     }
//                                     // quantity = Object.values(obj.strategy[i - 1])[6]
//                                     // quantity = amount;
//                                     if (Object.values(obj.strategy[i - 1])[0] == 'buy') {
//                                         quantity = amount;
//                                     } else if (Object.values(obj.strategy[i - 1])[0] == 'sell') {
//                                         quantity = filledTotal;
//                                     }
//                                 }
//                                 console.log('98 sell ==>', exchange, symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId)
//                                 orderPlaced = await sell(exchange, symbol, tickers[symbol].symbol, finalPrice, quantity, apiKey, secretKey, passphrase, customerId, api_memo);
//                                 if (orderPlaced) {
//                                     orderPlaced.side = 'sell'
//                                 }
//                             }
//                             console.log("order data =====>>>170", orderPlaced)
//                             if (orderPlaced) {
//                                 if (orderPlaced && orderPlaced.isTradable == true) {
//                                     orderPlaced.orderId = filter_orderId(exchange, orderPlaced);
//                                     if (orderPlaced.orderId) {
//                                         let order = await orderModel.findOne({ orderId: orderPlaced.orderId });
//                                         if (order) {
//                                             console.log('152==> Order already placed >>', order)
//                                         } else {
//                                             let objsave = {
//                                                 userId: obj.userId,
//                                                 symbol: symbol,
//                                                 price: price,
//                                                 quantity: quantity,
//                                                 side: orderPlaced.side,
//                                                 type: 'limit',
//                                                 orderStatus: 'open',
//                                                 orderId: orderPlaced.orderId,
//                                                 exchangeName: exchange
//                                             }
//                                             let saveOrderResult = await orderModel(objsave).save();
//                                             if (saveOrderResult) {
//                                                 let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
//                                                 for (let k = 0; k < triangularData.strategy.length; k++) {
//                                                     if (k == i) {
//                                                         triangularData.strategy[k].isActive = true;
//                                                         triangularData.strategy[k].orderId = orderPlaced.orderId;
//                                                     }
//                                                     newPathArray.push(triangularData.strategy[k])
//                                                 }
//                                                 let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal, tradeExecutionTime: Date.now(), isFirstStrategy: true } }, { new: true });
//                                                 console.log('118 updateStrategy>>>', updateStrategy.exchangeName);
//                                             }
//                                         }
//                                     }
//                                 }
//                                 else if (orderPlaced.isTradable == false) {
//                                     let arbitrageStatusUpdate = await triangularModel.findByIdAndUpdate({ _id: obj._id }, { status: status.BLOCK, arbitrageStatus: "FAILED" }, { new: true })
//                                     console.log('Arbitrage blocked ==>', arbitrageStatusUpdate)
//                                     let checkNotificationOnOff = await userModel.findOne({ _id: obj.userId, 'notifications.trade_error': true })
//                                     if (checkNotificationOnOff) {
//                                         let notificationObj = {
//                                             userId: obj.userId,
//                                             symbol: symbol,
//                                             title: `Triangular Arbitrage Trade Unsuccessful - Symbol ${symbol}`,
//                                             body: `Regrettably, your Triangular Arbitrage trade (Symbol ${symbol}) on ${exchange} has encountered a failure.`
//                                         }
//                                         await notificationCreate(notificationObj)
//                                     }
//                                 }
//                             }

//                             break;
//                         }
//                         else if (obj.strategy[i].isTrade == false && obj.strategy[i].isActive == true) {
//                             console.log(`ArbitrageStrategy No.==> ${i + 1}, Check order details/status with orderId.`, new Date().toLocaleTimeString());
//                             console.log('Request parameter ==>', exchange, apiKey, secretKey, obj.strategy[i].orderId, symbol, customerId, passphrase)
//                             let orderData = await triangularOrderDetails(exchange, apiKey, secretKey, obj.strategy[i].orderId, tickers[symbol].symbol, customerId, api_memo, passphrase);
//                             let filteredOrderData = await filter_triangularOrderDetails(exchange, orderData, tickers[symbol].symbol, tickers);
//                             console.log('OrderStatus ==>', filteredOrderData)
//                             let triangularData = await triangularModel.findOne({ _id: placedArbitrageId });
//                             if (filteredOrderData && filteredOrderData.orderStatus) {
//                                 if (filteredOrderData.orderStatus == 'cancelled') {
//                                     for (let k = 0; k < triangularData.strategy.length; k++) {
//                                         if (k == i) {
//                                             triangularData.strategy[k].isActive = false;
//                                             triangularData.strategy[k].orderId = obj.strategy[i].orderId;
//                                             triangularData.strategy[k].status = filteredOrderData.orderStatus;
//                                         }
//                                         newPathArray.push(triangularData.strategy[k])
//                                     }
//                                 }
//                                 else {
//                                     try {
//                                         for (let k = 0; k < triangularData.strategy.length; k++) {
//                                             if (k == i) {
//                                                 triangularData.strategy[k].isActive = true;
//                                                 triangularData.strategy[k].orderId = obj.strategy[i].orderId;
//                                                 triangularData.strategy[k].status = filteredOrderData.orderStatus;
//                                             }
//                                             newPathArray.push(triangularData.strategy[k])
//                                         }
//                                         if (Array.isArray(orderData) == true) {
//                                             orderData = Object.assign({}, orderData);
//                                         }
//                                         let updateOrder = await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status } }, { new: true });
//                                         if (updateOrder) {
//                                             // console.log('167 >>> updateOrder')
//                                         }
//                                     } catch (error) {
//                                         console.log('176 Error: =>', error)
//                                     }
//                                 }
//                             }
//                             if (newPathArray.length != 0) {
//                                 try {
//                                     if (newPathArray[i].status == 'closed') {
//                                         newPathArray[i].isActive = false;
//                                         newPathArray[i].isTrade = true;
//                                         let amount = filteredOrderData.orderAmount;
//                                         let filledTotal = filteredOrderData.orderFilledTotal;
//                                         let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray, amount: amount, filledTotal: filledTotal } }, { new: true });
//                                         console.log('167 >>>', updateStrategy);
//                                     } else {
//                                         let amount = filteredOrderData.orderAmount;
//                                         let filledTotal = filteredOrderData.orderFilledTotal;
//                                         await orderModel.findOneAndUpdate({ orderId: newPathArray[i].orderId }, { $set: { orderStatus: newPathArray[i].status, executedQty: amount, cummulativeQuoteQty: filledTotal } }, { new: true });
//                                         let updateStrategy = await triangularModel.findByIdAndUpdate({ _id: placedArbitrageId }, { $set: { strategy: newPathArray } }, { new: true });
//                                     }
//                                 } catch (error) {
//                                     console.log('188 Error: =>', error)
//                                 }
//                             }
//                             break;
//                         }
//                     }
//                 }
//                 count = count + 1;
//                 if (triangularArbitrageList.length == count) {
//                     // console.log('===================================================')
//                 }
//             }
//             if (a === triangularArbitrageList.length - 1) {
//                 let [checkRebalancingTrade, rebalancingACtiveCheck] = await Promise.all([triangularModel.find(query), rebalancingTradeData({ arbitrageName: "TRIANGULAR" })])
//                 if (checkRebalancingTrade.length != 0) {
//                     // executeAllTriangularArbitrage.stop();
//                     if (rebalancingACtiveCheck) {
//                         if (rebalancingACtiveCheck.isRebalancingActive == true) {
//                             await triangularRebalancing()
//                         }
//                     }
//                 }
//                 // executeAllTriangularArbitrage.start();
//             }
//         }
//         executeAllTriangularArbitrage.start();
//         // });
//     } catch (error) {
//         executeAllTriangularArbitrage.start();
//         logger.error(error)
//         console.log('triangularArbitrage catch ===>>', error.message)
//     }
// });
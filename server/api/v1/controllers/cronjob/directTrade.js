const CronJob = require('cron').CronJob;
const directModel = require('../../../../models/directarbitrage');
const connectedExchangeModel = require('../../../../models/connectedExchange');
const exchangeTokenModel = require('../../../../models/exchange');
const { buy, sell, address, withdraw, transfer, get_tx_id, check_deposit, check_depositHistory } = require('../../../../helper/buySell');
const { get_token } = require('../../../../helper/tokenpair');
const { filter_orderId } = require('../../../../helper/filter_orderId');
const { order_details } = require('../../../../helper/direct_orderDetails');
const { convert_profit } = require('../../../../helper/convert_profit');
const { filter_withdrowId } = require('../../../..//helper/filter_withdrowId');
const { filter_txId } = require('../../../../helper/filter_trasactionId');
const { filter_txIdForWithdraw } = require('../../../../helper/withdrawHistoryStatusFilter')
const userModel = require('../../../../models/user');
import config from "config";
import { walletServices } from '../../services/wallet'
const { createWithdrawHistory, withdrawHistoryFindOneAndUpdate } = walletServices
import transactionType from '../../../../enums/trasection'
import { orderServices } from '../../services/order'
const { updateOrder, createOrder, findOrder } = orderServices
import { withdrawAddressServices } from '../../services/withdrawAddress'
const { findWithdrawAddress } = withdrawAddressServices
import status from "../../../../enums/status";
import { notificationServices } from '../../services/notification';
const { notificationCreate, notificationData, notificationUpdate } = notificationServices;
import { buySubsciptionPlanHistoryServices } from "../../services/buySubscriptionPlanHistory"
const { lastedBuyPlan } = buySubsciptionPlanHistoryServices
import arbitrage from "../../../../enums/arbitrage";
import commonFunction from '../../../../helper/util';
///////////////////////////////////////////////////////////////////////////////////////////////////
let minutes = 30
let directTime = Date.now() + minutes * 60 * 1000
var Directarbitrage = new CronJob(config.get('cronTime.directArbitrage'), async function () {
    try {
        let query = { $and: [{ arbitrageStatus: "PENDING" }, { status: "ACTIVE" }] }
        let directArbitrageList = await directModel.find(query);
        let count = 0;
        let obj
        console.log("directArbitrageList.length======>", directArbitrageList.length)
        // directArbitrageList.map(async (obj) => {
        if (directArbitrageList.length == 0) {
            Directarbitrage.start();
        } else {
            Directarbitrage.stop();
        }
        for (let a = 0; a < directArbitrageList.length; a++) {
            obj = directArbitrageList[a];
            let exchange;
            let apiKey;
            let secretKey;
            let quantity;
            let passPhrase;
            let CustomerId;
            let tradePassword;
            let price;
            let symbol;
            let api_memo
            let placeddirecteId = obj._id;
            let userId = obj.userId;
            let amount;
            let add;
            let withdo;
            let newPathArray = new Array();
            let trans_id;
            var connected1 = obj.connectedExchangeId1.toString();
            var connected2 = obj.connectedExchangeId2.toString();
            for (let i = 0; i < obj.strategy.length; i++) {
                if (obj.strategy[i].exchange == "Kraken") {
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for 3 seconds
                }
                if (obj.strategy[i].action == 'buy') {
                    let tickers = (await exchangeTokenModel.findOne({ exchangeName: obj.strategy[i].exchange }))['_doc']['tickers'];
                    let connectedData = await connectedExchangeModel.findOne({ _id: connected1 })
                    exchange = obj.strategy[i].exchange;
                    apiKey = connectedData.apiKey;
                    secretKey = connectedData.secretKey;
                    api_memo = connectedData.apiMemo;
                    passPhrase = connectedData.passphrase;
                    CustomerId = connectedData.customerId;
                    tradePassword = connectedData.tradePassword;
                    quantity = obj.capital / obj.strategy[i].price;
                    price = obj.strategy[i].price;
                    symbol = await get_token(exchange, obj.base, obj.pair);
                    let placeddirecteId = obj._id;
                    var directData = await directModel.findOne({ _id: placeddirecteId });
                    if (obj.strategy[i].isTrade == false) {
                        if (obj.strategy[i].isTradeActive == true) {
                            console.log('Check buy Action', new Date().toLocaleTimeString())
                            // console.log("order details request=>", exchange, apiKey, secretKey, passPhrase, obj.strategy[i].orderId, symbol, api_memo)
                            var orderDetail = await order_details(exchange, apiKey, secretKey, passPhrase, obj.strategy[i].orderId, symbol, api_memo);
                            console.log("order details response=>", orderDetail)
                            if (orderDetail) {
                                if (orderDetail.status == true) {
                                    await updateOrder({ orderId: obj.strategy[i].orderId }, { executedQty: orderDetail.amount, cummulativeQuoteQty: orderDetail.totalAmount, orderStatus: 'closed' })
                                    for (let k = 0; k < directData.strategy.length; k++) {
                                        if (k == i) {
                                            directData.strategy[k].isTradeActive = false;
                                            directData.strategy[k].isTrade = true;
                                            directData.strategy[k].amount = orderDetail.amount;
                                            directData.strategy[k].capital0 = orderDetail.totalAmount;
                                            directData.strategy[k].buyStatus = 'closed';
                                        }
                                        newPathArray.push(directData.strategy[k]);
                                    }
                                    let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                                }
                                else if (orderDetail.status == false) {
                                    let checkNotificationOnOff = await userModel.findOne({ _id: userId, 'notifications.trade_cancel': true })
                                    if (checkNotificationOnOff) {
                                        let notificationObj = {
                                            userId: userId,
                                            orderId: obj.strategy[i].orderId,
                                            symbol: obj.base + obj.pair,
                                            title: `Direct Arbitrage Trade Cancelled - Order ${obj.strategy[i].orderId}`,
                                            body: `The Direct Arbitrage trade associated with Order ${obj.strategy[i].orderId} for ${obj.base + obj.pair} has been cancelled.`
                                        }
                                        await notificationCreate(notificationObj)
                                    }
                                    await updateOrder({ orderId: obj.strategy[i].orderId }, { orderStatus: 'cancelled' })
                                    for (let k = 0; k < directData.strategy.length; k++) {
                                        if (k == i) {
                                            directData.strategy[k].buyStatus = 'cancelled';
                                        }
                                        newPathArray.push(directData.strategy[k]);
                                    }
                                    let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray, arbitrageStatus: 'CANCELLED', status: status.CANCELLED } }, { new: true });
                                    if (updateStrategy) {
                                        var userdata = await userModel.findByIdAndUpdate({ _id: userId }, { $set: { 'autoTradePlaceCount.direct': 0 } });
                                    }
                                }
                            }
                        } else {
                            console.log('Do buy Action', new Date().toLocaleTimeString())
                            var orderPlace = await buy(exchange, symbol, symbol, price, quantity, apiKey, secretKey, passPhrase, CustomerId, api_memo);
                            if (orderPlace.isTradable == true) {
                                var filterOrder = await filter_orderId(exchange, orderPlace);
                                console.log("filter_orderId ===>", filterOrder);
                                if (filterOrder) {
                                    await updateOrder({ orderId: filterOrder }, { userId: userId, symbol: symbol, price: price, quantity: quantity, side: 'buy', type: 'limit', orderStatus: 'open', exchangeName: exchange })
                                    for (let k = 0; k < directData.strategy.length; k++) {
                                        if (k == i) {
                                            directData.strategy[k].isTradeActive = true;
                                            directData.strategy[k].orderId = filterOrder;
                                            directData.strategy[k].buyStatus = 'open';
                                        }
                                        newPathArray.push(directData.strategy[k]);
                                    }
                                    let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                                }
                            }
                            else if (orderPlace.isTradable == false) {
                                let checkNotificationOnOff = await userModel.findOne({ _id: userId, 'notifications.trade_error': true })
                                if (checkNotificationOnOff) {
                                    let notificationObj = {
                                        userId: userId,
                                        symbol: symbol,
                                        title: `Direct Arbitrage Trade Failed - Symbol ${symbol}`,
                                        body: `Your Direct Arbitrage trade (Symbol ${symbol}) has unfortunately failed on ${exchange}.`
                                    }
                                    await notificationCreate(notificationObj)
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: "BLOCK", arbitrageStatus: 'FAILED' } }, { new: true });
                            }
                        }
                    }
                    else if (obj.strategy[i + 1].isAddress == true && obj.strategy[i].exchange == 'Kucoin' && obj.strategy[i].isTransfer == false) {
                        {
                            console.log("do tranfer after buy kucoin");
                            var transferData = await transfer(exchange, obj.base, obj.strategy[i].amount, 'trade', 'main', apiKey, secretKey, passPhrase, CustomerId);
                            console.log("transfer detail", transferData);
                            if (transferData.status == true) {
                                console.log('Transfer Details >>>', transferData)
                                for (let k = 0; k < directData.strategy.length; k++) {
                                    if (k == i) {
                                        directData.strategy[k].isTransfer = true;
                                        directData.strategy[k].TransferId = transferData;
                                    }
                                    newPathArray.push(directData.strategy[k]);
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                        }
                    }
                    else if (obj.strategy[i + 1].isAddress == true && obj.strategy[i].exchange == 'Okex' && obj.strategy[i].isTransfer == false) {
                        {
                            console.log("do tranfer after buy okex");
                            var transferData = await transfer(exchange, obj.base, obj.strategy[i].amount, '18', '6', apiKey, secretKey, passPhrase, CustomerId);
                            console.log("transfer detail", transferData);
                            if (transferData.status == true) {
                                console.log('Transfer Details >>>', transferData)
                                for (let k = 0; k < directData.strategy.length; k++) {
                                    if (k == i) {
                                        directData.strategy[k].isTransfer = true;
                                        directData.strategy[k].TransferId = transferData;
                                    }
                                    newPathArray.push(directData.strategy[k]);
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                        }
                    }
                    else if (obj.strategy[i + 1].isAddress == true && obj.strategy[i].isWithdraw == false) {
                        {
                            if (obj.strategy[i].isWithdrawActive == true) {
                                console.log('Check Withdraw')
                                let start = Math.floor(Date.now() / 1000)
                                // console.log("withdraw history request======>", obj.strategy[i].exchange, apiKey, secretKey, passPhrase, start, obj.base, CustomerId, api_memo)
                                var trasaction = await get_tx_id(obj.strategy[i].exchange, apiKey, secretKey, passPhrase, start, obj.base, CustomerId, api_memo);
                                console.log("withdraw history responce", trasaction);
                                if (trasaction) {
                                    var txId = await filter_txId(exchange, trasaction, obj.strategy[i].withdrawId)
                                    // console.log(txId);
                                    if (txId) {
                                        var withdrawHistoryRes = filter_txIdForWithdraw(exchange, trasaction, obj.strategy[i].withdrawId)
                                        if (withdrawHistoryRes) {
                                            let objsave = {
                                                exchangeName: exchange,
                                                userId: userId,
                                                type: transactionType.WITHDRAW,
                                                address: withdrawHistoryRes.address,
                                                amount: withdrawHistoryRes.amount,
                                                coin: obj.base,
                                                withdrawId: obj.strategy[i].withdrawId,
                                                withdrawStatus: withdrawHistoryRes.withdrawStatus,
                                                transactionFee: withdrawHistoryRes.transactionFee
                                            }
                                            await withdrawHistoryFindOneAndUpdate({ withdrawId: obj.strategy[i].withdrawId }, objsave)
                                        }
                                        for (let k = 0; k < directData.strategy.length; k++) {
                                            if (k == i) {
                                                directData.strategy[k].isWithdrawActive = false;
                                                directData.strategy[k].isWithdraw = true;
                                                directData.strategy[k].TransactionId = txId;
                                                directData.strategy[k].withdrawStatus = 'closed';
                                            }
                                            newPathArray.push(directData.strategy[k]);
                                        }
                                        let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                }

                            } else {
                                console.log('Do Withdraw');
                                let coinKey
                                if (obj.strategy[i].exchange == 'Kraken') {
                                    if (obj.strategy[i + 1].exchange == 'Binance') {
                                        coinKey = obj.base + '_Binance'
                                    } else if (obj.strategy[i + 1].exchange == 'Coinbase') {
                                        coinKey = obj.base + '_Coinbase'
                                    } else if (obj.strategy[i + 1].exchange == 'Mexc') {
                                        coinKey = obj.base + '_Mexc'
                                    } else if (obj.strategy[i + 1].exchange == 'Bitmart') {
                                        coinKey = obj.base + '_Bitmart'
                                    } else if (obj.strategy[i + 1].exchange == 'Gateio') {
                                        coinKey = obj.base + '_Gateio'
                                    } else if (obj.strategy[i + 1].exchange == 'HitBTC') {
                                        coinKey = obj.base + '_HitBTC'
                                    }
                                }
                                var withdrow = await withdraw(obj.strategy[i].exchange, obj.base, obj.strategy[i].amount, obj.strategy[i + 1].address, apiKey, secretKey, passPhrase, CustomerId, api_memo, obj.strategy[i + 1].network, coinKey);
                                console.log("withdraw ==================================>", withdrow)
                                if (withdrow && withdrow.iswithdrawable == true) {
                                    var withdrowNumber = await filter_withdrowId(exchange, withdrow);
                                    console.log("withdrowNumber=======>>>>208", withdrowNumber);
                                    if (withdrowNumber) {
                                        var directData = await directModel.findOne({ _id: placeddirecteId });
                                        for (let k = 0; k < directData.strategy.length; k++) {
                                            if (k == i) {
                                                directData.strategy[k].isWithdrawActive = true;
                                                directData.strategy[k].withdrawId = withdrowNumber;
                                                directData.strategy[k].withdrawStatus = 'open';
                                            }
                                            newPathArray.push(directData.strategy[k]);
                                        }
                                        let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                                    }
                                }
                                else if (withdrow && withdrow.iswithdrawable == false) {
                                    let checkNotificationOnOff = await userModel.findOne({ _id: userId, 'notifications.trade_error': true })
                                    if (checkNotificationOnOff) {
                                        let notificationObj = {
                                            userId: userId,
                                            symbol: obj.base,
                                            title: `Direct Arbitrage Withdraw Failed - Symbol ${obj.base}`,
                                            body: `Regrettably, your Direct Arbitrage withdrawal (Symbol ${obj.base}) has encountered an unfortunate failure on ${obj.strategy[i].exchange}.`
                                        }
                                        await notificationCreate(notificationObj)
                                    }
                                    let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: 'BLOCK', arbitrageStatus: 'FAILED' } }, { new: true });
                                }
                            }
                        }
                    }
                } else if (obj.strategy[i].action == 'sell') {
                    let tickers = (await exchangeTokenModel.findOne({ exchangeName: obj.strategy[i].exchange }))['_doc']['tickers'];
                    let connectedData = await connectedExchangeModel.findOne({ _id: connected2 })
                    exchange = obj.strategy[i].exchange;
                    apiKey = connectedData.apiKey;
                    secretKey = connectedData.secretKey;
                    api_memo = connectedData.apiMemo;
                    CustomerId = connectedData.customerId;
                    passPhrase = connectedData.passphrase;
                    tradePassword = connectedData.tradePassword;
                    quantity = obj.capital / obj.strategy[i].price;
                    price = obj.strategy[i].price;
                    var addressNumber = obj.strategy[i].address;
                    symbol = await get_token(exchange, obj.base, obj.pair);
                    let profit;
                    let placeddirecteId = obj._id;
                    var directData = await directModel.findOne({ _id: placeddirecteId });
                    if (obj.strategy[i - 1].isTrade == true && obj.strategy[i].isAddress == false) {
                        console.log('Do Address generate Action');
                        if (exchange == 'Coinbase') {
                            let withdressAddressFind = await findWithdrawAddress({ exchangeName: exchange, userId: userId })
                            for (let i = 0; i < withdressAddressFind.address.length; i++) {
                                if (withdressAddressFind.address[i].coinName == obj.base) {
                                    addressNumber = {
                                        status: true,
                                        address: withdressAddressFind.address[i].address,
                                        network: withdressAddressFind.address[i].network
                                    }
                                }
                            }
                        } else {
                            addressNumber = await address(exchange, obj.base, apiKey, secretKey, passPhrase, CustomerId, api_memo);
                        }
                        console.log("deposit direct ==>>258", addressNumber);
                        if (addressNumber.status == true) {
                            if (addressNumber) {
                                for (let k = 0; k < directData.strategy.length; k++) {
                                    if (k == i) {
                                        directData.strategy[k].isAddress = true;
                                        directData.strategy[k].address = addressNumber.address;
                                        directData.strategy[k].network = addressNumber.network;
                                    }
                                    newPathArray.push(directData.strategy[k]);
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                        }
                        else if (addressNumber.status == false) {
                            let checkNotificationOnOff = await userModel.findOne({ _id: userId, 'notifications.trade_error': true })
                            if (checkNotificationOnOff) {
                                let notificationObj = {
                                    userId: userId,
                                    symbol: obj.base,
                                    title: `Deposit address generation for Symbol ${obj.base} has unfortunately failed.`,
                                    body: `Your deposit address generation for Symbol ${obj.base} has unfortunately failed on ${exchange}.`
                                }
                                await notificationCreate(notificationObj)
                            }
                            let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: "BLOCK", arbitrageStatus: 'FAILED' } }, { new: true });
                        }
                    } else if (obj.strategy[i - 1].isWithdraw == true && obj.strategy[i].isDeposit == false) {
                        {
                            console.log('Do Deposit');
                            var deposits = await check_deposit(directData.strategy[i].exchange, obj.strategy[i - 1].TransactionId, apiKey, secretKey, passPhrase, CustomerId, obj.base, api_memo);
                            console.log("deposit ======>", deposits);
                            if (deposits.status == true) {
                                let depositHistory = await check_depositHistory(directData.strategy[i].exchange, obj.strategy[i - 1].TransactionId, apiKey, secretKey, passPhrase, CustomerId, obj.base, api_memo)
                                if (depositHistory) {
                                    let objsave = {
                                        exchangeName: directData.strategy[i].exchange,
                                        userId: userId,
                                        type: transactionType.DEPOSITE,
                                        address: depositHistory.address,
                                        amount: depositHistory.amount,
                                        coin: obj.base,
                                        withdrawStatus: depositHistory.withdrawStatus,
                                    }
                                    await withdrawHistoryFindOneAndUpdate({ userId: userId, exchangeName: directData.strategy[i].exchange, type: transactionType.DEPOSITE, address: depositHistory.address, amount: depositHistory.amount }, objsave)
                                }
                                for (let k = 0; k < directData.strategy.length; k++) {
                                    if (k == i) {
                                        directData.strategy[k].isDeposit = true;
                                        directData.strategy[k].newAmount = deposits.amount;
                                        directData.strategy[k].depositStatus = 'closed'
                                    }
                                    newPathArray.push(directData.strategy[k]);
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                            else if (deposits.status == false) {
                                let checkNotificationOnOff = await userModel.findOne({ _id: userId, 'notifications.trade_error': true })
                                if (checkNotificationOnOff) {
                                    let notificationObj = {
                                        userId: userId,
                                        symbol: obj.base,
                                        title: `Deposit for Symbol ${obj.base} has unfortunately failed.`,
                                        body: `Your deposit (Symbol ${obj.base}) has unfortunately failed on ${exchange}.`
                                    }
                                    await notificationCreate(notificationObj)
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: "BLOCK", arbitrageStatus: 'FAILED' } }, { new: true });
                            }
                        }
                    } else if (obj.strategy[i].isDeposit == true && obj.strategy[i].exchange == 'Kucoin' && obj.strategy[i].isTransfer == false) {
                        {
                            console.log('Do Transfer');
                            var transferData = await transfer(exchange, obj.base, obj.strategy[i].newAmount, 'main', 'trade', apiKey, secretKey, passPhrase, CustomerId);
                            if (transferData.status == true) {
                                for (let k = 0; k < directData.strategy.length; k++) {
                                    if (k == i) {
                                        directData.strategy[k].isTransfer = true;
                                        directData.strategy[k].TransferId = transferData;
                                    }
                                    newPathArray.push(directData.strategy[k]);
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                        }
                    } else if (obj.strategy[i].isDeposit == true && obj.strategy[i].exchange == 'Okex' && obj.strategy[i].isTransfer == false) {
                        {
                            console.log("do tranfer");
                            var transferData = await transfer(exchange, obj.base, obj.strategy[i].newAmount, '6', '18', apiKey, secretKey, passPhrase, CustomerId);
                            console.log("transfer detail", transferData);
                            if (transferData.status == true) {
                                console.log('Transfer Details >>>', transferData)
                                for (let k = 0; k < directData.strategy.length; k++) {
                                    if (k == i) {
                                        directData.strategy[k].isTransfer = true;
                                        directData.strategy[k].TransferId = transferData;
                                    }
                                    newPathArray.push(directData.strategy[k]);
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                            }
                        }
                    } else if (obj.strategy[i].isDeposit == true && obj.strategy[i].isTrade == false) {
                        if (obj.strategy[i].isTradeActive == true) {
                            // console.log('Check Sell', exchange, apiKey, secretKey, passPhrase, obj.strategy[i].orderId, symbol, api_memo);
                            var orderDetail = await order_details(exchange, apiKey, secretKey, passPhrase, obj.strategy[i].orderId, symbol, api_memo);
                            if (orderDetail && orderDetail.status == true) {
                                await updateOrder({ orderId: obj.strategy[i].orderId }, { executedQty: orderDetail.amount, cummulativeQuoteQty: orderDetail.totalAmount, orderStatus: 'closed' })
                                for (let k = 0; k < directData.strategy.length; k++) {
                                    if (k == i) {
                                        directData.strategy[k].isTradeActive = false;
                                        directData.strategy[k].isTrade = true;
                                        directData.strategy[k].sellStatus = 'closed';
                                        directData.strategy[k].newAmount = orderDetail.amount;
                                        directData.strategy[k].capital1 = orderDetail.totalAmount;
                                    }
                                    // var amount1 = parseFloat(directData.strategy[i - 1].capital0);
                                    var amount1 = parseFloat(directData.capital)
                                    var amount2 = parseFloat(directData.strategy[i].capital1);
                                    profit = amount2 - amount1;
                                    newPathArray.push(directData.strategy[k]);
                                }
                                if (directData.pair != 'USDT') {
                                    var convertProfit = await convert_profit(exchange, tickers, [directData.pair], profit);
                                    console.log("==================382==========>>>>", convertProfit)
                                    profit = convertProfit;
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray, arbitrageStatus: 'COMPLETED', profit: profit, status: status.COMPLETED } }, { new: true });
                                if (updateStrategy) {
                                    let checkNotificationOnOff = await userModel.findOne({ _id: userId, 'notifications.trade_success': true })
                                    if (checkNotificationOnOff) {
                                        let notificationObj = {
                                            userId: userId,
                                            orderId: obj.strategy[i].orderId,
                                            symbol: obj.base + obj.pair,
                                            title: `Direct Arbitrage Trade Executed Successfully - Order ${obj.strategy[i].orderId}.`,
                                            body: `Congratulations! Your Direct Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${obj.base} and ${obj.pair} has been successfully executed!`
                                        }
                                        await notificationCreate(notificationObj)
                                    }
                                    // var userdata = await userModel.findByIdAndUpdate({ _id: userId._id }, { $set: { 'autoTradePlaceCount.direct': 0 } });
                                    var userdata = await userModel.findByIdAndUpdate({ _id: userId }, { $set: { 'autoTradePlaceCount.direct': 0 }, $inc: { planProfit: -Number(profit) } });
                                    await commonFunction.sendEmailCloseTrade(userdata.email, "User", "Direct Arbitrage", obj.base + obj.pair, obj.capital, profit)
                                }
                            }
                            else if (orderDetail && orderDetail.status == false) {
                                let checkNotificationOnOff = await userModel.findOne({ _id: userId, 'notifications.trade_cancel': true })
                                if (checkNotificationOnOff) {
                                    let notificationObj = {
                                        userId: userId,
                                        orderId: obj.strategy[i].orderId,
                                        symbol: obj.base + obj.pair,
                                        title: `Direct Arbitrage Trade Cancellation - Order ${obj.strategy[i].orderId}.`,
                                        body: `The Direct Arbitrage trade (Order ${obj.strategy[i].orderId}) for ${obj.base + obj.pair} has been cancelled.`
                                    }
                                    await notificationCreate(notificationObj)
                                }
                                await updateOrder({ orderId: obj.strategy[i].orderId }, { orderStatus: 'cancel' })
                                for (let k = 0; k < directData.strategy.length; k++) {
                                    if (k == i) {
                                        directData.strategy[k].sellStatus = 'cancel';
                                    }
                                    newPathArray.push(directData.strategy[k]);
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray, arbitrageStatus: 'CANCELLED', status: status.CANCELLED } }, { new: true });
                                if (updateStrategy) {
                                    var userdata = await userModel.findByIdAndUpdate({ _id: userId }, { $set: { 'autoTradePlaceCount.direct': 0 } });
                                }
                            }
                        }
                        else {
                            console.log("do sell");
                            var orderPlace = await sell(exchange, symbol, symbol, price, obj.strategy[i].newAmount, apiKey, secretKey, passPhrase, CustomerId, api_memo);
                            console.log("sell order responce", orderPlace);
                            if (orderPlace.isTradable == true) {
                                var filterOrder = await filter_orderId(exchange, orderPlace);
                                if (filterOrder) {
                                    await updateOrder({ orderId: filterOrder }, { userId: userId, symbol: symbol, price: price, quantity: obj.strategy[i].newAmount, side: 'sell', type: 'limit', orderStatus: 'open', exchangeName: exchange })
                                    for (let k = 0; k < directData.strategy.length; k++) {
                                        if (k == i) {
                                            directData.strategy[k].isTradeActive = true;
                                            directData.strategy[k].orderId = filterOrder;
                                            directData.strategy[k].sellStatus = 'open';
                                        }
                                        newPathArray.push(directData.strategy[k]);
                                    }
                                    let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { strategy: newPathArray } }, { new: true });
                                }
                            }
                            else if (orderPlace.isTradable == false) {
                                let checkNotificationOnOff = await userModel.findOne({ _id: userId, 'notifications.trade_error': true })
                                if (checkNotificationOnOff) {
                                    let notificationObj = {
                                        userId: userId,
                                        symbol: symbol,
                                        title: `Direct Arbitrage Trade Unsuccessful - Symbol ${symbol}`,
                                        body: `Regrettably, your Direct Arbitrage trade (Symbol ${symbol}) encountered an unfortunate failure on ${exchange}.`
                                    }
                                    await notificationCreate(notificationObj)
                                }
                                let updateStrategy = await directModel.findByIdAndUpdate({ _id: placeddirecteId }, { $set: { status: "BLOCK", arbitrageStatus: 'FAILED' } }, { new: true });
                            }
                        }
                    }
                }
            }
            console.log('---------------------------------------------------', new Date().toLocaleTimeString())
            if (a === directArbitrageList.length - 1) {
                Directarbitrage.start();
            }
        }
        // });
        directTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        Directarbitrage.start();
        console.log('437 Some went wrong >>', error.message);
    }
});
// start-stop cron-job
// Directarbitrage.stop();
Directarbitrage.start();

let allCronRestart = new CronJob(config.get('cronTime.allCronReset'), async () => {
    if (directTime < Date.now()) {
        Directarbitrage.start()
    }
})
allCronRestart.start()
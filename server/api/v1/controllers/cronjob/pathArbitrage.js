const CronJob = require('cron').CronJob;
import { walletServices } from '../../services/wallet';
import arbitragefunction from '../../../../helper/arbitrage';
import { profitPathServices } from '../../services/profitpath';
import { triangularProfitPaths } from '../../../../helper/triangularProfitPaths';
import { singleExchangeTwoPairProfitPath } from '../../../../helper/singleExchangeTwoPairprofitPath'
import config from "config";
import arbitrage from "../../../../enums/arbitrage";
import { capitalAmountServices } from '../../services/capitalAmount'

const { findCapitalAmount } = capitalAmountServices
const { exchangeList, exchangeData, connectedExchangeData, connectedExchangeUpdate, connectedExchangeCreate } = walletServices;
const { profitpathCreate, profitpatheList, profitpathData, profitpathUpdate, createUpdateProfitPath } = profitPathServices;
import { profitPathHistoryServices } from '../../services/profitPathHistory'
const { insertManyProfitPathHistory } = profitPathHistoryServices
import { pairsServices } from '../../services/pairs'
import status from '../../../../enums/status';
const { findPairs } = pairsServices
let minutes = 2
let triangularTime = Date.now() + minutes * 60 * 1000
let intraTime = Date.now() + minutes * 60 * 1000
let directTime = Date.now() + minutes * 60 * 1000
// function getCapital(exchange, tickers, coin, amount) {
//     let temp;
//     switch (exchange) {
//         case 'Binance':
//             if (tickers[coin + 'USDT']) {
//                 return amount / tickers[coin + 'USDT'].price;
//             } else if (tickers[coin + 'BTC']) {
//                 temp = amount / tickers['BTCUSDT'].price
//                 return tickers[coin + 'BTC'].price / temp;
//             }
//             break;
//         case 'Kucoin':
//             if (tickers[coin + '-USDT']) {
//                 return amount / tickers[coin + '-USDT'].price;
//             } else if (tickers[coin + '-BTC']) {
//                 temp = amount / tickers['BTC-USDT'].price
//                 return tickers[coin + '-BTC'].price / temp;
//             }
//             break;
//         case 'BitFinex':
//             if (tickers[coin + 'USD']) {
//                 return amount / tickers[coin + 'USD'].price;
//             } else if (tickers[coin + 'BTC']) {
//                 temp = amount / tickers['BTCUSD'].price
//                 return tickers[coin + 'BTC'].price / temp;
//             }
//             break;
//         case 'Huobi':
//             if (tickers[coin + 'USDT']) {
//                 return amount / tickers[coin + 'USDT'].price;
//             } else if (tickers[coin + 'BTC']) {
//                 temp = amount / tickers['BTCUSDT'].price
//                 return tickers[coin + 'BTC'].price / temp;
//             }
//             break;
//         case 'Okex':
//             if (tickers[coin + '-USDT']) {
//                 return amount / tickers[coin + '-USDT'].price;
//             } else if (tickers[coin + '-BTC']) {
//                 temp = amount / tickers['BTC-USDT'].price
//                 return tickers[coin + '-BTC'].price / temp;
//             }
//             break;
//         case 'Cexio':
//             if (tickers[coin + ':USD']) {
//                 return amount / tickers[coin + ':USD'].price;
//             } else if (tickers[coin + ':BTC']) {
//                 temp = amount / tickers['BTC:USD'].price
//                 return tickers[coin + ':BTC'].price / temp;
//             }
//             break;
//         case 'Coinbase':
//             if (tickers[coin + '_USDT']) {
//                 return amount / tickers[coin + '_USDT'].price;
//             } else if (tickers[coin + '_BTC']) {
//                 temp = amount / tickers['BTC_USDT'].price
//                 return tickers[coin + '_BTC'].price / temp;
//             }
//             break;
//         case 'Gemini':
//             if (tickers[coin + 'USD']) {
//                 return amount / tickers[coin + 'USD'].price;
//             } else if (tickers[coin + 'BTC']) {
//                 temp = amount / tickers['BTCUSD'].price
//                 return tickers[coin + 'BTC'].price / temp;
//             }
//             break;
//         case 'Ftxus':
//             if (tickers[coin + '/USDT']) {
//                 return amount / tickers[coin + '/USDT'].price;
//             } else if (tickers[coin + '/BTC']) {
//                 temp = amount / tickers['BTC/USDT'].price
//                 return tickers[coin + '/BTC'].price / temp;
//             }
//             break;
//         case 'Kraken':
//             if (tickers[coin + '/USD']) {
//                 return amount / tickers[coin + '/USD'].price;
//             } else if (tickers[coin + '/BTC']) {
//                 temp = amount / tickers['BTC/USD'].price
//                 return tickers[coin + '/BTC'].price / temp;
//             }
//             break;
//     }
// }
// async function tradeFee(t1, amount, symbol, data) {
//     let fee;
//     switch (t1) {
//         case "Kraken": {
//             switch (true) {
//                 case (x < 50000):
//                     fee = 0.26;
//                     break;
//                 case (x < 100000):
//                     fee = 0.24;
//                     break;
//                 case (x < 250000):
//                     fee = 0.22;
//                     break;
//                 case (x < 500000):
//                     fee = 0.20;
//                     break;
//                 case (x < 1000000):
//                     fee = 0.18;
//                     break;
//                 case (x < 2500000):
//                     fee = 0.16;
//                     break;
//                 case (x < 5000000):
//                     fee = 0.14;
//                     break;
//                 case (x < 10000000):
//                     fee = 0.12;
//                     break;
//                 case (x > 10000000):
//                     fee = 0.10;
//                     break;
//                 default:
//                     fee = 0.0;
//                     break;
//             }
//             return fee;
//             break;
//         };
//         case "FTX-US": {
//             switch (true) {
//                 case (x == 0):
//                     fee = 0.070;
//                 case (x > 2000000):
//                     fee = 0.060;
//                     break;
//                 case (x > 5000000):
//                     fee = 0.055;
//                     break;
//                 case (x > 10000000):
//                     fee = 0.050;
//                     break;
//                 case (x > 25000000):
//                     fee = 0.045;
//                     break;
//                 case (x > 50000000):
//                     fee = 0.040;
//                     break;
//                 default:
//                     fee = 0.0;
//                     break;
//             }
//             return fee;
//             break;
//         }
//         default:
//             return parseFloat(data.tradeFee[symbol].tradefee)
//     }


// }

// function getPrecision(data, coin) {
//     let minPrecision;
//     if (data.t1 != "BitFinex" && data.t1 != "Okex") {
//         minPrecision = data.data1.tradeFee[data.symbol1].minPrecision
//     } else if (data.t1 == 'Okex') {
//         switch (coin) {
//             case 'BTC':
//                 minPrecision = 8
//                 break;
//             case 'SHIB':
//                 minPrecision = 0
//                 break;
//             case 'ETH':
//                 minPrecision = 6
//                 break;
//             case 'SOL':
//                 minPrecision = 6
//                 break;
//         }
//     }
//     // console.log(minPrecision, data.t1, data.t2, 173)
//     if (data.t2 != "BitFinex" && data.t2 != "Okex") {
//         if (typeof minPrecision === 'undefined') {
//             minPrecision = 16
//         }
//         if (minPrecision > data.data2.tradeFee[data.symbol2].minPrecision)
//             minPrecision = data.data2.tradeFee[data.symbol2].minPrecision
//     } else if (data.t1 == 'Okex') {
//         switch (coin) {
//             case 'BTC':
//                 if (minPrecision > 8)
//                     minPrecision = 8
//                 break;
//             case 'SHIB':
//                 if (minPrecision > 0)
//                     minPrecision = 0
//                 break;
//             case 'ETH':
//                 if (minPrecision > 6)
//                     minPrecision = 6
//                 break;
//             case 'SOL':
//                 if (minPrecision > 6)
//                     minPrecision = 6
//                 break;
//         }
//     }
//     // console.log(minPrecision, data.t1, data.t2, 191)

//     return minPrecision
// }
// const decimalCount = num => {
//     // Convert to String
//     const numStr = String(num);
//     // String Contains Decimal
//     if (numStr.includes('.')) {
//         return numStr.split('.')[1].length;
//     };
//     // String Does Not Contain Decimal
//     return 0;
// }
//--------------------------------------------------Direct Arbitrage Path Store-----------------------------------------------------------------------------//
var getDirect = new CronJob(config.get('cronTime.profitPaths'), async function () {
    try {
        var array = [
            'Binance-Kraken',
            'Binance-Mexc',
            'Binance-Bitmart',
            'Binance-Gateio',
            'Kraken-Binance',
            'Kraken-Mexc',
            'Kraken-Bitmart',
            'Kraken-Gateio',
            'Mexc-Binance',
            'Mexc-Kraken',
            'Mexc-Bitmart',
            'Mexc-Gateio',
            'Bitmart-Binance',
            'Bitmart-Kraken',
            'Bitmart-Mexc',
            'Bitmart-Gateio',
            'Gateio-Binance',
            'Gateio-Kraken',
            'Gateio-Mexc',
            'Gateio-Bitmart',
        ];
        // let allExchangeName=await exchangeList({status: "ACTIVE"})
        // let array = [];
        // for (let i = 0; i < allExchangeName.length; i++) {
        //     for (let j = 0; j < allExchangeName.length; j++) {
        //         if (i !== j) {
        //             array.push(`${allExchangeName[i].exchangeName}-${allExchangeName[j].exchangeName}`);
        //         }
        //     }
        // }
        let capitalAmountRes = await findCapitalAmount({})
        let amountRes
        if (!capitalAmountRes) {
            amountRes = 1000
        } else {
            amountRes = capitalAmountRes.direct
        }
        getDirect.stop();
        var totalpath = new Array();
        let deletePairs = []
        for (let token of array) {
            var t1 = token.split('-')[0];
            var t2 = token.split('-')[1];
            let [exchange1, exchange2, delisted] = await Promise.all([exchangeData({ exchangeName: t1, status: "ACTIVE" }), exchangeData({ exchangeName: t2, status: "ACTIVE" }), findPairs({ status: status.ACTIVE })])
            // console.log(t1, t2, '--- t1, t2 \n', 'exchange1')
            if (delisted) {
                deletePairs = delisted.pairs
            }
            t1 = exchange1.exchangeName;
            t2 = exchange2.exchangeName;
            let startToken = ['USDT', 'BTC', 'ETH'];
            let capital = Number(amountRes);
            var exchange = new Array();
            exchange.push(t1, t2);
            var all_withdrawfee = new Array();
            var withdaw = {};
            withdaw[t1] = exchange1.withdrawFee;
            withdaw[t2] = exchange2.withdrawFee;
            all_withdrawfee.push(withdaw);
            // console.log(all_withdrawfee);
            var all_tickers = new Array();
            let tickers1 = exchange1.tickers;
            let tickers2 = exchange2.tickers;
            var tokens = {};
            tokens[t1] = tickers1;
            tokens[t2] = tickers2;
            all_tickers.push(tokens);
            var all_tradefee = new Array();
            var trade = {};
            trade[t1] = exchange1.tradeFee;
            trade[t2] = exchange2.tradeFee;
            all_tradefee.push(trade);
            if (t1 && t2) {
                var [token1, token2] = await Promise.all([arbitragefunction.get_available_tokens_update(t1, startToken, all_tickers), arbitragefunction.get_available_tokens_update(t2, startToken, all_tickers)])
            }
            // console.log('token1:', token1, '\ntoken2:', token2)
            var check = Object.assign(token1, token2);
            // console.log(token1,token2, 297)
            var check = await arbitragefunction.filter_tokens(check, startToken);
            // console.log(check, 297)
            if (t1 && t2) {
                var [top1, top2] = await Promise.all([arbitragefunction.after_filter(t1, check, exchange1.tickers), arbitragefunction.after_filter(t2, check, exchange2.tickers)])
            }

            var check1 = Object.assign(top1, top2);
            var result = await arbitragefunction.cal_arbitrage_paths_direct(check1, startToken, capital, all_withdrawfee, all_tickers, all_tradefee);
            totalpath.push(result);
        }
        // console.log(totalpath);
        totalpath = totalpath.flat();
        // console.log(totalpath.length);
        var coinremove = ['BNB', 'XRP', 'LUNA', 'TFUEL', 'XLM', 'IOST', 'KAVA', 'XEM', 'HBAR', 'MDX'];
        if (deletePairs.length != 0) {
            coinremove = [...new Set(coinremove.concat(deletePairs))];
        }
        for (let base of coinremove) {
            var totalpath = totalpath.filter(item => item.base !== base);
        }
        for (let total of totalpath) {
            // if (total.buy == 'Okex' || total.sell == 'Okex') {
            //     totalpath = totalpath.filter(item => item.base !== 'DOGE');
            // }
            if (total.buy == 'Binance' || total.sell == 'Binance') {
                totalpath = totalpath.filter(item => item.base !== 'KSM', item => item.base !== 'FIL');
            }
            // if (total.buy == 'Bitfinex' || total.sell == 'Bitfinex') {
            //     totalpath = totalpath.filter(item => item.base !== 'FTT');
            // }
        }
        totalpath.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
        // let history = totalpath.map(function (el) {
        //     var o = Object.assign({}, el);
        //     o.arbitrageName = arbitrage.DirectArbitrage
        //     return o;
        // });
        // await insertManyProfitPathHistory(history)
        var obj = {
            arbitrageName: arbitrage.DirectArbitrage,
            path: totalpath
        }
        let updateData = await createUpdateProfitPath({ status: 'ACTIVE', arbitrageName: arbitrage.DirectArbitrage }, obj)
        directTime = Date.now() + minutes * 60 * 1000
        console.log(arbitrage.DirectArbitrage, '========>>>Update', totalpath.length)
        // var orderchech = await profitpathData({ status: 'ACTIVE', arbitrageName: arbitrage.DirectArbitrage });
        // if (!orderchech) {
        //     var obj = {
        //         arbitrageName: arbitrage.DirectArbitrage,
        //         path: totalpath
        //     }
        //     var orderchech = await profitpathCreate(obj);
        //     console.log(arbitrage.DirectArbitrage, '========>>>Save');
        // }
        // else {
        //     orderchech = await profitpathUpdate({ _id: orderchech._id }, { $set: { path: totalpath } }, { new: true });
        //     console.log(arbitrage.DirectArbitrage, '========>>>Update', totalpath.length);
        // }
        getDirect.start();
    } catch (e) {
        console.log("146 ==>", e);
        getDirect.start();
    }
});

var getIntra = new CronJob(config.get('cronTime.profitPaths'), async function () {
    try {
        var array = [
            'Binance-Huobi',
            'Binance-Coinbase',
            'Huobi-Binance',
            'Huobi-Coinbase',
            'Coinbase-Binance',
            'Coinbase-Huobi',
        ];
        let capitalAmountRes = await findCapitalAmount({})
        let amountRes
        if (!capitalAmountRes) {
            amountRes = 1000
        } else {
            amountRes = capitalAmountRes.loop
        }
        getIntra.stop();
        var totalpath = new Array();
        for (let token of array) {
            var t1 = token.split('-')[0];
            var t2 = token.split('-')[1];
            let exchange1 = await exchangeData({ exchangeName: t1, status: "ACTIVE" });
            let exchange2 = await exchangeData({ exchangeName: t2, status: "ACTIVE" });
            // console.log(t1, t2, '--- t1, t2 \n', 'exchange1')
            t1 = exchange1.exchangeName;
            t2 = exchange2.exchangeName;
            let startToken = ['USDT', 'BTC', 'ETH'];
            let capital = Number(amountRes);
            var exchange = new Array();
            exchange.push(t1, t2);
            var all_tickers = new Array();
            let tickers1 = exchange1.tickers;
            let tickers2 = exchange2.tickers;
            var tokens = {};
            tokens[t1] = tickers1;
            tokens[t2] = tickers2;
            all_tickers.push(tokens);
            var all_tradefee = new Array();
            var trade = {};
            trade[t1] = exchange1.tradeFee;
            trade[t2] = exchange2.tradeFee;
            all_tradefee.push(trade);
            if (t1) {
                var token1 = await arbitragefunction.get_available_tokens_update(t1, startToken, all_tickers);
            }
            if (t2) {
                var token2 = await arbitragefunction.get_available_tokens_update(t2, startToken, all_tickers);
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
            var result = await arbitragefunction.cal_arbitrage_paths_intra(check1, startToken, capital, all_tickers, all_tradefee);
            totalpath.push(result);
        }
        // console.log(totalpath);
        totalpath = totalpath.flat();
        // console.log(totalpath.length);
        // var coinremove = ['BNB', 'XRP', 'LUNA', 'TFUEL', 'XLM', 'IOST', 'KAVA', 'XEM', 'HBAR', 'MDX'];
        // for (let base of coinremove) {
        //     var totalpath = totalpath.filter(item => item.base !== base);
        // }
        // for (let total of totalpath) {
        //     if (total.buy == 'Okex' || total.sell == 'Okex') {
        //         totalpath = totalpath.filter(item => item.base !== 'DOGE');
        //     }
        //     if (total.buy == 'Binance' || total.sell == 'Binance') {
        //         totalpath = totalpath.filter(item => item.base !== 'KSM', item => item.base !== 'FIL');
        //     }
        //     if (total.buy == 'Bitfinex' || total.sell == 'Bitfinex') {
        //         totalpath = totalpath.filter(item => item.base !== 'FTT');
        //     }
        // }
        totalpath.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
        var orderchech = await profitpathData({ status: 'ACTIVE', arbitrageName: arbitrage.IntraArbitrage });
        if (!orderchech) {
            var obj = {
                arbitrageName: arbitrage.IntraArbitrage,
                path: totalpath
            }
            var orderchech = await profitpathCreate(obj);
            console.log('Intra Arbitrage========>>>Save');
        }
        else {
            orderchech = await profitpathUpdate({ _id: orderchech._id }, { $set: { path: totalpath } }, { new: true });
            console.log('Intra Arbitrage========>>>Update', totalpath.length);
        }
        getIntra.start();
    } catch (e) {
        console.log("146 ==>", e);
        getIntra.start();
    }
});
//--------------------------------------------------Loop Arbitrage Path Store-----------------------------------------------------------------------------//
var getLoop = new CronJob(config.get('cronTime.profitPaths'), async function () {
    try {
        var array = [
            "Binance-Kraken-Coinbase",
            "Coinbase-Binance-Kraken",
            "Kraken-Binance-Coinbase",
            "Binance-Coinbase-Kraken",
            "Coinbase-Kraken-Binance",
            "Kraken-Coinbase-Binance",
        ];
        getLoop.stop();
        let capitalAmountRes = await findCapitalAmount({})
        let amountRes
        if (!capitalAmountRes) {
            amountRes = 1000
        } else {
            amountRes = capitalAmountRes.loop
        }
        var totalpath = new Array();
        const amount = 1000;
        for (token of array) {
            var t1 = token.split('-')[0];
            var t2 = token.split('-')[1];
            var t3 = token.split('-')[2];
            let exchangeTokenData1 = await exchangeData({ exchangeName: t1, status: "ACTIVE" });
            let exchangeTokenData2 = await exchangeData({ exchangeName: t2, status: "ACTIVE" });
            let exchangeTokenData3 = await exchangeData({ exchangeName: t3, status: "ACTIVE" });
            let startToken = ['USDT'];
            let capital = Number(amountRes);
            var exchange = new Array();
            exchange.push(t1, t2, t3);
            var all_tickers = new Array();
            var token = {};
            token[t1] = exchangeTokenData1.tickers;
            token[t2] = exchangeTokenData2.tickers;
            token[t3] = exchangeTokenData3.tickers;
            all_tickers.push(token);
            var all_withdrawfee = new Array();
            var withdaw = {};
            withdaw[t1] = exchangeTokenData1.withdrawFee;
            withdaw[t2] = exchangeTokenData2.withdrawFee;
            withdaw[t3] = exchangeTokenData3.withdrawFee;
            all_withdrawfee.push(withdaw);
            var all_tradefee = new Array();
            var trade = {};
            trade[t1] = exchangeTokenData1.tradeFee;
            trade[t2] = exchangeTokenData2.tradeFee;
            trade[t3] = exchangeTokenData3.tradeFee;
            all_tradefee.push(trade);
            var price = await arbitragefunction.get_prices_loop(exchange, all_tickers);
            var paths = await arbitragefunction.get_paths_loop(exchange, price, capital, startToken, all_withdrawfee, all_tickers, all_tradefee);
            var execute = await arbitragefunction.execute_paths(paths, exchange, capital, all_tickers, all_tradefee);
            totalpath.push(execute);
            totalpath = totalpath.flat();
        }
        totalpath.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
        var orderchech = await profitpathData({ status: 'ACTIVE', arbitrageName: arbitrage.LoopArbitrage })
        if (!orderchech) {
            var obj = {
                arbitrageName: arbitrage.LoopArbitrage,
                path: totalpath
            }
            var orderchech = await profitpathCreate(obj);
            console.log('save Inter Loop Profit Path=========>>>>>');
        }
        else {
            orderchech = await profitpathUpdate({ _id: orderchech._id }, { $set: { path: totalpath } }, { new: true });
            console.log('Inter Loop Arbitrage=========>>>>>', totalpath.length);
        }
        getLoop.start();
    } catch (e) {
        getLoop.start();
        console.log("496 ==>", e);
    }
});

//-------------------------------------------------Triangular Arbitrage Path store----------------------------------------------------------------------------------------//
let threeTriangularProfitPathsCron = new CronJob(config.get('cronTime.profitPaths'), async () => {
    try {
        // console.log(3, new Date().toLocaleString())
        let capitalAmountRes = await findCapitalAmount({})
        let amountRes
        if (!capitalAmountRes) {
            amountRes = 1000
        } else {
            amountRes = capitalAmountRes.triangular
        }
        let exchanges = ['Binance', 'Mexc', 'Kraken', 'Bitmart', "Coinbase", "Gateio"];
        // let allExchangeName=await exchangeList({status: "ACTIVE"})
        // let exchanges = allExchangeName.map( (item) => item.exchangeName);
        for (let exchange of exchanges) {
            // if (exchange == 'Okex') {
            await triangularProfitPaths(exchange, '', '', '', '', '3', Number(amountRes)).then(async (threePaths) => {
                // let history = threePaths.map(function (el) {
                //     var o = Object.assign({}, el);
                //     o.arbitrageName = arbitrage.TriangularArbitrage
                //     o.exchange = exchange
                //     return o;
                // });
                // await insertManyProfitPathHistory(history)
                let threeObj = {
                    arbitrageName: arbitrage.TriangularArbitrage,
                    exchange: exchange,
                    depthOfArbitrage: 3,
                    path: threePaths
                }
                let updateData = await createUpdateProfitPath({ status: 'ACTIVE', arbitrageName: arbitrage.TriangularArbitrage, exchange: exchange, depthOfArbitrage: '3' }, threeObj)
                triangularTime = Date.now() + minutes * 60 * 1000
                console.log('Depth 3 Object updated.==>', exchange, threePaths.length)
                // await profitpathData({ status: 'ACTIVE', arbitrageName: arbitrage.TriangularArbitrage, exchange: exchange, depthOfArbitrage: '3' }).then(async (triangularPathData) => {
                //     if (!triangularPathData) {
                //         // console.log('IF with ', exchange);
                //         let threeObj = {
                //             arbitrageName: arbitrage.TriangularArbitrage,
                //             exchange: exchange,
                //             depthOfArbitrage: 3,
                //             path: threePaths
                //         }
                //         await profitpathCreate(threeObj).then(console.log('Depth 3 Object created. ==>', exchange, threePaths.length));
                //     } else {
                //         // console.log('else with ', exchange);
                //         let query = { _id: triangularPathData._id };
                //         let updateObj = { $set: { path: threePaths } };
                //         await profitpathUpdate(query, updateObj).then(() => {
                //             if (threePaths) { console.log('Depth 3 Object updated.==>', exchange, threePaths.length) }
                //         }
                //         );
                //     }
                // })
            });
            // }
        }
    } catch (error) {
        console.log('348 ==>', error);
    }
});

let fourTriangularProfitPathsCron = new CronJob(config.get('cronTime.profitPaths'), async () => {
    try {
        // console.log(4, new Date().toLocaleString())
        // let exchanges = ['Binance', 'Kucoin', 'Huobi','BitFinex', 'Okex'];
        let exchanges = ['Kucoin', 'Cexio', 'Coinbase', 'Gemini', 'Bitstamp', 'Binance', 'Ftxus'];
        for (let exchange of exchanges) {
            // if (exchange == 'Binance') {
            await triangularProfitPaths(exchange, '', '', '', '', '4', 1000).then(async (fourPaths) => {
                await profitpathData({ status: 'ACTIVE', arbitrageName: arbitrage.TriangularArbitrage, exchange: exchange, depthOfArbitrage: '4' }).then(async (triangularPathData) => {
                    if (!triangularPathData) {
                        console.log('IF with ', exchange);
                        let threeObj = {
                            arbitrageName: arbitrage.TriangularArbitrage,
                            exchange: exchange,
                            depthOfArbitrage: 4,
                            path: fourPaths
                        }
                        await profitpathCreate(threeObj).then(console.log('Depth 4 Object created. ==>', exchange, fourPaths.length));
                    } else {
                        // console.log('else with ', exchange);
                        let query = { _id: triangularPathData._id };
                        let updateObj = { $set: { path: fourPaths } };
                        await profitpathUpdate(query, updateObj).then(() => {
                            if (fourPaths) { console.log('Depth 4 Object updated.==>', exchange, fourPaths.length) }
                        }
                        );
                    }
                })
            });
            // }
        }
    } catch (error) {
        console.log('381 ==>', error);
    }
});

let fiveTriangularProfitPathsCron = new CronJob(config.get('cronTime.profitPaths'), async () => {
    try {
        // console.log(5, new Date().toLocaleString())
        // let exchanges = ['Binance', 'Kucoin', 'Huobi','BitFinex', 'Okex'];
        let exchanges = ['Kucoin', 'Cexio', 'Coinbase', 'Gemini', 'Bitstamp', 'Binance', 'Ftxus'];
        for (let exchange of exchanges) {
            // if (exchange == 'BitFinex') {
            await triangularProfitPaths(exchange, '', '', '', '', '5', 1000).then(async (fivePaths) => {
                await profitpathData({ status: 'ACTIVE', arbitrageName: arbitrage.TriangularArbitrage, exchange: exchange, depthOfArbitrage: '5' }).then(async (triangularPathData) => {
                    if (!triangularPathData) {
                        console.log('IF with ', exchange);
                        let threeObj = {
                            arbitrageName: arbitrage.TriangularArbitrage,
                            exchange: exchange,
                            depthOfArbitrage: 5,
                            path: fivePaths
                        }
                        await profitpathCreate(threeObj).then(console.log('Depth 5 Object created. ==>', exchange, fivePaths.length));
                    } else {
                        // console.log('else with ', exchange);
                        let query = { _id: triangularPathData._id };
                        let updateObj = { $set: { path: fivePaths } };
                        await profitpathUpdate(query, updateObj).then(() => {
                            if (fivePaths) { console.log('Depth 5 Object updated.==>', exchange, fivePaths.length) }
                        }
                        );
                    }
                })
            });
            // }
        }
    } catch (error) {
        console.log('414 ==>', error);
    }
});

let intraTwoPairsWithSingleExchange = new CronJob(config.get('cronTime.profitPaths'), async () => {
    try {
        let capitalAmountRes = await findCapitalAmount({})
        let amountRes
        if (!capitalAmountRes) {
            amountRes = 1000
        } else {
            amountRes = capitalAmountRes.intraSingleExchange
        }
        let exchanges = ['Binance', "Mexc", "Kraken", 'Bitmart', "Coinbase", "Gateio"];
        for (let exchange of exchanges) {
            // if (exchange == 'Okex') {
            await singleExchangeTwoPairProfitPath(exchange, '', Number(amountRes)).then(async (threePaths) => {
                // let history = threePaths.map(function (el) {
                //     var o = Object.assign({}, el);
                //     o.arbitrageName = arbitrage.IntraArbitrageSingleExchange
                //     o.exchange = exchange
                //     return o;
                // });
                // await insertManyProfitPathHistory(history)
                let threeObj = {
                    arbitrageName: arbitrage.IntraArbitrageSingleExchange,
                    exchange: exchange,
                    path: threePaths
                }
                let updateData = await createUpdateProfitPath({ status: 'ACTIVE', arbitrageName: arbitrage.IntraArbitrageSingleExchange, exchange: exchange }, threeObj)
                intraTime = Date.now() + minutes * 60 * 1000
                console.log('Intra Two pairs withSingleExchange Object updated.==>', exchange, threePaths.length)
                // await profitpathData({ status: 'ACTIVE', arbitrageName: arbitrage.IntraArbitrageSingleExchange, exchange: exchange }).then(async (triangularPathData) => {
                //     if (!triangularPathData) {
                //         // console.log('IF with ', exchange);
                //         let threeObj = {
                //             arbitrageName: arbitrage.IntraArbitrageSingleExchange,
                //             exchange: exchange,
                //             path: threePaths
                //         }
                //         await profitpathCreate(threeObj).then(console.log('Intra Two pairs withSingleExchange Object created. ==>', exchange, threePaths.length));
                //     } else {
                //         // console.log('else with ', exchange);
                //         let query = { _id: triangularPathData._id };
                //         let updateObj = { $set: { path: threePaths } };
                //         await profitpathUpdate(query, updateObj).then(() => {
                //             if (threePaths) { console.log('Intra Two pairs withSingleExchange Object updated.==>', new Date(), exchange, threePaths.length) }
                //         }
                //         );
                //     }
                // })
            });
            // }
        }
    } catch (error) {
        console.log('666 ==>', error);
    }
});

/////////////////////////////////////////////////////////

// getDirect.start();
// getDirect.stop();

// getIntra.start();
// getIntra.stop();

// getLoop.start();
// getLoop.stop();

threeTriangularProfitPathsCron.start();
// threeTriangularProfitPathsCron.stop();

// fourTriangularProfitPathsCron.start();
// fourTriangularProfitPathsCron.stop();

// fiveTriangularProfitPathsCron.start();
// fiveTriangularProfitPathsCron.stop();

intraTwoPairsWithSingleExchange.start();
// intraTwoPairsWithSingleExchange.stop();


let allCronRestart = new CronJob(config.get('cronTime.allCronReset'), async () => {
    if (intraTime < Date.now()) {
        intraTwoPairsWithSingleExchange.start()
    }
    if (triangularTime < Date.now()) {
        threeTriangularProfitPathsCron.start()
    }
    // if (directTime < Date.now()) {
    //     getDirect.start()
    // }

})
allCronRestart.start()
// const { convert_profit } = require('./convert_profit');
const c = require('config');

function convertProfit(exchange, tickers, start_tokens, quantity) {
    for (let token of start_tokens) {
        switch (token) {
            case 'USD':
                return quantity;
                break;
            case 'USDT':
                return quantity;
                break;
            default:
                if (tickers[token + 'USDT']) {
                    return quantity * tickers[token + 'USDT']['price'];
                } else {
                    return quantity * tickers[token + 'USD']['price'];
                }
                break;
        }
    }
}
module.exports = {
    find_paths: async (prices, strating_coin, depth, amount, exchange, fee) => {
        // console.log('>>>>>>>>>>>>>>>>');
        // console.log("find_paths started!!!");
        let minPrecision, profit3;
        let paths = new Array();
        let count = 0, count1 = 0, count2 = 0;
        let profit = 0.000001;
        let coin, coin1, coin2, coin3, coin4;
        let price, price1, price2, price3, price4;
        for (let token of strating_coin) { //USDT
            if (prices[token]) {
                for ([coin, price] of Object.entries(prices[token])) { //BTC-USDT buy    NEO_USDT Buy
                    for ([coin1, price1] of Object.entries(prices[coin])) {//ETH-BTC buy    NEO_BTC sell
                        if (coin1 != token) {
                            for ([coin2, price2] of Object.entries(prices[coin1])) { //ETH-USDT sell    BTC-USDT sell
                                if (coin2 == token && depth == 3) {
                                    let profit3 = calculateProfit(amount[token], price[0], price[2], price1[0], price1[2], price2[0], price2[2], exchange)
                                    if (parseFloat(profit3) > profit) {
                                        if (parseFloat(fee[price[1]].minNotional) < (parseFloat(amount[token]) / parseFloat(price[4])) && parseFloat(fee[price1[1]].minNotional) < (parseFloat(profit3[1]) * parseFloat(price1[4])) && parseFloat(fee[price2[1]].minNotional) < (parseFloat(profit3[2]) * parseFloat(price2[4]))) {
                                            count += 1;
                                            let obj = {
                                                coins: [token, price[1], price1[1], price2[1], token],
                                                profit: profit3[0],
                                                prices: [price[4], price1[4], price2[4]],
                                                finalPrices: [price[0], price1[0], price2[0]],
                                                fees: [price[2], price1[2], price2[2]],
                                                volume: [price[3], price1[3], price2[3]],
                                                amount: [amount[token], profit3[1], profit3[2], profit3[3]]
                                                // volumeSum: price[3] + price1[3] + price2[3]
                                            }
                                            paths.push(obj);
                                            profit3 = 0;
                                        }
                                    }
                                }
                                if (depth >= 4 && depth < 6 && coin != coin2) {
                                    for ([coin3, price3] of Object.entries(prices[coin2])) {
                                        if (coin3 == token && depth == 4) {
                                            console.log("depth 4 to 6 ======67")
                                            let profit4 = amount[token] * (price[0] - (price[0] * price[2]) / 100) * (price1[0] - (price1[0] * price1[2]) / 100) * (price2[0] - (price2[0] * price2[2]) / 100) * (price3[0] - (price3[0] * price3[2]) / 100)
                                            profit4 = profit4 - amount[token];
                                            if (parseFloat(profit4) > profit) {
                                                // if (count1 >= 400) {
                                                //     break
                                                // }
                                                count1 += 1;
                                                let obj = {
                                                    coins: [token, price[1], price1[1], price2[1], price3[1], token],
                                                    profit: profit4,
                                                    prices: [price[4], price1[4], price2[4], price3[4]],
                                                    fees: [price[2], price1[2], price2[2], price3[2]],
                                                    volume: [price[3], price1[3], price2[3], price3[3]],
                                                    // volumeSum: price[3] + price1[3] + price2[3] + price3[3]
                                                }
                                                paths.push(obj);
                                                profit4 = 0
                                            }
                                        }
                                        if (depth == 5 && coin1 != coin3) {
                                            for ([coin4, price4] of Object.entries(prices[coin3])) {
                                                if (coin4 == token && coin4 != coin3 && price4[1] != price3[1]) {
                                                    console.log("depth 5======90")
                                                    let profit5 = amount[token] * (price[0] - (price[0] * price[2]) / 100) * (price1[0] - (price1[0] * price1[2]) / 100) * (price2[0] - (price2[0] * price2[2]) / 100) * (price3[0] - (price3[0] * price3[2]) / 100) * (price4[0] - (price4[0] * price4[2]) / 100)
                                                    profit5 = profit5 - amount[token];
                                                    if (parseFloat(profit5) > profit) {
                                                        count2 += 1;
                                                        let obj = {
                                                            coins: [token, price[1], price1[1], price2[1], price3[1], price4[1], token],
                                                            profit: profit5,
                                                            prices: [price[4], price1[4], price2[4], price3[4], price4[4]],
                                                            fees: [price[2], price1[2], price2[2], price3[2], price4[2]],
                                                            volume: [price[3], price1[3], price2[3], price3[3], price4[3]],
                                                            // volumeSum: price[3] + price1[3] + price2[3] + price3[3] + price4[3]
                                                        }
                                                        paths.push(obj);
                                                        profit5 = 0
                                                        break
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

        }
        paths.sort((a, b) => (a.profit > b.profit) ? -1 : ((b.profit > a.profit) ? 1 : 0));
        return paths;
    },
    execute_paths: async (paths, exchange, tickers, capital, quantity) => {
        var response = [];
        for (let [id, data] of Object.entries(paths)) {
            let start = data.coins[0];
            let splitedPair = [tickers[data.coins[1]].base, tickers[data.coins[1]].quote]
            let stop = start
            let p;
            let orders = {}
            let test = []
            let split_pair;
            let finalReceiveAmount = 0;
            for (let i = 0; i <= data.coins[0].length + 3; i++) {
                let test1 = {}
                if (i > 0) {
                    if (data.coins[i] == stop) {
                        break
                    } else if (tickers[data.coins[i]].quote == start) {
                        split_pair = [tickers[data.coins[i]].base, tickers[data.coins[i]].quote]
                        test1[data.coins[i]] = 'buy';
                        p = tickers[data.coins[i]]['price'];
                        // test1['price'] = toFixed(p);
                        test1['price'] = toFixed(parseFloat(data.prices[i - 1]));
                        test1['finalPrice'] = toFixed(parseFloat(data.finalPrices[i - 1]));
                        test1['fees'] = parseFloat(data.fees[i - 1]);
                        test1['volume'] = parseFloat(data.volume[i - 1]);
                        test1['buyAmount'] = parseFloat(data.amount[i - 1]);
                        test1['receiveAmount'] = parseFloat(data.amount[i]);
                        test1['baseCurrency'] = split_pair[0];
                        test1['quoteCurrency'] = split_pair[1];
                        test.push(test1);
                        start = split_pair[0];
                        finalReceiveAmount = data.amount[i];
                    } else {
                        split_pair = [tickers[data.coins[i]].base, tickers[data.coins[i]].quote]
                        test1[data.coins[i]] = 'sell'
                        p = tickers[data.coins[i]]['price'];
                        // test1['price'] = toFixed(p);
                        test1['price'] = toFixed(parseFloat(data.prices[i - 1]));
                        test1['finalPrice'] = toFixed(parseFloat(data.finalPrices[i - 1]));
                        test1['fees'] = parseFloat(data.fees[i - 1]);
                        test1['volume'] = parseFloat(data.volume[i - 1]);
                        test1['sellAmount'] = parseFloat(data.amount[i - 1]);
                        test1['receiveAmount'] = parseFloat(data.amount[i]);
                        test1['baseCurrency'] = split_pair[1];
                        test1['quoteCurrency'] = split_pair[0];
                        test.push(test1);
                        start = split_pair[1];
                        finalReceiveAmount = data.amount[i];
                    }
                }
            }
            orders.coins = test;
            orders.capital = quantity[start];
            orders.capitalInUSDT = capital;
            orders.start = data.coins[0];
            if (splitedPair[0] == start) {
                orders.pair = splitedPair[1];
            }
            else if (splitedPair[1] == start) {
                orders.pair = splitedPair[0];
            }
            let token = [data.coins[0]];
            orders.profit = parseFloat(convertProfit(exchange, tickers, token, data.profit).toFixed(6));
            orders.profitPercent = ((parseFloat(finalReceiveAmount) - parseFloat(quantity[start])) / parseFloat(quantity[start])) * 100;
            orders.profitCurrencyBase = parseFloat(finalReceiveAmount)
            response.push(orders);
        }
        // console.log('315 ==>',response)
        return response;
    },
}
function toFixed(x) {
    if (Math.abs(x) < 1.0) {
        var e = parseInt(x.toString().split('e-')[1]);
        if (e) {
            x *= Math.pow(10, e - 1);
            x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
        }
    } else {
        var e = parseInt(x.toString().split('+')[1]);
        if (e > 20) {
            e -= 20;
            x /= Math.pow(10, e);
            x += (new Array(e + 1)).join('0');
        }
    }
    return x;
}

// let calculateProfit = (amount, price0, price0TradeFee, price1, price1TradeFee, price2, price2TradeFee) => {
//     let totalAmount = parseFloat(amount) * parseFloat(price0) - ((parseFloat(amount) * parseFloat(price0)) * parseFloat(price0TradeFee) / 100)
//     let totalAmount1 = parseFloat(totalAmount) * parseFloat(price1) - ((parseFloat(totalAmount) * parseFloat(price1)) * parseFloat(price1TradeFee) / 100)
//     let finalAmount = parseFloat(totalAmount1) * parseFloat(price2) - ((parseFloat(totalAmount1) * parseFloat(price2)) * parseFloat(price2TradeFee) / 100)

//     return [finalAmount - amount, totalAmount, totalAmount1, finalAmount]
// }

let calculateProfit = (amount, price0, price0TradeFee, price1, price1TradeFee, price2, price2TradeFee, exchange) => {
    let tradeFee = price0TradeFee
    if (exchange == "Binance") {
        tradeFee = 0.25
    }
    else if (exchange == "Kraken") {
        tradeFee = 0.4
    }else if(exchange == "Bitmart"){
        tradeFee = 0.12
    }
    amount = parseFloat(amount.toFixed(8))
    price0 = parseFloat(price0.toFixed(8))
    price1 = parseFloat(price1.toFixed(8))
    price2 = parseFloat(price2.toFixed(8))
    let totalAmount = parseFloat(amount) * parseFloat(price0) - ((parseFloat(amount) * parseFloat(price0)) * parseFloat(tradeFee) / 100)
    totalAmount = parseFloat(totalAmount.toFixed(8))
    let totalAmount1 = parseFloat(totalAmount) * parseFloat(price1) - ((parseFloat(totalAmount) * parseFloat(price1)) * parseFloat(tradeFee) / 100)
    totalAmount1 = parseFloat(totalAmount1.toFixed(8))
    let finalAmount = parseFloat(totalAmount1) * parseFloat(price2) - ((parseFloat(totalAmount1) * parseFloat(price2)) * parseFloat(tradeFee) / 100)
    finalAmount = parseFloat(finalAmount.toFixed(8))
    return [finalAmount - amount, totalAmount, totalAmount1, finalAmount]
}
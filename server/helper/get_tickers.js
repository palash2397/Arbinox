import config from "config";
const util = require('util');
const axios = require('axios');
const request = require('request');
const requestPromise = util.promisify(request);
const crypto = require('crypto');
const { addressdata } = require('./bitfinexaddress');
const HuobiGlobal = require('../helper/huobiGlobalAPI');
import { Kraken } from "node-kraken-api";
const coonecteExchange = require("../models/connectedExchange")

const Coinbase = require('coinbase-pro');
const publicClient = new Coinbase.PublicClient();

import exchangeModel from '../models/exchange';
const currencyPairs = require('./currencyPairs');
import base64 from 'base-64'
import { walletServices } from '../api/v1/services/wallet';
import { resolve } from "path";
const { exchangeList, exchangeData, connectedExchangeData, connectedExchangeUpdate, connectedExchangeCreate } = walletServices;
import { withdrawAddressServices } from '../api/v1/services/withdrawAddress'
import { compareSync } from "bcryptjs";
const { findWithdrawAddress } = withdrawAddressServices
import coinbaseSignature from "./coinbaseSignature";
import gateioSignature from "./gateioSignature";


function getBaseQuote(sym) {
    if (sym.endsWith('BTC')) {
        return [sym.replace('BTC', ''), 'BTC']
    } else if (sym.endsWith('USDT')) {
        return [sym.replace('USDT', ''), 'USDT']
    } else if (sym.endsWith('ETH')) {
        return [sym.replace('ETH', ''), 'ETH']
    }
}

function getWalletList(data, coin) {
    let list = []
    for (let [key, value] of Object.entries(data)) {
        if (value.base == coin) {
            if (!list.includes(value.quote)) {
                list.push(value.quote)
            }
        }
    }
    return list
}

function checkVolume(volume, quote) {
    if (quote == 'USD')
        quote = 'USDT'
    switch (quote) {
        case "BTC":
            if (volume > 0.0000001) {
                return true
            } else {
                return false
            }
            break;
        case "USDT":
            if (volume > 10) {
                return true
            } else {
                return false
            }
            break;
        case "ETH":
            if (volume > 0.0000001) {
                return true
            } else {
                return false
            }
            break;
    }

}

module.exports = {
    get_tickers: async (exchange, apiKey, secretKey, passphrase) => {
        try {
            let tickers;
            let client, pairs = [];
            let dbTicker = {};
            let totalPairs = currencyPairs.currencyPairs
            switch (exchange) {
                case 'Binance':
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Binance", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        let keysArray = Object.keys(tradefee);
                        var jsonString = JSON.stringify(keysArray)
                        var finalArray = jsonString.replace(/'/g, '"');
                        var config = {
                            method: 'get',
                            url: `https://api4.binance.com/api/v3/ticker/24hr?symbols=${finalArray}`,
                            headers: {}
                        };
                        let binanceTickers = await axios(config)
                        // const [tradefee, binanceTickers] = await Promise.all([exchangeModel.findOne({ exchangeName: "Binance", status: "ACTIVE" }), axios(config)]);
                        const dbTicker = {};
                        const feeData = tradefee
                        if (binanceTickers.status === 200 && feeData) {
                            for (const element of binanceTickers.data) {
                                const fee = feeData[element.symbol];

                                if (fee && (totalPairs).includes(fee.base) && (fee.quote === "BTC" || fee.quote === "ETH" || fee.quote === "USDT") && checkVolume(element.quoteVolume, fee.quote)) {
                                    const objDb = {
                                        symbol: element.symbol,
                                        tradingPair: element.symbol,
                                        base: fee.base,
                                        quote: fee.quote,
                                        price: element.lastPrice,
                                        volume: element.quoteVolume,
                                        marketCap: element.volume,
                                        lowestAsk: element.askPrice,
                                        highestBid: element.bidPrice,
                                        priceChange: element.priceChange,
                                        priceChangePercent: element.priceChangePercent
                                    };
                                    dbTicker[element.symbol] = objDb;
                                }
                            }
                        }
                        return dbTicker;
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Binance function:-get ticker]:', errorMessage, new Date().toLocaleString())
                    }

                    break;
                case 'Coinbase':
                    try {
                        var config = {
                            method: 'get',
                            url: 'https://api.coinbase.com/api/v3/brokerage/market/products',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        };
                        let result = await axios(config)
                        if (result.status == 200) {
                            for (const asset of result.data.products) {
                                if (asset.status == 'online') {
                                    if ((totalPairs).includes(asset.base_currency_id)) {
                                        if ((asset.quote_currency_id == "USDT" || asset.quote_currency_id == "BTC" || asset.quote_currency_id == "ETH")) {
                                            let objDb = {
                                                symbol: asset.product_id,
                                                tradingPair: asset.base_display_symbol + asset.quote_display_symbol,
                                                base: asset.base_display_symbol,
                                                quote: asset.quote_display_symbol,
                                                price: asset.price,
                                                volume: asset.volume_24h,
                                                lowestAsk: asset.price,
                                                highestBid: asset.price,

                                            };
                                            dbTicker[objDb.tradingPair] = objDb;
                                        }
                                    }
                                }

                            }
                        }
                        return dbTicker;
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Coinbase function:-get ticker]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'Huobi':
                    let coins = [];
                    let huobiTickers = await HuobiGlobal.getAllTickers();
                    huobiTickers = JSON.parse(huobiTickers);
                    huobiTickers = huobiTickers.data
                    if (huobiTickers) {
                        huobiTickers.map(element => {
                            let sym = (element.symbol).toUpperCase()
                            let split_pair = getBaseQuote(sym)
                            // console.log(160, "test", element.vol,split_pair)
                            if (split_pair && (totalPairs).includes(split_pair[0]) && checkVolume(element.vol, split_pair[1])) {
                                if (!coins.includes(split_pair[0]))
                                    coins.push(split_pair[0])
                                let priceChange = element.close - element.open
                                let priceChangePercent = (priceChange / element.close) * 100
                                let objDb = {
                                    symbol: sym,
                                    base: split_pair[0],
                                    quote: split_pair[1],
                                    price: element.close,
                                    volume: element.vol,
                                    marketCap: element.vol / element.close,
                                    lowestAsk: element.ask,
                                    highestBid: element.bid,
                                    priceChange: priceChange,
                                    priceChangePercent: priceChangePercent
                                }
                                dbTicker[sym] = objDb;
                            }
                        });
                        return dbTicker;
                    }
                    break;
                case 'Kraken':
                    try {
                        var config = {
                            method: 'get',
                            url: `https://api.kraken.com/0/public/AssetPairs`,
                            headers: {}
                        };
                        let krakenPairs = await axios(config)
                        if (krakenPairs.status == 200) {
                            let pairs = krakenPairs.data.result
                            let pairKeys = [], split_pair;
                            let baseQuotes = {}
                            for (let cp of Object.entries(pairs)) {
                                if (cp[1].status == 'online') {
                                    split_pair = (cp[1].wsname).split("/");
                                    if ((totalPairs).includes(split_pair[0]) && (split_pair[1] == "BTC" || split_pair[1] == "ETH" || split_pair[1] == "USDT")) {
                                        pairKeys.push(split_pair[0] + split_pair[1]);
                                        baseQuotes[cp[0]] = {
                                            altname: cp[1].altname,
                                            wsname: cp[1].wsname,
                                            commonBase: split_pair[0],
                                            commonQuote: split_pair[1],
                                            krakenName: cp[0]
                                        }
                                    }
                                }
                            }
                            var config = {
                                method: 'get',
                                url: `https://api.kraken.com/0/public/Ticker?pair=${pairKeys}`,
                                headers: {}
                            };
                            let krakenTickers = await axios(config)
                            if (krakenTickers.status == 200) {
                                let result = krakenTickers.data.result
                                for (let ticker of Object.entries(result)) {
                                    let objDb = {
                                        "symbol": baseQuotes[ticker[0]].commonBase + baseQuotes[ticker[0]].commonQuote,
                                        "tradingPair": baseQuotes[ticker[0]].commonBase + baseQuotes[ticker[0]].commonQuote,
                                        "base": baseQuotes[ticker[0]].commonBase,
                                        "quote": baseQuotes[ticker[0]].commonQuote,
                                        "price": ticker[1].c[0],
                                        "volume": ticker[1].v[0],
                                        "marketCap": ticker[1].v[0],
                                        "lowestAsk": ticker[1].a[0],
                                        "highestBid": ticker[1].b[0],
                                        "krakenBase": pairs[ticker[0]].base,
                                        "krakenQuote": pairs[ticker[0]].quote,
                                        "krakenSymbol": pairs[ticker[0]].base + pairs[ticker[0]].quote,
                                        "wsName": baseQuotes[ticker[0]].wsname,
                                        "krakenName": baseQuotes[ticker[0]].krakenName,
                                        "priceChange": 0,
                                        "priceChangePercent": 0
                                    }
                                    dbTicker[objDb.tradingPair] = objDb;
                                }
                                // console.log("dfhshfjsdhfjsdhfjhjfhsdhfjsdhfjdshfsdhfjsdhfj",dbTicker)
                                return dbTicker;
                            }

                        }

                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Kraken function:-get ticker]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case "Mexc":
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Mexc", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            if (tradefee.length != 0) {
                                var config = {
                                    method: 'get',
                                    url: `https://api.mexc.com/api/v3/ticker/24hr`,
                                    headers: {}
                                };
                                let mexcTickers = await axios(config)
                                if (mexcTickers.status == 200) {
                                    let ticker = mexcTickers.data
                                    if (ticker.length != 0) {
                                        ticker.map(element => {
                                            if (tradefee[element.symbol]) {
                                                if ((totalPairs).includes(tradefee[element.symbol].base) && (totalPairs).includes(tradefee[element.symbol].quote)) {
                                                    if (tradefee[element.symbol].quote == "BTC" || tradefee[element.symbol].quote == "ETH" || tradefee[element.symbol].quote == "USDT") {
                                                        let objDb = {
                                                            symbol: element.symbol,
                                                            tradingPair: tradefee[element.symbol].base + tradefee[element.symbol].quote,
                                                            base: tradefee[element.symbol].base,
                                                            quote: tradefee[element.symbol].quote,
                                                            price: element.lastPrice,
                                                            volume: element.quoteVolume,
                                                            marketCap: element.volume,
                                                            lowestAsk: element.askPrice,
                                                            highestBid: element.bidPrice,
                                                        }
                                                        dbTicker[objDb.tradingPair] = objDb;
                                                    }
                                                }
                                            }
                                        })
                                        return dbTicker;

                                    }
                                }
                            }
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Mexc function:-get ticker]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case "Bitmart":
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Bitmart", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            var config = {
                                method: 'get',
                                url: 'https://api-cloud.bitmart.com/spot/quotation/v3/tickers',
                                headers: {}
                            };
                            let bitmartTickers = await axios(config)
                            if (bitmartTickers.status == 200) {
                                let ticker = bitmartTickers.data.data
                                if (ticker.length != 0) {
                                    ticker.map(element => {
                                        let pairs = (element[0]).split('_')
                                        if (tradefee[pairs[0] + pairs[1]]) {
                                            if ((totalPairs).includes(pairs[0])) {
                                                if (pairs[1] == "BTC" || pairs[1] == "ETH" || pairs[1] == "USDT") {
                                                    let objDb = {
                                                        symbol: element[0],
                                                        tradingPair: pairs[0] + pairs[1],
                                                        base: pairs[0],
                                                        quote: pairs[1],
                                                        price: element[1],
                                                        marketCap: element[2],
                                                        volume: element[3],
                                                        highestBid: element[8],
                                                        lowestAsk: element[10],
                                                    }
                                                    dbTicker[objDb.tradingPair] = objDb;
                                                }
                                            }
                                        }
                                    })
                                }

                            }
                        }
                        // var config = {
                        //     method: 'get',
                        //     url: 'https://api-cloud.bitmart.com/spot/v1/ticker',
                        //     headers: {}
                        // };
                        // let dataRes = await new Promise((resolve, reject) => {
                        //     axios(config)
                        //         .then(function (response) {
                        //             let ticker = JSON.parse(JSON.stringify(response.data)).data.tickers
                        //             if (ticker.length != 0) {
                        //                 ticker.map(element => {
                        //                     let pairs = (element.symbol).split('_')
                        //                     if ((totalPairs).includes(pairs[0])) {
                        //                         if (pairs[1] == "BTC" || pairs[1] == "ETH" || pairs[1] == "USDT") {
                        //                             let objDb = {
                        //                                 symbol: element.symbol,
                        //                                 tradingPair: pairs[0] + pairs[1],
                        //                                 base: pairs[0],
                        //                                 quote: pairs[1],
                        //                                 price: element.last_price,
                        //                                 volume: element.quote_volume_24h,
                        //                                 marketCap: element.base_volume_24h,
                        //                                 lowestAsk: element.best_ask,
                        //                                 highestBid: element.best_bid,
                        //                             }
                        //                             dbTicker[objDb.tradingPair] = objDb;
                        //                         }
                        //                     }

                        //                 })
                        //                 resolve(dbTicker);
                        //             }
                        //         })
                        //         .catch(function (error) {
                        //             reject(error);
                        //         });
                        // });
                        return dbTicker
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Bitmart function:-get ticker]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'Gemini':
                    try {
                        let dbTicker = {}
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Gemini", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            for (let token of Object.keys(tradefee)) {
                                var config = {
                                    method: 'get',
                                    url: `https://api.gemini.com/v1/pubticker/${token.toLowerCase()}`,
                                    headers: {}
                                };
                                let getallSymbol = await axios(config)
                                if (getallSymbol.status == 200) {
                                    let objDb = {
                                        "symbol": token,
                                        "tradingPair": token,
                                        "base": tradefee[token].base,
                                        "quote": tradefee[token].quote,
                                        "price": getallSymbol.data.last,
                                        "volume": getallSymbol.data.volume[tradefee[token].quote],
                                        "marketCap": getallSymbol.data.volume[tradefee[token].base],
                                        "lowestAsk": getallSymbol.data.ask,
                                        "highestBid": getallSymbol.data.bid
                                    }
                                    dbTicker[token] = objDb;
                                }
                            }
                            return dbTicker
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Gemini function:-get ticker]:', errorMessage, new Date().toLocaleString())
                    }

                    break;
                case "Gateio":
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Gateio", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            var config = {
                                method: 'get',
                                url: 'https://api.gateio.ws/api/v4/spot/tickers',
                                headers: {}
                            };
                            let respone = await axios(config)
                            if (respone.status == 200) {
                                let tickers = respone.data
                                tickers.map(element => {
                                    let pairs = (element.currency_pair).split('_')
                                    if ((currencyPairs.currencyPairs).includes(pairs[0]) && (currencyPairs.currencyPairs).includes(pairs[1]) && ["BTC", "ETH", "USDT"].includes(pairs[1])) {
                                        if (tradefee[pairs[0] + pairs[1]]) {
                                            let objDb = {
                                                symbol: element.currency_pair,
                                                tradingPair: pairs[0] + pairs[1],
                                                base: pairs[0],
                                                quote: pairs[1],
                                                price: element.last,
                                                volume: element.base_volume,
                                                lowestAsk: element.lowest_ask,
                                                highestBid: element.highest_bid,
                                                priceChangePercent: element.change_percentage

                                            };
                                            dbTicker[objDb.tradingPair] = objDb;
                                        }
                                    }
                                })
                                return dbTicker
                            }
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Gate.io function:-get ticker]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case "HitBTC":
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "HitBTC", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            var config = {
                                method: 'get',
                                url: 'https://api.hitbtc.com/api/3/public/ticker',
                                headers: {}
                            };
                            const responce = await axios(config)
                            if (responce.status == 200) {
                                Object.keys(responce.data).map(key => {
                                    const fee = tradefee[key];
                                    if (fee) {
                                        if ((currencyPairs.currencyPairs).includes(fee.base) && ["BTC", "ETH", "USDT"].includes(fee.quote)) {
                                            if (responce.data[key].last) {
                                                let objDb = {
                                                    symbol: key,
                                                    tradingPair: key,
                                                    base: fee.base,
                                                    quote: fee.quote,
                                                    price: responce.data[key].last,
                                                    volume: responce.data[key].volume,
                                                    lowestAsk: responce.data[key].low,
                                                    highestBid: responce.data[key].high,

                                                };
                                                dbTicker[objDb.symbol] = objDb;
                                            }
                                        }
                                    }
                                })
                                return dbTicker
                            }
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [HitBTC function:-get ticker]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
            }
        } catch (error) {
            console.log('get_ticker==>238 >>>', error)
        }
    },
    get_tradeFee: async (exchange, apiKey, secretKey, passphrase) => {
        try {
            let totalPairs = currencyPairs.currencyPairs
            switch (exchange) {
                case 'Binance':
                    try {
                        let exchangeInfo = {};
                        var config = {
                            method: 'get',
                            url: 'https://api4.binance.com/api/v3/exchangeInfo',
                            headers: {}
                        };
                        let data = await axios(config)
                        // let fee = await B_client.tradeFee({ recvWindow: 60000 }); // maker and taker commission list of currencypair
                        let lotSize, priceFilter;
                        if (data.status == 200) {
                            // console.log(data.symbols,404)
                            (data.data.symbols).map(element => {
                                priceFilter = element.filters[0]
                                lotSize = element.filters[1];
                                if (element.status == 'TRADING') {
                                    if ((totalPairs).includes(element.baseAsset)) {
                                        if (element.quoteAsset == "BTC" || element.quoteAsset == "ETH" || element.quoteAsset == "USDT") {
                                            const decimalCount = num => {
                                                let numStr = String(parseFloat(num));
                                                if (numStr.includes('.')) {
                                                    return numStr.split('.')[1].length;
                                                } else {
                                                    return 0
                                                }
                                            }
                                            let objDb = {
                                                symbol: element.symbol,
                                                tradingPair: element.baseAsset + element.quoteAsset,
                                                base: element.baseAsset,
                                                quote: element.quoteAsset,
                                                minPrice: element.filters[0].minPrice,
                                                maxPrice: element.filters[0].maxPrice,
                                                tickSize: element.filters[0].tickSize,
                                                maxQty: lotSize.maxQty,
                                                minQty: lotSize.minQty,
                                                maxPrecision: decimalCount(lotSize.maxQty),
                                                minPrecision: decimalCount(lotSize.minQty),
                                                pricePrecision: decimalCount(priceFilter.minPrice),
                                                stepSize: lotSize.stepSize,
                                                basePrecision: element.baseAssetPrecision,
                                                quotePrecision: element.quoteAssetPrecision,
                                                minNotional: element.filters[6].minNotional,
                                                tradefee: 0.1
                                            }
                                            exchangeInfo[element.symbol] = objDb;
                                        }
                                    }
                                }
                            });
                            // console.log(exchangeInfo,439)
                            return exchangeInfo
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Binance function:-trade fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'Huobi':
                    try {
                        let apiData = await coonecteExchange.findOne({ uid: "huobi", status: 'ACTIVE' })
                        if (apiData) {
                            let exchange1 = await exchangeData({ exchangeName: 'Huobi', status: "ACTIVE" });
                            let tickers = exchange1.tickers;
                            let coins = Object.keys(tickers);
                            let tradefee = [];
                            let fees = {}
                            const lowercased = coins.map(coin => coin.toLowerCase());
                            const symbols = await HuobiGlobal.getRefSymbols(apiData.secretKey)
                            if (symbols) {
                                for (let i = 0; i < lowercased.length; i += 10) {
                                    let data = await HuobiGlobal.get_trade_fee(apiData.secretKey, lowercased.slice(i, i + 10), apiData.secretKey)
                                    if (data) {
                                        tradefee = tradefee.concat(data)
                                    }
                                }
                                for (let asset of tradefee) {
                                    // console.log(asset, 487)
                                    let base = tickers[(asset.symbol).toUpperCase()].base
                                    let quote = tickers[(asset.symbol).toUpperCase()].quote
                                    let precision = symbols.find(o => o['base-currency'] == base.toLowerCase() && o['quote-currency'] == quote.toLowerCase())
                                    let obj = {
                                        "base": tickers[(asset.symbol).toUpperCase()].base,
                                        "quote": tickers[(asset.symbol).toUpperCase()].quote,
                                        "tradefee": 0.2,
                                        "minPrecision": precision["amount-precision"],
                                        "pricePrecision": precision["price-precision"]
                                    }
                                    fees[(asset.symbol).toUpperCase()] = obj
                                }
                            }
                            return fees;
                        }
                    }
                    catch (error) {
                        console.log('get_tradeFee huobi==> 306 >>>', error)
                    }
                    break;
                case 'Coinbase':
                    try {
                        let exchangeInfo = {};
                        var config = {
                            method: 'get',
                            url: 'https://api.coinbase.com/api/v3/brokerage/market/products',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        };
                        let result = await axios(config)
                        if (result.status == 200) {
                            for (const asset of result.data.products) {
                                if (asset.status == 'online') {
                                    if ((totalPairs).includes(asset.base_currency_id)) {
                                        if ((asset.quote_currency_id == "USDT" || asset.quote_currency_id == "BTC" || asset.quote_currency_id == "ETH")) {
                                            let objDb = {
                                                symbol: asset.product_id,
                                                tradingPair: asset.base_display_symbol + asset.quote_display_symbol,
                                                base: asset.base_display_symbol,
                                                quote: asset.quote_display_symbol,
                                                basePrecision: asset.base_increment,
                                                quotePrecision: asset.quote_increment,
                                                minNotional: 0.0001,
                                                tradefee: 0.6
                                            }
                                            exchangeInfo[objDb.tradingPair] = objDb;
                                        }
                                    }
                                }
                            }
                            return exchangeInfo
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Coinbase function:-trade fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'Kraken':
                    try {
                        let options = {
                            gennonce: () => Date.now() * 1000,
                            timeoutMs: 10000
                        }
                        const krakenClient = new Kraken(options);
                        let exchange1 = await exchangeData({ exchangeName: 'Kraken', status: "ACTIVE" });
                        let tickers = exchange1.tickers;
                        let fees = {};
                        let data = await krakenClient.assetPairs()
                        if (data) {
                            var myData = Object.keys(data).map(key => {
                                return data[key];
                            })
                            for (let [coin, info] of Object.entries(tickers)) {
                                let feeInfo = (myData).find(o => o.wsname == info.wsName)
                                if (feeInfo) {
                                    let obj = {
                                        "symbol": feeInfo.wsname,
                                        "tradingPair": coin,
                                        "base": info.base,
                                        "quote": info.quote,
                                        "krakenBase": tickers[coin].krakenBase,
                                        "krakenQuote": tickers[coin].krakenQuote,
                                        "krakenSymbol": tickers[coin].krakenSymbol,
                                        "quotePrecision": feeInfo.cost_decimals,
                                        "pricePrecision": feeInfo.pair_decimals,
                                        "basePrecision": feeInfo.lot_decimals,
                                        "minPrecision": feeInfo.lot_decimals,
                                        "minNotional": feeInfo.ordermin,
                                        "tradefee": 0.26
                                    }
                                    fees[coin] = obj
                                }
                            }
                            return fees;
                        }

                    }
                    catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Kraken function:-trade fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'Mexc':
                    try {
                        let exchangeInfo = {};
                        var config = {
                            method: 'get',
                            url: 'https://api.mexc.com/api/v3/exchangeInfo',
                            headers: {}
                        };
                        let data = await axios(config)
                        if (data.status == 200) {
                            let symbolData = data.data.symbols
                            if (symbolData) {
                                (symbolData).map(element => {
                                    let mexcStatus = ['ENABLED', '1', 'online']
                                    // if (element.status == 'ENABLED' && element.isSpotTradingAllowed == true) {
                                    if (mexcStatus.includes(element.status) && element.isSpotTradingAllowed == true) {
                                        if ((totalPairs).includes(element.baseAsset) && (totalPairs).includes(element.quoteAsset)) {
                                            if (element.quoteAsset == "BTC" || element.quoteAsset == "ETH" || element.quoteAsset == "USDT") {
                                                let objDb = {
                                                    symbol: element.symbol,
                                                    tradingPair: element.baseAsset + element.quoteAsset,
                                                    base: element.baseAsset,
                                                    quote: element.quoteAsset,
                                                    maxQty: element.maxQuoteAmount,
                                                    maxPrecision: element.quotePrecision,
                                                    minPrecision: element.baseAssetPrecision,
                                                    basePrecision: element.baseAssetPrecision,
                                                    quotePrecision: element.quoteAssetPrecision,
                                                    minNotional: element.baseSizePrecision,
                                                    tradefee: 0.00001
                                                }
                                                exchangeInfo[element.symbol] = objDb;
                                            }
                                        }
                                    }
                                });
                                return exchangeInfo
                            }
                        }

                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Mexc function:-trade fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'Bitmart':
                    try {
                        let exchangeInfo = {};
                        var config = {
                            method: 'get',
                            url: 'https://api-cloud.bitmart.com/spot/v1/symbols/details',
                            headers: {}
                        };
                        let data = await axios(config)
                        if (data.status == 200) {
                            let symbolData = data.data.data.symbols
                            if (symbolData) {
                                (symbolData).map(element => {
                                    if (element.trade_status == 'trading') {
                                        if ((totalPairs).includes(element.base_currency) && (totalPairs).includes(element.quote_currency)) {
                                            if (element.quote_currency == "BTC" || element.quote_currency == "ETH" || element.quote_currency == "USDT") {
                                                let objDb = {
                                                    symbol: element.symbol,
                                                    tradingPair: element.base_currency + element.quote_currency,
                                                    base: element.base_currency,
                                                    quote: element.quote_currency,
                                                    maxPrecision: element.price_max_precision,
                                                    minPrecision: element.price_min_precision,
                                                    basePrecision: 0,
                                                    quotePrecision: 0,
                                                    buySellAmount: element.min_buy_amount,
                                                    minSellAmount: element.min_sell_amount,
                                                    minQty: element.base_min_size,
                                                    maxQty: element.quote_increment,
                                                    minNotional: element.base_min_size,
                                                    tradefee: 0.1
                                                }
                                                exchangeInfo[objDb.tradingPair] = objDb;
                                            }
                                        }
                                    }
                                });
                                return exchangeInfo
                            }
                        }

                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Bitmart function:-trade fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'Gemini':
                    try {
                        let exchangeInfo = {};
                        // let exchange1 = await exchangeData({ exchangeName: 'Gemini', status: "ACTIVE" });
                        // console.log("===============================>>>sdbfdsfj",exchange1)
                        // if (exchange1.tickers) {
                        //     for (let [token, info] of Object.entries(exchange1.tickers)) {
                        //         const decimalCount = num => {
                        //             const numStr = String(num);
                        //             if (numStr.includes('.')) {
                        //                 return numStr.split('.')[1].length;
                        //             }
                        //         }
                        //         const response = await geminiFunction(`https://api.gemini.com/v1/symbols/details/${token.toLowerCase()}`)
                        //         if (response.status == true) {
                        //             let pricePrecision = decimalCount(response.data["quote_increment"]);
                        //             let basePrecision = decimalCount(response.data["min_order_size"]);
                        //             console.log("response.dataresponse.dataresponse.dataresponse.data",response.data)
                        //             let objDb = {
                        //                 "symbol": token,
                        //                 tradingPair: response.data["base_currency"] + response.data["quote_currency"],
                        //                 "base": response.data["base_currency"],
                        //                 "quote": response.data["quote_currency"],
                        //                 "tradefee": 0.2,
                        //                 "quotePrecision": pricePrecision,
                        //                 "basePrecision": basePrecision,
                        //                 "minPrecision": basePrecision
                        //             }
                        //             exchangeInfo[objDb.tradingPair] = objDb;
                        //         }
                        //     }
                        //     return exchangeInfo;
                        // }
                        var config = {
                            method: 'get',
                            url: `https://api.gemini.com/v1/symbols`,
                            headers: {}
                        };
                        let getallSymbol = await axios(config)
                        if (getallSymbol.status == 200) {
                            let GeminiSymbols = getallSymbol.data
                            if (GeminiSymbols) {
                                let pairs = {}
                                for (let sym of GeminiSymbols) {
                                    let cSym = sym.toUpperCase()
                                    for (let cp of totalPairs) {
                                        let base, quote;
                                        if (cSym.startsWith(cp) && (['BTC', 'ETH', 'USDT']).includes(cSym.replace(cp, ''))) {
                                            quote = cSym.replace(cp, '')
                                            base = cSym.replace(quote, '')
                                            pairs[base + quote] = {
                                                base: base,
                                                quote: quote
                                            }
                                        }
                                    }
                                }
                                for (let token of Object.keys(pairs)) {
                                    const decimalCount = num => {
                                        const numStr = String(num);
                                        if (numStr.includes('.')) {
                                            return numStr.split('.')[1].length;
                                        }
                                    }
                                    var config = {
                                        method: 'get',
                                        url: `https://api.gemini.com/v1/symbols/details/${token.toLowerCase()}`,
                                        headers: {}
                                    };
                                    let getallSymbolDetails = await axios(config)
                                    if (getallSymbolDetails.status == 200) {
                                        if (getallSymbolDetails.data.status == "open") {
                                            let pricePrecision = decimalCount(parseFloat(getallSymbolDetails.data["quote_increment"]).toFixed(10));
                                            let basePrecision = decimalCount(parseFloat(getallSymbolDetails.data["min_order_size"]).toFixed(10));
                                            let objDb = {
                                                "symbol": token,
                                                tradingPair: getallSymbolDetails.data["base_currency"] + getallSymbolDetails.data["quote_currency"],
                                                "base": getallSymbolDetails.data["base_currency"],
                                                "quote": getallSymbolDetails.data["quote_currency"],
                                                "tradefee": 0.4,
                                                "quotePrecision": pricePrecision,
                                                "basePrecision": basePrecision,
                                                "minPrecision": basePrecision
                                            }
                                            exchangeInfo[objDb.tradingPair] = objDb;
                                        }
                                    }
                                }
                                return exchangeInfo
                            }
                        }

                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Gemini function:-trade fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'Gateio':
                    try {
                        let exchangeInfo = {}
                        var config = {
                            method: 'get',
                            url: 'https://api.gateio.ws/api/v4/spot/currency_pairs',
                            headers: {}
                        };

                        let respone = await axios(config)
                        if (respone.status == 200) {
                            let symbolData = respone.data
                            symbolData.map(element => {
                                if (element.trade_status == "tradable") {
                                    if ((currencyPairs.currencyPairs).includes(element.base) && ["BTC", "ETH", "USDT"].includes(element.quote)) {
                                        let objDb = {
                                            symbol: element.id,
                                            tradingPair: element.base + element.quote,
                                            base: element.base,
                                            quote: element.quote,
                                            maxQty: element.max_base_amount || 1000,
                                            maxPrecision: element.amount_precision,
                                            minPrecision: element.min_base_amount,
                                            basePrecision: element.amount_precision,
                                            quotePrecision: element.precision,
                                            minNotional: element.min_base_amount,
                                            tradefee: parseFloat(element.fee)
                                        }
                                        exchangeInfo[objDb.tradingPair] = objDb;
                                    }
                                }
                            })
                            return exchangeInfo
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Gateio function:-trade fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'HitBTC':
                    try {
                        let exchangeInfo = {}
                        var config = {
                            method: 'get',
                            url: 'https://api.hitbtc.com/api/3/public/symbol',
                            headers: {}
                        };
                        let responce = await axios(config)
                        if (responce.status == 200) {
                            Object.keys(responce.data).map(key => {
                                if (responce.data[key].status == "working") {
                                    if ((currencyPairs.currencyPairs).includes(responce.data[key].base_currency) && ["BTC", "ETH", "USDT"].includes(responce.data[key].quote_currency)) {
                                        let objDb = {
                                            symbol: key,
                                            tradingPair: responce.data[key].base_currency + responce.data[key].quote_currency,
                                            base: responce.data[key].base_currency,
                                            quote: responce.data[key].quote_currency,
                                            basePrecision: responce.data[key].quantity_increment,
                                            quotePrecision: responce.data[key].tick_size,
                                            minNotional: 0.0001,
                                            tradefee: 0.27
                                        }
                                        exchangeInfo[objDb.symbol] = objDb;
                                    }
                                }
                            })
                            return exchangeInfo
                        }

                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Hitbtc function:-trade fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
            }
        } catch (error) {
            console.log('get_tradeFee==> 351 >>>', error.msg)
        }
    },
    withdraw_delisted: async (exchange) => {
        try {
            let totalPairs = currencyPairs.currencyPairs
            let fee = {}
            switch (exchange) {
                case 'Binance':
                    try {
                        let apiData = await coonecteExchange.findOne({ uid: "binance", status: 'ACTIVE' })
                        if (apiData) {
                            let time1 = await axios({
                                method: 'get',
                                url: 'https://api4.binance.com/api/v3/time'
                            })
                            const serverTime1 = time1.data.serverTime;
                            function generate_signature1(serverTime1) {
                                const message = `timestamp=` + serverTime1
                                return crypto.createHmac('sha256', apiData.secretKey).update(message).digest('hex');
                            }
                            let sec1 = generate_signature1(serverTime1)
                            let string1 = `timestamp=` + serverTime1;

                            var config1 = {
                                method: 'get',
                                url: "https://api4.binance.com/sapi/v1/capital/config/getall?" + string1 + "&signature=" + sec1,
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'X-MBX-APIKEY': apiData.apiKey,
                                }
                            };
                            let result1 = await axios(config1)
                            if (result1.status == 200) {
                                for (let info of result1.data) {
                                    if ((totalPairs).includes(info.coin)) {
                                        let filterNework = info.networkList.filter(d =>
                                            d.depositEnable == true && d.withdrawEnable == true && d.isDefault == true
                                        )
                                        if (filterNework.length != 0) {
                                            let network = filterNework[0]
                                            if (network) {
                                                let obj = {
                                                    base: info.coin,
                                                    deposit: network.depositEnable,
                                                    withdraw: network.withdrawEnable,
                                                    minimumwithdrawal: network.withdrawMin,
                                                    withdrawFee: network.withdrawFee
                                                }

                                                fee[info.coin] = obj;
                                            }
                                        }
                                    }
                                }

                                return fee;
                            }
                        } else {
                            console.log("Exchange not connected")
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Binance function:-withdrawal fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break
                case 'Coinbase':
                    try {
                        let fee = {}
                        let apiData = await coonecteExchange.findOne({ uid: "coinbase", status: 'ACTIVE' })
                        if (apiData) {
                            let withdrawAddressRes = await findWithdrawAddress({ exchangeName: "Coinbase" })
                            if (withdrawAddressRes) {
                                if (withdrawAddressRes.address.length != 0) {
                                    for (let addressObj of withdrawAddressRes.address) {
                                        const apiEndpoint = `https://api.exchange.coinbase.com`;
                                        const requestPath = `/withdrawals/fee-estimate?crypto_address=${addressObj.address}&currency=${addressObj.coinName}&Network=${addressObj.network}`
                                        const timestamp = Math.floor(Date.now() / 1000);
                                        const prehashString = timestamp + 'GET' + requestPath;
                                        const signature = crypto.createHmac('sha256', Buffer.from(apiData.secretKey, 'base64')).update(prehashString).digest('base64');
                                        const headers = {
                                            'CB-ACCESS-KEY': apiData.apiKey,
                                            'CB-ACCESS-SIGN': signature,
                                            'CB-ACCESS-TIMESTAMP': timestamp,
                                            'CB-ACCESS-PASSPHRASE': apiData.passphrase,
                                            'Content-Type': 'application/json',
                                        };
                                        const response = await axios.get(apiEndpoint + requestPath, { headers });
                                        if (response.status == 200) {
                                            let obj = {
                                                base: addressObj.coinName,
                                                withdrawFee: Number(response.data.fee)
                                            }

                                            fee[addressObj.coinName] = obj;
                                        }
                                    }
                                    return fee;
                                }
                            }
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Coinbase function:-withdrawal fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case 'Huobi':
                    try {
                        let exchange = await exchangeData({ exchangeName: 'Huobi', status: "ACTIVE" });
                        let fee = {}
                        let coins = exchange.coins
                        const withdrawFee = await HuobiGlobal.getRefCurrency('f3ae780f-df3f4d14-465f198d-84619')
                        if (withdrawFee)
                            for (let asset of withdrawFee) {
                                let wfee = 0, minWithdraw = 0, network;
                                for (let chain of asset.chains) {
                                    if (addressdata[(asset.currency).toUpperCase()]) {
                                        if (addressdata[(asset.currency).toUpperCase()].displayName == chain.displayName) {
                                            let obj = {
                                                "base": (asset.currency).toUpperCase(),
                                                "deposit": true,
                                                "withdraw": true,
                                                "minimumwithdrawal": chain.minWithdrawAmt,
                                                "withdrawFee": chain.transactFeeWithdraw,
                                                "chain": (chain.displayName).toUpperCase(),
                                                "displayName": (chain.displayName).toUpperCase(),
                                                "fullName": chain.fullName
                                            }
                                            fee[(asset.currency).toUpperCase()] = obj
                                        }
                                    }
                                }
                            }
                        // console.log(fee);
                        return fee
                    } catch (error) { console.log('Huobi Withdrawfee catch 1111 ==>', error.message) }
                    break
                case 'Kraken':
                    // let exchange = await coonecteExchange.findOne({ uid: "kraken", status: 'ACTIVE' })
                    // if (exchange) {
                    //     let exchange1 = await exchangeData({ exchangeName: 'Kraken', status: "ACTIVE" });
                    //     if(exchange1){
                    //         for (let i = 0; i < exchange1.coins.length; i++) {
                    //             let options = {
                    //                 key: exchange.apiKey,
                    //                 secret: exchange.secretKey,
                    //                 gennonce: () => Date.now() * 1000,
                    //                 timeoutMs: 10000
                    //             }
                    //             const krakenClient = new Kraken(options);
                    //             let withdrawRequest = {
                    //                 asset:'SHIB',
                    //                 amount:1,
                    //                 key:'SHIB'+'_Coinbase'
                    //             }
                    //             console.log("jsdkjfksdjfksdjfksdjfkjsdkfjsdkf",withdrawRequest)
                    //             await krakenClient.withdrawInfo(withdrawRequest)
                    //             .then(async (response) =>{
                    //                 console.log("result", response)
                    //                 let obj={
                    //                     base: exchange1.coins[i],
                    //                     withdrawFee: Number(response.fee),
                    //                     amount:Number(response.amount)
                    //                 }
                    //                 fee[exchange1.coins[i]] = obj;
                    //             })
                    //         }
                    //     }
                    //     console.log("sdfksdkfjsdkfjksdjfksdjfksdjfksdjfksdjfksdjfksdfjksdfj",fee)
                    //     return fee;
                    // }
                    return currencyPairs.withdrawalFee.Kraken
                    break
                case 'Mexc':
                    try {
                        let apiData = await coonecteExchange.findOne({ uid: "mexc", status: 'ACTIVE' })
                        if (apiData) {
                            let time1 = await axios({
                                method: 'get',
                                url: 'https://api.mexc.com/api/v3/time'
                            })
                            const serverTime1 = time1.data.serverTime;
                            function generate_signature1(serverTime1) {
                                const message = `timestamp=` + serverTime1;
                                return crypto.createHmac('sha256', apiData.secretKey).update(message).digest('hex');
                            }
                            let sec1 = generate_signature1(serverTime1)
                            let string1 = `timestamp=` + serverTime1;
                            var config1 = {
                                method: 'get',
                                url: "https://api.mexc.com/api/v3/capital/config/getall?" + string1 + "&signature=" + sec1,
                                headers: {
                                    // 'Content-Type': 'application/x-www-form-urlencoded',
                                    'X-MEXC-APIKEY': apiData.apiKey,
                                }
                            };
                            let result1 = await axios(config1)
                            if (result1.status == 200) {
                                for (let info of result1.data) {
                                    if ((totalPairs).includes(info.coin)) {
                                        let obj
                                        let infoFull
                                        if (info.coin == "USDT") {
                                            infoFull = info.networkList.filter(d =>
                                                d.coin == info.coin && d.withdrawEnable == true && d.depositEnable == true && d.network.includes('ERC20')
                                            )
                                        } else {
                                            infoFull = info.networkList.filter(d =>
                                                d.coin == info.coin && d.withdrawEnable == true && d.depositEnable == true
                                            )
                                        }
                                        if (infoFull.length != 0) {
                                            obj = {
                                                base: infoFull[0].coin,
                                                deposit: infoFull[0].depositEnable,
                                                withdraw: infoFull[0].withdrawEnable,
                                                minimumwithdrawal: infoFull[0].withdrawMin,
                                                withdrawFee: infoFull[0].withdrawFee
                                            }

                                            fee[infoFull[0].coin] = obj;
                                        }
                                        // for (let infoFull of info.networkList) {
                                        //     // console.log(info, 1185)
                                        //     let obj
                                        //     if ("SUSHI" == infoFull.coin && 'SOL' != infoFull.network) {
                                        //         obj = {
                                        //             base: infoFull.coin,
                                        //             deposit: infoFull.depositEnable,
                                        //             withdraw: infoFull.withdrawEnable,
                                        //             minimumwithdrawal: infoFull.withdrawMin,
                                        //             withdrawFee: infoFull.withdrawFee
                                        //         }

                                        //         fee[infoFull.coin] = obj;
                                        //     } else if ("SUSHI" != infoFull.coin) {
                                        //         obj = {
                                        //             base: infoFull.coin,
                                        //             deposit: infoFull.depositEnable,
                                        //             withdraw: infoFull.withdrawEnable,
                                        //             minimumwithdrawal: infoFull.withdrawMin,
                                        //             withdrawFee: infoFull.withdrawFee
                                        //         }

                                        //         fee[infoFull.coin] = obj;
                                        //     }
                                        // }
                                    }
                                }
                                return fee;
                            }

                        } else {
                            console.log("Exchange not connected")
                        }
                    }
                    catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Mexc function:-withdrawal fee]:', errorMessage, new Date().toLocaleString())
                        return { status: false }
                    }
                    break;
                case 'Bitmart':
                    // return currencyPairs.withdrawalFee.Bitmart
                    try {
                        // return currencyPairs.withdrawalFee.Bitmart
                        let apiData = await coonecteExchange.findOne({ uid: "bitmart", status: 'ACTIVE' })
                        let fee = {};
                        if (apiData) {
                            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
                            for (let i = 0; i < totalPairs.length; i++) {
                                // console.log("==================================<>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",totalPairs[i])
                                let details = await getWithdrawDetails(totalPairs[i], apiData.apiKey)
                                if (details.status == true) {
                                    let obj = {
                                        base: totalPairs[i],
                                        minWithdraw: details.data.data.data.min_withdraw,
                                        withdrawFee: details.data.data.data.withdraw_fee
                                    }
                                    fee[totalPairs[i]] = obj;
                                } else {
                                    continue
                                }
                                await sleep(5000);
                            }
                            return fee;
                        } else {
                            console.log("Exchange not connected")
                        }

                    } catch (error) {
                        console.log('Bitmart Withdrawfee catch 425 ==>', error)
                    }
                    break;
                case "Gateio":
                    try {
                        let apiData = await coonecteExchange.findOne({ uid: "gateio", status: 'ACTIVE' })
                        if (apiData) {
                            const host = "https://api.gateio.ws";
                            const prefix = "/api/v4";
                            const commonHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
                            const url = '/wallet/withdraw_status';
                            const body = {};
                            const requestContent = JSON.stringify(body);
                            const signature = await gateioSignature.signatureGenerate("GET", prefix + url, '', '', apiData.apiKey, apiData.secretKey)
                            const headers = { ...commonHeaders, ...signature };
                            const responce = await axios.get(host + prefix + url, { headers });
                            if (responce.status == 200) {
                                let data = responce.data
                                for (let info of data) {
                                    if ((currencyPairs.currencyPairs).includes(info.currency)) {
                                        let networkValue = info.withdraw_fix
                                        if (info["withdraw_fix_on_chains"]) {
                                            networkValue = Object.values(info["withdraw_fix_on_chains"])[0]
                                            if (info["withdraw_fix_on_chains"]["ETH"]) {
                                                networkValue = info["withdraw_fix_on_chains"]["ETH"]
                                            }
                                        }
                                        let obj = {
                                            base: info.currency,
                                            minimumwithdrawal: info.withdraw_amount_mini,
                                            withdrawFee: networkValue
                                        }
                                        fee[info.currency] = obj;
                                    }
                                }
                                return fee
                            }
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Gateio function:-withdrawal fee]:', errorMessage, new Date().toLocaleString())
                    }
                    break;
                case "HitBTC":
                    try {
                        let apiData = await coonecteExchange.findOne({ uid: "hitbtc", status: 'ACTIVE' })
                        let coins = (await exchangeModel.findOne({ exchangeName: "HitBTC", status: "ACTIVE" }).select(['coins'])).coins;
                        var config = {
                            method: 'get',
                            url: `https://api.hitbtc.com/api/3/public/currency`,
                            headers: {},
                        };
                        let getNetworkCode = await axios(config)
                        let networkFunction
                        if (getNetworkCode.status == 200) {
                            networkFunction = () => {
                                let result = {}; // Create an empty object to hold the result
                                Object.keys(getNetworkCode.data).forEach((key) => {
                                    if (getNetworkCode.data[key].delisted === false) {
                                        let validNetworks = getNetworkCode.data[key].networks.filter(network => network.payin_enabled === true && network.payout_enabled === true && network.default === true);
                                        if (validNetworks.length > 0) {
                                            validNetworks.forEach(network => {
                                                result[key] = { network: network.network };
                                            });
                                        }
                                    }
                                });
                                return result
                            }

                        }
                        let allNetwork = networkFunction()
                        if (apiData && coins && allNetwork) {
                            let coinData = []
                            coins.map(key => {
                                if (allNetwork[key]) {
                                    let obj = {
                                        amount: '1',
                                        currency: key,
                                        network_code: allNetwork[key].network

                                    }
                                    coinData.push(obj)
                                }
                            })
                            var data = JSON.stringify(coinData);
                            const credentials = Buffer.from(apiData.apiKey + ':' + apiData.secretKey).toString('base64');
                            var config = {
                                method: 'post',
                                url: `https://api.hitbtc.com/api/3/wallet/crypto/fees/estimate`,
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                    'Authorization': 'Basic ' + credentials
                                },
                                data: data
                            };
                            let hitbtcWithdraw = await axios(config)
                            if (hitbtcWithdraw.status = 200) {
                                for (let info of hitbtcWithdraw.data) {
                                    let obj = {
                                        base: info.currency,
                                        minimumwithdrawal: 0,
                                        withdrawFee: info.fee
                                    }
                                    fee[info.currency] = obj;
                                }
                                return fee
                            }
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [HitBTC function:-withdrawal fee]:', errorMessage, new Date().toLocaleString());
                    }
                    break;
            }
        } catch (error) {
            console.log('withdraw_delisted==> 1028 >>>', error)
        }
    },
    get_coins: async (exchange) => {
        try {
            let tickers = {}, coins = [];
            let totalPairs = currencyPairs.currencyPairs
            switch (exchange) {
                case 'Binance':
                    // let coins = [];
                    try {
                        tickers = await exchangeModel.findOne({ exchangeName: "Binance" });
                        if (tickers) {
                            for (let [sym, info] of Object.entries(tickers.tickers)) {
                                if ((totalPairs).includes(info.base)) {
                                    if (info.quote == "USDT" || info.quote == "BTC" || info.quote == "ETH") {
                                        if (!coins.includes(info.base)) {
                                            coins.push(info.base);
                                        }
                                    }
                                }
                            }
                            coins.push('USDT', 'USD');
                            coins.sort();
                            // console.log(coins)
                            return coins;
                        }
                    } catch (error) {
                        console.log(error)
                    }
                    break;
                case 'Coinbase':
                    try {
                        tickers = await exchangeModel.findOne({ exchangeName: "Coinbase" });
                        if (tickers) {
                            for (let [sym, info] of Object.entries(tickers.tickers)) {
                                if ((totalPairs).includes(info.base)) {
                                    if (info.quote == "USDT" || info.quote == "BTC" || info.quote == "ETH") {
                                        if (!coins.includes(info.base)) {
                                            coins.push(info.base);
                                        }
                                    }
                                }
                            }
                            coins.push('USDT', 'USD');
                            coins.sort();
                            return coins;
                        }
                    } catch (error) {
                        console.log(error)
                    }
                    break;
                case 'Huobi':
                    try {
                        tickers = await exchangeModel.findOne({ exchangeName: "Huobi" });
                        if (tickers) {
                            for (let [sym, info] of Object.entries(tickers.tickers)) {
                                if ((totalPairs).includes(info.base)) {
                                    if (info.quote == "USDT" || info.quote == "BTC" || info.quote == "ETH") {
                                        if (!coins.includes(info.base)) {
                                            coins.push(info.base);
                                        }
                                    }
                                }
                            }
                            coins.push('USDT', 'USD');
                            coins.sort();
                            // console.log(coins)
                            return coins;
                        }
                    } catch (error) {
                        console.log(error)
                    }
                    break;
                case 'Kraken':
                    try {
                        tickers = await exchangeModel.findOne({ exchangeName: "Kraken" });
                        if (tickers) {
                            for (let [sym, info] of Object.entries(tickers.tickers)) {
                                if ((totalPairs).includes(info.base)) {
                                    if (info.quote == "USDT" || info.quote == "BTC" || info.quote == "ETH") {
                                        if (!coins.includes(info.base)) {
                                            coins.push(info.base);
                                        }
                                    }
                                }
                            }
                            coins.push('USDT', 'USD');
                            coins.sort();
                            // console.log(coins)
                            return coins;
                        }
                    } catch (error) {
                        console.log(error)
                    }
                    break;
                case 'Mexc':
                    try {
                        tickers = await exchangeModel.findOne({ exchangeName: "Mexc" });
                        if (tickers) {
                            for (let [sym, info] of Object.entries(tickers.tickers)) {
                                if ((totalPairs).includes(info.base)) {
                                    if (info.quote == "USDT" || info.quote == "BTC" || info.quote == "ETH") {
                                        if (!coins.includes(info.base)) {
                                            coins.push(info.base);
                                        }
                                    }
                                }
                            }
                            coins.push('USDT', 'USD');
                            coins.sort();
                            // console.log(coins)
                            return coins;
                        }
                    } catch (error) {
                        console.log(error)
                    }
                    break;
                case 'Bitmart':
                    try {
                        tickers = await exchangeModel.findOne({ exchangeName: "Bitmart" });
                        if (tickers) {
                            for (let [sym, info] of Object.entries(tickers.tickers)) {
                                if ((totalPairs).includes(info.base)) {
                                    if (info.quote == "USDT" || info.quote == "BTC" || info.quote == "ETH") {
                                        if (!coins.includes(info.base)) {
                                            coins.push(info.base);
                                        }
                                    }
                                }
                            }
                            coins.push('USDT', 'USD');
                            coins.sort();
                            // console.log(coins)
                            return coins;
                        }
                    } catch (error) {
                        console.log(error)
                    }
                    break;
                case 'Gemini':
                    try {
                        tickers = await exchangeModel.findOne({ exchangeName: "Gemini" });
                        if (tickers) {
                            for (let [sym, info] of Object.entries(tickers.tickers)) {
                                if ((totalPairs).includes(info.base)) {
                                    if (info.quote == "USD" || info.quote == "BTC" || info.quote == "ETH") {
                                        if (!coins.includes(info.base)) {
                                            coins.push(info.base);
                                        }
                                    }
                                }
                            }
                            coins.push('USD');
                            coins.sort();
                            return coins;
                        }
                    } catch (error) {
                        console.log(error)
                    }
                    break;
                case 'Gateio':
                    try {
                        tickers = await exchangeModel.findOne({ exchangeName: "Gateio" });
                        if (tickers) {
                            for (let [sym, info] of Object.entries(tickers.tickers)) {
                                if ((currencyPairs.currencyPairs).includes(info.base)) {
                                    if (info.quote == "USDT" || info.quote == "BTC" || info.quote == "ETH") {
                                        if (!coins.includes(info.base)) {
                                            coins.push(info.base);
                                        }
                                    }
                                }
                            }
                            coins.push('USDT');
                            coins.sort();
                            // console.log(coins)
                            return coins;
                        }
                    } catch (error) {
                        console.log(error)
                    }
                    break;
                case 'HitBTC':
                    try {
                        tickers = await exchangeModel.findOne({ exchangeName: "HitBTC" });
                        if (tickers) {
                            for (let [sym, info] of Object.entries(tickers.tickers)) {
                                if ((currencyPairs.currencyPairs).includes(info.base)) {
                                    if (info.quote == "USDT" || info.quote == "BTC" || info.quote == "ETH") {
                                        if (!coins.includes(info.base)) {
                                            coins.push(info.base);
                                        }
                                    }
                                }
                            }
                            coins.push('USDT');
                            coins.sort();
                            // console.log(coins)
                            return coins;
                        }
                    } catch (error) {
                        console.log(error)
                    }
                    break;
            }
        } catch (error) {
            console.log('get_coins==> 1092 >>>', error)
        }
    },

    makerTicker_fee: async (exchange) => {
        try {
            let fee = {}
            let totalPairs = currencyPairs.currencyPairs
            console.log("makerTicker_fee=====>>>", totalPairs)
            switch (exchange) {
                case 'Binance':
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Binance", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            let apiData = await coonecteExchange.findOne({ uid: "binance", status: 'ACTIVE' })
                            if (apiData) {
                                let time1 = await axios({
                                    method: 'get',
                                    url: 'https://api4.binance.com/api/v3/time'
                                })
                                const serverTime1 = time1.data.serverTime;
                                function generate_signature1(serverTime1) {
                                    const message = `timestamp=` + serverTime1
                                    return crypto.createHmac('sha256', apiData.secretKey).update(message).digest('hex');
                                }
                                let sec1 = generate_signature1(serverTime1)
                                let string1 = `timestamp=` + serverTime1;

                                var config1 = {
                                    method: 'get',
                                    url: "https://api4.binance.com/sapi/v1/asset/tradeFee?" + string1 + "&signature=" + sec1,
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'X-MBX-APIKEY': apiData.apiKey,
                                    }
                                };
                                let result1 = await axios(config1)
                                if (result1.status == 200) {
                                    // console.log("makerTaker fee", result1.data)
                                    for (let info of result1.data) {
                                        if (tradefee[info.symbol]) {
                                            if ((totalPairs).includes(tradefee[info.symbol].base)) {
                                                let obj = {
                                                    symbol: info.symbol,
                                                    makerCommission: info.makerCommission,
                                                    takerCommission: info.takerCommission
                                                }

                                                fee[info.symbol] = obj;
                                            }
                                        }
                                    }
                                    // console.log("sdfjsdkfjksdjfksdjfksdjfksdjfksdjfksdjfksdjkfsdjkf", fee)
                                    return fee;
                                }
                            } else {
                                console.log("Exchange not connected 781")
                            }
                        }
                    } catch (error) {
                        console.log('Binance makerTakar fee catch 783 ==>', error)
                    }
                    break
            }
        } catch (error) {
            console.log('Maker_Taker fee==> 1028 >>>', error)
        }
    },
    getPair: async (exchange) => {
        try {
            let totalPairs = currencyPairs.currencyPairs
            let exchangeInfo = [];
            switch (exchange) {
                case 'Mexc':
                    try {
                        var config = {
                            method: 'get',
                            url: 'https://api.mexc.com/api/v3/exchangeInfo',
                            headers: {}
                        };
                        let data = await axios(config)
                        if (data.status == 200) {
                            let symbolData = data.data.symbols
                            if (symbolData) {
                                (symbolData).map(element => {
                                    let mexcStatus = ['ENABLED', '1', 'online']
                                    if (mexcStatus.includes(element.status) && element.isSpotTradingAllowed == true) {
                                        if ((totalPairs).includes(element.baseAsset) && (totalPairs).includes(element.quoteAsset)) {
                                            if (element.quoteAsset == "BTC" || element.quoteAsset == "ETH" || element.quoteAsset == "USDT") {
                                                exchangeInfo.push(element.baseAsset + '/' + element.quoteAsset)
                                            }
                                        }
                                    }
                                });
                                return exchangeInfo
                            }
                        }
                    } catch (error) {
                        let errorMessage = error;
                        if (error.response) {
                            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
                        } else if (error.request) {
                            errorMessage = 'No response received from server. Please check your network connection.';
                        } else {
                            errorMessage = `Error: ${error.message}`;
                        }
                        console.error('Error occurred [Mexc function:-pairs]:', errorMessage, new Date().toLocaleString());
                    }
                    break;
            }
        } catch (error) {
            console.log('get_pair==> 631 >>>', error)
        }
    },
}


async function geminiFunction(endPoint) {
    try {
        var config = {
            method: 'get',
            url: endPoint,
            headers: {}
        };
        let geminiTickers = await axios(config)
        if (geminiTickers.status == 200) {
            let obj = {
                status: true,
                data: geminiTickers.data
            }
            return obj
        } else {
            let errorObj = {
                status: false,
                data: []
            }
            return errorObj
        }
    } catch (error) {
        console.log("gemini function error", error)
        let errorObj = {
            status: false,
            data: []
        }
        return errorObj
    }

}


async function getWithdrawalFee() {
    try {
        const payload = {
            request: '/v1/notionalvolume',
            nonce: Math.floor(Date.now() / 1000)
        };

        const payloadStr = JSON.stringify(payload);
        const b64 = base64.encode(payloadStr);
        const signature = crypto.createHmac('sha384', 'Pa9UL4xiz9suGzjHxDBrimafy4g').update(b64).digest('hex');
        var config = {
            method: 'post',
            url: 'https://api.gemini.com/v1/notionalvolume',
            headers: {
                'X-GEMINI-APIKEY': 'master-GHjXWUYggt88cZmA4QSb',
                'X-GEMINI-SIGNATURE': signature,
                'X-GEMINI-PAYLOAD': b64,
            }
        };

        let responseData = await axios(config)
        if (responseData.status == 200) {
            console.log('================================<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>', responseData.data)
        }
    } catch (error) {
        console.error('Error fetching withdrawal fee:', error);
    }
}
async function getWithdrawDetails(coin, apiKey) {

    try {
        var config = {
            method: 'get',
            url: `https://api-cloud.bitmart.com/account/v1/withdraw/charge?currency=${coin}`,
            headers: { 'X-BM-KEY': apiKey }
        };

        let data = await axios(config)
        if (data.status == 200) {
            // console.log("============================>>>>>>>>>>>>>>>>><<<<<",data.data)
            return { status: true, data: data };
        }
    } catch (error) {
        let errorMessage = error;
        if (error.response) {
            errorMessage = `Error: ${error.response.status} - ${error.response.data.message}`;
        } else if (error.request) {
            errorMessage = 'No response received from server. Please check your network connection.';
        } else {
            errorMessage = `Error: ${error.message}`;
        }
        console.error('Error occurred [Bitmart function:-withdrawal fee]:', errorMessage, new Date().toLocaleString());
        return { status: false, data: '' }
    }

}
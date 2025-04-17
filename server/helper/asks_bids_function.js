import config from "config";
import Binance from 'node-binance-us-api';
const B_client = new Binance({});
import util from 'util';
import request from 'request';
// import crypto from 'crypto';
import { Kraken } from 'node-kraken-api';
let options = {
    gennonce: () => Date.now() * 1000,
    timeoutMs: 10000
}
const krakenClient = new Kraken(options);
const requestPromise = util.promisify(request);
// import Cexio from 'cexio-api-node';
import Coinbase from 'coinbase-pro';
const publicClient = new Coinbase.PublicClient();
const axios = require('axios');
import exchangeModel from "../models/exchange"


module.exports = {
    asks_bids: async (exchange, symbol1, symbol2, type) => {
        try {
            switch (exchange) {
                case 'Binance':
                    try {
                        let symbol = (symbol1.toUpperCase()) + (symbol2.toUpperCase())
                        let asksBids = await B_client.depth(symbol);
                        if (type == 'buy') {
                            return Object.entries(asksBids.bids)
                        } else {
                            return Object.entries(asksBids.asks)
                        }
                    } catch (error) {
                        console.log('Binance asks_bids catch error :', error);
                    }
                    break;
                case 'Huobi':
                    try {
                        let params = (symbol1.toLowerCase()) + (symbol2.toLowerCase())
                        let asksBids = await Huobi.depth(params);
                        if (type == 'buy') {
                            return JSON.parse(asksBids).tick.bids
                        } else {
                            return JSON.parse(asksBids).tick.asks
                        }
                    } catch (error) {
                        console.log('Huobi asks_bids catch error :', error)
                    }
                    break;
                case 'Kraken':
                    try {
                        let params = { pair: (symbol1.toUpperCase()) + (symbol2.toUpperCase()) }
                        let asksBids = await krakenClient.depth(params);
                        let name = (symbol1.toUpperCase()) + (symbol2.toUpperCase())
                        if (type == 'buy') {
                            return asksBids[name].bids
                        } else {
                            return asksBids[name].asks
                        }
                    } catch (error) {
                        console.log('Kraken asks_bids catch error :', error)
                    }
                    break;
                case 'Coinbase':
                    try {
                        let symbol = (symbol1.toUpperCase()) + '-' + (symbol2.toUpperCase())
                        let asksBids = await publicClient.getProductOrderBook(symbol, { level: 3 });
                        if (type == 'buy') {
                            return asksBids.bids.slice(0, 100)
                        } else {
                            return asksBids.asks.slice(0, 100)
                        }
                    } catch (error) {
                        console.log('Coinbase asks_bids catch error :', error)
                    }
                    break;
                case 'Mexc':
                    try {
                        let symbol = (symbol1.toUpperCase()) + (symbol2.toUpperCase())
                        var config = {
                            method: 'get',
                            url: `https://api.mexc.com/api/v3/depth?symbol=${symbol}&limit=100`,
                            headers: {}
                        };
                        let mexAsksBids = await axios(config)
                        if (mexAsksBids.status == 200) {
                            let asksBids = mexAsksBids.data
                            if (type == 'buy') {
                                return asksBids.bids
                            } else {
                                return asksBids.asks
                            }
                        }
                    } catch (error) {
                        console.log('Mexc asks_bids catch error :', error)
                    }
                    break;
                case 'Bitmart':
                    try {
                        let symbol = (symbol1.toUpperCase()) + '_' + (symbol2.toUpperCase())
                        var config = {
                            method: 'get',
                            url: `https://api-cloud.bitmart.com/spot/v1/symbols/book?symbol=${symbol}&size=20`,
                            headers: {}
                        };
                        let mexAsksBids = await axios(config)
                        if (mexAsksBids.status == 200) {
                            let asksBids = mexAsksBids.data.data
                            if (type == 'buy') {
                                let bidData = asksBids.buys.map(({ price, total }) => ({ price, total }));
                                let result = bidData.map(obj => Object.values(obj))
                                return result
                            } else {
                                let askData = asksBids.sells.map(({ price, total }) => ({ price, total }));
                                let result = askData.map(obj => Object.values(obj))
                                return result
                            }
                        }
                    } catch (error) {
                        console.log('Bitmart asks_bids catch error :', error)
                    }
                    break;
                case 'Gateio':
                    try {
                        let symbol = (symbol1.toUpperCase()) + '_' + (symbol2.toUpperCase())
                        var config = {
                            method: 'get',
                            url: `https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${symbol}`,
                            headers: {}
                        };
                        let gateioAsksBids = await axios(config)
                        if (gateioAsksBids.status == 200) {
                            let asksBids = gateioAsksBids.data
                            if (type == 'buy') {
                                return asksBids.bids
                            } else {
                                return asksBids.asks
                            }
                        }
                    } catch (error) {
                        console.log('Gateio asks_bids catch error :', error)
                    }
                    break;
                case 'HitBTC':
                    try {
                        let symbol = (symbol1.toUpperCase()) + (symbol2.toUpperCase())
                        var config = {
                            method: 'get',
                            url: `https://api.hitbtc.com/api/3/public/orderbook?symbols=${symbol}`,
                            headers: {}
                        };
                        let gateioAsksBids = await axios(config)
                        if (gateioAsksBids.status == 200) {
                            let asksBids = gateioAsksBids.data[symbol]
                            if (type == 'buy') {
                                return asksBids.bid
                            } else {
                                return asksBids.ask
                            }
                        }
                    } catch (error) {
                        console.log('Gateio asks_bids catch error :', error)
                    }
                    break;

            }
        } catch (error) {
            console.log('getAccount Catch ==> 256 -->', error);
        }
    },
    save_ask_bid_data: async (exchange) => {
        try {
            switch (exchange) {
                case 'Binance':
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Binance", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            let dbAskBid = {};
                            for (let token of Object.keys(tradefee)) {
                                var config = {
                                    method: 'get',
                                    url: `https://api.binance.com/api/v3/depth?symbol=${tradefee[token].symbol}&limit=15`,
                                    headers: {}
                                };
                                let data = await axios(config)
                                if (data.status == 200) {
                                    let objDb = {
                                        symbol: tradefee[token].symbol,
                                        asks: data.data.asks,
                                        bids: data.data.bids,
                                    }
                                    dbAskBid[tradefee[token].symbol] = objDb;
                                }
                            }
                            return dbAskBid
                        }
                    } catch (err) {
                        console.log("Binance save_ask_bid_data error", err)
                    }
                    break;
                case 'Mexc':
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Mexc", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            let dbAskBid = {};
                            for (let token of Object.keys(tradefee)) {
                                var config = {
                                    method: 'get',
                                    url: `https://api.mexc.com/api/v3/depth?symbol=${tradefee[token].symbol}&limit=15`,
                                    headers: {}
                                };
                                let mexcAsksBids = await axios(config)
                                if (mexcAsksBids.status == 200) {
                                    let asksBids = mexcAsksBids.data
                                    let objDb = {
                                        symbol: tradefee[token].symbol,
                                        asks: asksBids.asks,
                                        bids: asksBids.bids,
                                    }
                                    dbAskBid[tradefee[token].symbol] = objDb;
                                }
                            }
                            return dbAskBid
                        }
                    } catch (error) {
                        console.log('Mexc asks_bids catch error :', error)
                    }
                    break;
                case 'Kraken':
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Kraken", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            let dbAskBid = {};
                            for (let token of Object.keys(tradefee)) {
                                await new Promise(resolve => setTimeout(resolve, 500))
                                var config = {
                                    method: 'get',
                                    url: `https://api.kraken.com/0/public/Depth?pair=${tradefee[token].symbol}&count=15`,
                                    headers: {}
                                };
                                let krakenAsksBids = await axios(config)
                                if (krakenAsksBids.status == 200) {
                                    let asksBids = krakenAsksBids.data
                                    let objDb = {
                                        symbol: tradefee[token].symbol,
                                        asks: asksBids.result[tradefee[token].symbol].asks.map(item => [item[0], item[1]]),
                                        bids: asksBids.result[tradefee[token].symbol].bids.map(item => [item[0], item[1]]),
                                    }
                                    dbAskBid[tradefee[token].symbol] = objDb;
                                }
                            }
                            return dbAskBid
                        }
                    } catch (error) {
                        console.log('Kraken asks_bids catch error :', error)
                    }
                    break;
                case 'Bitmart':
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Bitmart", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            let dbAskBid = {};
                            for (let token of Object.keys(tradefee)) {
                                await new Promise(resolve => setTimeout(resolve, 500))
                                var config = {
                                    method: 'get',
                                    url: `https://api-cloud.bitmart.com/spot/v1/symbols/book?symbol=${tradefee[token].symbol}&size=15`,
                                    headers: {}
                                };
                                let bitmartAsksBids = await axios(config)
                                if (bitmartAsksBids.status == 200) {
                                    let asksBids = bitmartAsksBids.data.data
                                    let bidData = asksBids.buys.map(({ price, total }) => ({ price, total }));
                                    let askData = asksBids.sells.map(({ price, total }) => ({ price, total }));
                                    let objDb = {
                                        symbol: tradefee[token].symbol,
                                        asks: askData.map(obj => Object.values(obj)),
                                        bids: bidData.map(obj => Object.values(obj)),
                                    }
                                    dbAskBid[tradefee[token].symbol] = objDb;
                                }
                            }
                            return dbAskBid
                        }
                    } catch (error) {
                        console.log('Bitmart asks_bids catch error :', error)
                    }
                    break;
                case 'Gemini':
                    try {
                        let tradefee = (await exchangeModel.findOne({ exchangeName: "Gemini", status: "ACTIVE" }).select(['tradeFee'])).tradeFee;
                        if (tradefee) {
                            let dbAskBid = {};
                            for (let token of Object.keys(tradefee)) {
                                await new Promise(resolve => setTimeout(resolve, 500))
                                var config = {
                                    method: 'get',
                                    url: `https://api.gemini.com/v1/book/${tradefee[token].symbol}?limit_bids=5&limit_asks=5`,
                                    headers: {}
                                };
                                let geminiAsksBids = await axios(config)
                                if (geminiAsksBids.status == 200) {
                                    let askBids = geminiAsksBids.data
                                    let bidData = askBids.bids.map(({ price, amount }) => ({ price, amount }));
                                    let askData = askBids.asks.map(({ price, amount }) => ({ price, amount }));
                                    let objDb = {
                                        symbol: tradefee[token].symbol,
                                        asks: askData.map(obj => Object.values(obj)),
                                        bids: bidData.map(obj => Object.values(obj)),
                                    }
                                    dbAskBid[tradefee[token].symbol] = objDb;
                                }
                            }
                            return dbAskBid
                        }
                    } catch (error) {
                        console.log('Gemini asks_bids catch error :', error)
                    }
                    break;
            }
        } catch (error) {
            console.log("askbids====>>><<<>><><", error)
        }
    },
}
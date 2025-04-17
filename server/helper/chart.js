const WebSocket = require('ws');
const axios = require('axios');
import exchangeModel from "../models/exchange"
module.exports = {
    ohlc: async (exchange, symbol, interval) => {
        try {
            switch (exchange) {
                case 'Binance':
                    try {
                        function subscribeToBinanceOHLC(symbol, interval) {
                            return new Promise((resolve, reject) => {
                                const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`);
                                ws.on('open', () => {
                                    console.log(`Connected to Binance WebSocket for ${symbol} at ${interval} interval.`);
                                });
                                ws.on('message', (data) => {
                                    const klineData = JSON.parse(data);
                                    const { t, o, h, l, c, v, s } = klineData.k;
                                    const ohlcData = { time: t, open: o, high: h, low: l, close: c, volume: v, symbol: s };
                                    resolve(ohlcData);
                                });
                                ws.on('close', () => {
                                    console.log('WebSocket connection closed.');
                                    reject(new Error('WebSocket connection closed.'));
                                });
                                ws.on('error', (error) => {
                                    console.error('WebSocket error:', error);
                                    reject(error);
                                });
                            });
                        }
                        return new Promise(async (resolve, reject) => {
                            const data = await subscribeToBinanceOHLC(symbol, interval)
                            let obj = {
                                time: data.time,
                                open: data.open,
                                high: data.high,
                                low: data.low,
                                close: data.close,
                                volume: data.volume,
                                symbol: data.symbol
                            }
                            let responses = ({ responseCode: 200, responseMessage: "Data found succefully.", responseResult: obj });
                            resolve(responses)
                        })
                    } catch (err) {
                        console.log("Binance ohlc error", err)
                    }
            }
        } catch (error) {
            console.log("ohlc====>>><<<>><><", error)
        }
    },

    // askbids: async (exchange, symbol, limit) => {
    //     try {
    //         switch (exchange) {
    //             case 'Binance':
    //                 try {
    //                     function connectToBinanceWebSocket(symbol, limit) {
    //                         return new Promise((resolve, reject) => {
    //                             const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@depth${limit}`);
    //                             ws.on('open', () => {
    //                                 console.log(`Connected to Binance WebSocket for ${symbol} at ${limit} limit.`);
    //                             });
    //                             ws.on('message', (data) => {
    //                                 const askbidsData = JSON.parse(data);
    //                                 resolve(askbidsData);
    //                             });
    //                             ws.on('close', () => {
    //                                 console.log('WebSocket connection closed.');
    //                                 reject(new Error('WebSocket connection closed.'));
    //                             });
    //                             ws.on('error', (error) => {
    //                                 console.error('WebSocket error:', error);
    //                                 reject(error);
    //                             });
    //                         });
    //                     }
    //                     return new Promise(async (resolve, reject) => {
    //                         const data = await connectToBinanceWebSocket(symbol, limit)
    //                         let responses = ({ responseCode: 200, responseMessage: "Data found succefully.", responseResult: data });
    //                         resolve(responses)
    //                     })
    //                 } catch (err) {
    //                     console.log("Binance askbids error", err)
    //                 }
    //         }
    //     } catch (error) {
    //         console.log("askbids====>>><<<>><><", error)
    //     }
    // },

    marketData: async (exchange, symbol1) => {
        try {
            return new Promise(async (resolve, reject) => {
                let symbol = (symbol1.toUpperCase())
                let tickers = await exchangeModel.findOne({ exchangeName: exchange, status: "ACTIVE" })
                if (!tickers || tickers==null) {
                    let responses = ({ responseCode: 404, responseMessage: "Exchange not found.", responseResult: [] });
                    resolve(responses)
                }
                if(!tickers.tickers){
                    let responses = ({ responseCode: 404, responseMessage: "Pair not found.", responseResult: [] });
                    resolve(responses)
                }
                let data = tickers.tickers[symbol]
                if (!data) {
                    let responses = ({ responseCode: 404, responseMessage: "Pair not found.", responseResult: [] });
                    resolve(responses)
                }
                let responses = ({ responseCode: 200, responseMessage: "Data found succefully.", responseResult: data });
                resolve(responses)
            })
        } catch (err) {
            console.log("Market Data error", err)
        }
    },

}


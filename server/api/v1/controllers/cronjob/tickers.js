const CronJob = require('cron').CronJob;
import { get_tickers } from '../../../../helper/get_tickers';
const exchangeModel = require('../../../../models/exchange');
import config from "config";
// ///////////////////////////
// //start-stop cron-job
let minutes = 2
let binanceTime = Date.now() + minutes * 60 * 1000
let krakenTime = Date.now() + minutes * 60 * 1000
let mexcTime = Date.now() + minutes * 60 * 1000
let bitmartTime = Date.now() + minutes * 60 * 1000
let coinbase = Date.now() + minutes * 60 * 1000
let gateioTime = Date.now() + minutes * 60 * 1000
let hitbtcTime = Date.now() + minutes * 60 * 1000
///////////////   Binance   ///////////////
let binanceCron = new CronJob(config.get('cronTime.tickers'), async function () {
    try {
        binanceCron.stop()
        let binanceExchange = await get_tickers('Binance').then(async (ticker) => {
            if (ticker) {
                let binanceTickerData = await exchangeModel.findOne({ exchangeName: 'Binance', uid: 'binance', status: 'ACTIVE' });
                if (binanceTickerData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: binanceTickerData._id }, { $set: { tickers: ticker } }, { new: true });
                    if (updateTicker) {
                        console.log('Binance Ticker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Binance', uid: 'binance', tickers: ticker }).save();
                    if (createTicker) {
                        console.log('Binance Ticker created.', new Date().toLocaleString())
                    }
                }
            }
        });
        binanceCron.start()
        binanceTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        binanceCron.start()
        console.log('119 ==>', error)
    }
});

///////////////   Huobi   ///////////////
let huobiCron = new CronJob(config.get('cronTime.tickers'), async function () {
    try {
        let huobiExchange = await get_tickers('Huobi').then(async (ticker) => {
            if (ticker) {
                let huobiTickerData = await exchangeModel.findOne({ exchangeName: 'Huobi', uid: 'huobi', status: 'ACTIVE' });
                if (huobiTickerData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: huobiTickerData._id }, { $set: { tickers: ticker } }, { new: true });
                    if (updateTicker) {
                        console.log('Huobi Ticker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Huobi', uid: 'huobi', tickers: ticker }).save();
                    if (createTicker) {
                        console.log('Huobi Ticker created.', new Date().toLocaleString())
                    }
                }
            }
        });
    } catch (error) {
        console.log('119 ==>', error)
    }
});
///////////////   coinbase  ///////////////
let coinbaseCron = new CronJob(config.get('cronTime.tickers'), async function () {
    try {
        coinbaseCron.stop()
        let coinbaseExchange = await get_tickers('Coinbase').then(async (ticker) => {
            if (ticker) {
                let cryptoTickerData = await exchangeModel.findOne({ exchangeName: 'Coinbase', uid: 'coinbase', status: 'ACTIVE' });
                if (cryptoTickerData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: cryptoTickerData._id }, { $set: { tickers: ticker } }, { new: true });
                    if (updateTicker) {
                        console.log('coinbase Ticker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Coinbase', uid: 'coinbase', tickers: ticker }).save();
                    if (createTicker) {
                        console.log('coinbase Ticker created.', new Date().toLocaleString())
                    }
                }
            }
        });
        coinbase = Date.now() + minutes * 60 * 1000
        coinbaseCron.stop()
    } catch (error) {
        console.log('119 ==>', error)
    }
});

///////////////   Kraken   ///////////////
let krakenCron = new CronJob(config.get('cronTime.tickers'), async function () {
    try {
        krakenCron.stop()
        let krakenExchange = await get_tickers('Kraken').then(async (ticker) => {
            if (ticker) {
                let krakenTickerData = await exchangeModel.findOne({ exchangeName: 'Kraken', uid: 'kraken', status: 'ACTIVE' });
                if (krakenTickerData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: krakenTickerData._id }, { $set: { tickers: ticker } }, { new: true });
                    if (updateTicker) {
                        console.log('kraken Ticker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Kraken', uid: 'kraken', tickers: ticker }).save();
                    if (createTicker) {
                        console.log('kraken Ticker created.', new Date().toLocaleString())
                    }
                }
            }
        });
        krakenCron.start()
        krakenTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        krakenCron.start()
        console.log('119 ==>', error)
    }
});

///////////////   mexc  ///////////////
let mexcCron = new CronJob(config.get('cronTime.tickers'), async function () {
    try {
        mexcCron.stop()
        let mexcExchange = await get_tickers('Mexc').then(async (ticker) => {
            if (ticker) {
                let mexcData = await exchangeModel.findOne({ exchangeName: 'Mexc', uid: 'mexc', status: 'ACTIVE' });
                if (mexcData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: mexcData._id }, { $set: { tickers: ticker } }, { new: true });
                    if (updateTicker) {
                        console.log('Mexc Ticker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Mexc', uid: 'mexc', tickers: ticker }).save();
                    if (createTicker) {
                        console.log('Mexc Ticker created.', new Date().toLocaleString())
                    }
                }
            }
        });
        mexcCron.start()
        mexcTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        mexcCron.start()
        console.log('119 ==>', error)
    }
});

///////////////   bitmart  ///////////////
let bitmartCron = new CronJob(config.get('cronTime.tickers'), async function () {
    try {
        bitmartCron.stop()
        let bitmartExchange = await get_tickers('Bitmart').then(async (ticker) => {
            if (ticker) {
                let bitmartData = await exchangeModel.findOne({ exchangeName: 'Bitmart', uid: 'bitmart', status: 'ACTIVE' });
                if (bitmartData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: bitmartData._id }, { $set: { tickers: ticker } }, { new: true });
                    if (updateTicker) {
                        console.log('Bitmart Ticker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Bitmart', uid: 'bitmart', tickers: ticker }).save();
                    if (createTicker) {
                        console.log('Bitmart Ticker created.', new Date().toLocaleString())
                    }
                }
            }
        });
        bitmartCron.start()
        bitmartTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        console.log('119 ==>', error)
        bitmartCron.start()
    }
});

///////////////   gemini  ///////////////
let geminiCron = new CronJob(config.get('cronTime.tickers'), async function () {
    try {
        geminiCron.stop()
        let geminiExchange = await get_tickers('Gemini').then(async (ticker) => {
            if (ticker) {
                let geminiData = await exchangeModel.findOne({ exchangeName: 'Gemini', uid: 'gemini', status: 'ACTIVE' });
                if (geminiData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: geminiData._id }, { $set: { tickers: ticker } }, { new: true });
                    if (updateTicker) {
                        console.log('Gemini Ticker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Gemini', uid: 'gemini', tickers: ticker }).save();
                    if (createTicker) {
                        console.log('Gemini Ticker created.', new Date().toLocaleString())
                    }
                }
            }
        });
        geminiCron.start()
    } catch (error) {
        geminiCron.start()
        console.log('171 ==>', error)
    }
});

///////////////   Gateio  ///////////////
let gateioCron = new CronJob(config.get('cronTime.tickers'), async function () {
    try {
        gateioCron.stop()
        let gateioExchange = await get_tickers('Gateio').then(async (ticker) => {
            if (ticker) {
                let gateioData = await exchangeModel.findOne({ exchangeName: 'Gateio', uid: 'gateio', status: 'ACTIVE' });
                if (gateioData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: gateioData._id }, { $set: { tickers: ticker } }, { new: true });
                    if (updateTicker) {
                        console.log('Gateio Ticker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'Gateio', uid: 'gateio', tickers: ticker }).save();
                    if (createTicker) {
                        console.log('Gateio Ticker created.', new Date().toLocaleString())
                    }
                }
            }
        });
        gateioTime = Date.now() + minutes * 60 * 1000
        gateioCron.start()
    } catch (error) {
        gateioCron.start()
        console.log('119 ==>', error)
    }
});

///////////////   Hitbtc  ///////////////
let hitBTCCron = new CronJob(config.get('cronTime.tickers'), async function () {
    try {
        hitBTCCron.stop()
        let hitbtcExchange = await get_tickers('HitBTC').then(async (ticker) => {
            if (ticker) {
                let hitbtcData = await exchangeModel.findOne({ exchangeName: 'HitBTC', uid: 'hitbtc', status: 'ACTIVE' });
                if (hitbtcData) {
                    let updateTicker = await exchangeModel.updateOne({ _id: hitbtcData._id }, { $set: { tickers: ticker } }, { new: true });
                    if (updateTicker) {
                         console.log('HitBTC Ticker updated.', new Date().toLocaleString())
                    }
                } else {
                    let createTicker = await exchangeModel({ exchangeName: 'HitBTC', uid: 'hitbtc', tickers: ticker }).save();
                    if (createTicker) {
                        console.log('HitBTC Ticker created.', new Date().toLocaleString())
                    }
                }
            }
        });
        hitbtcTime = Date.now() + minutes * 60 * 1000
        hitBTCCron.start()
    } catch (error) {
        hitBTCCron.start()
        console.log('119 ==>', error)
    }
});


///////////////////////////
//start-stop cron-job for tickers

binanceCron.start();
// binanceCron.stop();

// huobiCron.start()
// huobiCron.stop()

coinbaseCron.start()
// coinbaseCron.stop()

krakenCron.start();
// krakenCron.stop();

mexcCron.start()
// mexcCron.stop()

bitmartCron.start()
// bitmartCron.stop()

// geminiCron.start()
// geminiCron.stop()

gateioCron.start()
// gateioCron.stop()

// hitBTCCron.start()
// hitBTCCron.stop()

let allCronRestart = new CronJob(config.get('cronTime.allCronReset'), async () => {
    if (mexcTime < Date.now()) {
        mexcCron.start()
    }
    if (krakenTime < Date.now()) {
        krakenCron.start()
    }
    if (binanceTime < Date.now()) {
        binanceCron.start()
    }
    if (bitmartTime < Date.now()) {
        bitmartCron.start()
    }
    if (coinbase < Date.now()) {
        coinbaseCron.start()
    }
    if (gateioTime < Date.now()) {
        gateioCron.start()
    }
    // if (hitbtcTime < Date.now()) {
    //     hitBTCCron.start()
    // }

})
allCronRestart.start()
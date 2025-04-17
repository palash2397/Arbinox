var CronJob = require('cron').CronJob;
const { save_ask_bid_data } = require('../../../../helper/asks_bids_function');
import { chartServices } from '../../services/chart'
const { createChart, findChart, updateChart } = chartServices
import config from "config";
let minutes = 2
let binanceTime = Date.now() + minutes * 60 * 1000
let krakenTime = Date.now() + minutes * 60 * 1000
let mexcTime = Date.now() + minutes * 60 * 1000
let geminiTime = Date.now() + minutes * 60 * 1000

///////////////   Binance   ///////////////
let binanceAskbid = new CronJob(config.get("cronTime.askBid"), async function () {
    try {
        binanceAskbid.stop()
        await save_ask_bid_data('Binance').then(async (askbids) => {
            if (askbids.length != 0) {
                let binanceAskBidsData = await findChart({ exchangeName: 'Binance', uid: 'binance', status: 'ACTIVE' });
                if (binanceAskBidsData) {
                    let updateAskBid = await updateChart({ _id: binanceAskBidsData._id }, { askBid: askbids });
                    if (updateAskBid) {
                        console.log('Binance askbid updated.', new Date().toLocaleString())
                    }
                } else {
                    let createAskBid = await createChart({ exchangeName: 'Binance', uid: 'binance', askBid: askbids });
                    if (createAskBid) {
                        console.log('Binance askbid created.', new Date().toLocaleString())
                    }
                }
            }
        });
        binanceAskbid.start()
        binanceTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        binanceAskbid.start()
        console.log('31 ==>', error)
    }
});

///////////////   mexc   ///////////////
let mexcAskbid = new CronJob(config.get("cronTime.askBid"), async function () {
    try {
        mexcAskbid.stop()
        await save_ask_bid_data('Mexc').then(async (askbids) => {
            if (askbids.length != 0) {
                let mexcAskBidsData = await findChart({ exchangeName: 'Mexc', uid: 'mexc', status: 'ACTIVE' });
                if (mexcAskBidsData) {
                    let updateAskBid = await updateChart({ _id: mexcAskBidsData._id }, { askBid: askbids });
                    if (updateAskBid) {
                        console.log('Mexc askbid updated.', new Date().toLocaleString())
                    }
                } else {
                    let createAskBid = await createChart({ exchangeName: 'Mexc', uid: 'mexc', askBid: askbids });
                    if (createAskBid) {
                        console.log('Mexc askbid created.', new Date().toLocaleString())
                    }
                }
            }
        });
        mexcAskbid.start()
        mexcTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        mexcAskbid.start()
        console.log('58 ==>', error)
    }
});

///////////////   Kraken   ///////////////
let krakenAskbid = new CronJob(config.get("cronTime.askBid"), async function () {
    try {
        krakenAskbid.stop()
        await save_ask_bid_data('Kraken').then(async (askbids) => {
            if (askbids.length != 0) {
                let krakenAskBidsData = await findChart({ exchangeName: 'Kraken', uid: 'kraken', status: 'ACTIVE' });
                if (krakenAskBidsData) {
                    let updateAskBid = await updateChart({ _id: krakenAskBidsData._id }, { askBid: askbids });
                    if (updateAskBid) {
                        console.log('Kraken askbid updated.', new Date().toLocaleString())
                    }
                } else {
                    let createAskBid = await createChart({ exchangeName: 'Kraken', uid: 'kraken', askBid: askbids });
                    if (createAskBid) {
                        console.log('Kraken askbid created.', new Date().toLocaleString())
                    }
                }
            }
        });
        krakenAskbid.start()
        krakenTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        krakenAskbid.start()
        console.log('85 ==>', error)
    }
});

///////////////   Bitmart   ///////////////
let bitmartAskbid = new CronJob(config.get("cronTime.askBid"), async function () {
    try {
        bitmartAskbid.stop()
        await save_ask_bid_data('Bitmart').then(async (askbids) => {
            if (askbids.length != 0) {
                let krakenAskBidsData = await findChart({ exchangeName: 'Bitmart', uid: 'bitmart', status: 'ACTIVE' });
                if (krakenAskBidsData) {
                    let updateAskBid = await updateChart({ _id: krakenAskBidsData._id }, { askBid: askbids });
                    if (updateAskBid) {
                        console.log('Kraken askbid updated.', new Date().toLocaleString())
                    }
                } else {
                    let createAskBid = await createChart({ exchangeName: 'Bitmart', uid: 'bitmart', askBid: askbids });
                    if (createAskBid) {
                        console.log('Kraken askbid created.', new Date().toLocaleString())
                    }
                }
            }
        });
        bitmartAskbid.start()
    } catch (error) {
        bitmartAskbid.start()
        console.log('112 ==>', error)
    }
});

///////////////   Gemini   ///////////////
let geminiAskbid = new CronJob(config.get("cronTime.askBid"), async function () {
    try {
        geminiAskbid.stop()
        await save_ask_bid_data('Gemini').then(async (askbids) => {
            if (askbids.length != 0) {
                let geminiAskBidsData = await findChart({ exchangeName: 'Gemini', uid: 'gemini', status: 'ACTIVE' });
                if (geminiAskBidsData) {
                    let updateAskBid = await updateChart({ _id: geminiAskBidsData._id }, { askBid: askbids });
                    if (updateAskBid) {
                        console.log('Gemini askbid updated.', new Date().toLocaleString())
                    }
                } else {
                    let createAskBid = await createChart({ exchangeName: 'Gemini', uid: 'gemini', askBid: askbids });
                    if (createAskBid) {
                        console.log('Gemini askbid created.', new Date().toLocaleString())
                    }
                }
            }
        });
        geminiAskbid.start()
        geminiTime = Date.now() + minutes * 60 * 1000
    } catch (error) {
        geminiAskbid.start()
        console.log('28 ==>', error)
    }
});

binanceAskbid.start();
// binanceAskbid.stop();

mexcAskbid.start();
// mexcAskbid.stop();

krakenAskbid.start();
// krakenAskbid.stop();

// bitmartAskbid.start();
// bitmartAskbid.stop();

geminiAskbid.start();
// geminiAskbid.stop();

let allCronRestart = new CronJob(config.get('cronTime.allCronReset'), async () => {
    if (binanceTime < Date.now()) {
        binanceAskbid.start()
    }
    if (mexcTime < Date.now()) {
        mexcAskbid.start()
    }
    if (krakenTime < Date.now()) {
        krakenAskbid.start()
    }
    if (geminiTime < Date.now()) {
        geminiAskbid.start()
    }

})
allCronRestart.start()
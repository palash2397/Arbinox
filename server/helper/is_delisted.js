// const Kucoin = require('kucoin-node-api');

// module.exports = {
//     is_delisted: async (exchange, apiKey, secretKey, passphrase) => {
//         switch (exchange) {
//             case 'Binance':
//                 break;
//             case 'Poloniex':
//                 var list = [];
//                 let polo = new Poloniex();
//                 var data = await polo.returnCurrencies();
//                 for (let [keys, value] of Object.entries(data)) {
//                     if (value.delisted == 1 || value.disabled == 1) {
//                         list.push(keys);
//                     }
//                 }
//                 return list;
//                 break;
//             case 'Kucoin':
//                 var desiabled = new Array();
//                 const config = {
//                 //   apiKey: apiKey,
//                 //   secretKey: secretKey,
//                 //   passphrase: passphrase,
//                   environment: 'live'
//                 }
//                 await Kucoin.init(config);
//                 var data = await Kucoin.getSymbols();
//                 for (let [key, value] of Object.entries(data)) {
//                   for (let token of value) {
//                     if (token.enableTrading == false) {
//                       desiabled.push(token.baseCurrency);
//                     }
//                   }
//                 }
//                 return desiabled;
//                 break;
//             case 'Gateio':
//                 break;
//             case 'BitFinex':
//                 break;
//         }
//     }
// }
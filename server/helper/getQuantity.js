// module.exports = {
//     get_quantity: (exchange, tickers, start_tokens, quantity) => {
//         let list = {};
//         switch (exchange) {
//             case 'Binance':
//                 for (let token of start_tokens) {
//                     let ticker = tickers[token + 'USD'];
//                     if (!ticker) {
//                         ticker = tickers[token + 'BUSD'];
//                     }
//                     if (token != 'USD') {
//                         list[token] = quantity / ticker['price'];
//                     } else {
//                         list[token] = quantity;
//                     }
//                 }
//                 return list;
//                 break;
//             case 'Kucoin':
//                 for (let token of start_tokens) {
//                     if (token != 'USDT') {
//                         list[token] = quantity / tickers[token + '-USDT']['price'];
//                     } else {
//                         list[token] = quantity
//                     }
//                 }
//                 return list;
//                 break;
//             case 'BitFinex':
//                 for (let token of start_tokens) {
//                     if (token != 'USD') {
//                         list[token] = quantity / tickers[token + 'USD']['price']
//                     } else {
//                         list[token] = quantity
//                     }
//                 }
//                 return list;
//                 break;
//             case 'Huobi':
//                 for (let token of start_tokens) {
//                     if (token != 'USDT') {
//                         list[token] = quantity / tickers[token + 'USDT']['price']
//                     } else {
//                         list[token] = quantity
//                     }
//                 }
//                 return list;
//                 break;
//             case 'Okex':
//                 for (let token of start_tokens) {
//                     if (token != 'USDT') {
//                         list[token] = quantity / tickers[token + '-USDT']['price'];
//                     } else {
//                         list[token] = quantity
//                     }
//                 }
//                 return list;
//                 break;
//             case 'Cexio':
//                 for (let token of start_tokens) {
//                     if (token != 'USD') {
//                         list[token] = quantity / tickers[token + ':USD']['price']
//                     } else {
//                         list[token] = quantity
//                     }
//                 }
//                 return list;
//                 break;
//             case 'Cryptocom':
//                 for (let token of start_tokens) {
//                     if (token != 'USDT') {
//                         list[token] = quantity / tickers[token + '_USDT']['price']
//                     } else {
//                         list[token] = quantity
//                     }
//                 }
//                 return list;
//                 break;
//             case 'Gemini':
//                 for (let token of start_tokens) {
//                     if (token != 'USD') {
//                         list[token] = quantity / tickers[token + 'USD']['price']
//                     } else {
//                         list[token] = quantity
//                     }
//                 }
//                 return list;
//                 break;
//             case 'Bitstamp':
//                 for (let token of start_tokens) {
//                     if (token != 'USD') {
//                         list[token] = quantity / tickers[token + '/USD']['price'];
//                     } else {
//                         list[token] = quantity
//                     }
//                 }
//                 return list;
//                 break;
//             case 'Ftxus':
//                 for (let token of start_tokens) {
//                     if (token != 'USD') {
//                         list[token] = quantity / tickers[token + '/USD']['price'];
//                     } else {
//                         list[token] = quantity
//                     }
//                 }
//                 return list;
//                 break;
//         }
//     }
// }


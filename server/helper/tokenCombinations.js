module.exports = {
  direct: async function direct(all_tickers) {
    try {
      let token_list = {
        'USD': [],
        'USDT': [],
        'BTC': [],
        'ETH': []
      }
      let split_pair;
      let list=Object.keys(all_tickers);
      if (list) {
        for (let token of list) {
          split_pair = [all_tickers[token].base, all_tickers[token].quote]
          if(split_pair)
            (token_list[split_pair[1]]).push(split_pair[0]) 
        }
        return token_list
      }
    } catch (error) {
      console.log("error==>>", error);
    }

  },
  intraPriceKucoin: async function intraPriceKucoin(res, primary) {
    if (res) {
      const data = res //list
      var prepared = {}
      for (let ticker in data) {
        let pair = data[ticker].symbol;
        let ask = parseFloat(data[ticker].price)
        for (let token in primary) {
          var split_pair = pair.split("-");
          if (split_pair[0] == primary[token]) {
            var secondary = split_pair[1];
            if (ask > 0) {
              if (!prepared[primary[token]])
                prepared[primary[token]] = {}
              //volume = get_volume(data[ticker], split_pair[1], split_pair[0], data, pair);
              prepared[primary[token]][secondary] = [ask, pair, '0.2', ask]
            }
          }
        }
      }
      return prepared
    }
  },

  getPricesLoop: async function getPricesLoop(all_tickers) {
    let primary = ['USD', 'USDT', 'BTC', 'ETH']
    var coinremove = ['BNB', 'XRP', 'LUNA', 'TFUEL', 'XLM', 'IOST', 'KAVA', 'XEM', 'HBAR', 'MDX']
    const res = all_tickers;
    // console.log(all_tickers);
    if (res) {
      const data = res;
      var prepared = {}
      for (let ticker in data) {
        let pair = ticker;
        let ask = parseFloat(data[ticker].price)
        for (let token in primary) {
          const split_pair = [all_tickers[pair].base, all_tickers[pair].quote];
          if (split_pair[1] == primary[token] && !coinremove.includes(split_pair[0])) {
            var secondary = split_pair[0];
            if (ask > 0) {
              if (!prepared[primary[token]])
                prepared[primary[token]] = {}
              if (!prepared[secondary])
                prepared[secondary] = {}
              prepared[primary[token]][secondary] = [1 / ask, pair]
              prepared[secondary][primary[token]] = [ask, pair]
            }
          }
        }
      }
      return prepared
    }
  },
}
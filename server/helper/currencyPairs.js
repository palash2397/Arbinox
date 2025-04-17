module.exports = {
  currencyPairs: [
    "BTC", "ETH", "USDT", "USDC", "BNB", "XRP", "ADA", "SOL", "DOGE",
    "DOT", "MATIC", "DAI", "ETC", "FIL", "AVAX", "SHIB", "TRX", "UNI", "WBTC", "LTC", "RNDR", "COMP",
    "CRV", "VET", "1INCH", "APE", "BAL", "LDO", "AAVE", "LINK", "THETA", "BCH", "CAKE", "FTT", "DGB", "DENT", "PEOPLE", "EDU", "PEPE", "GALA", "STMX", "LUNC", "ENJ", "WIF", "BONK",
    "QTUM", "ZRX", "BMX", "PLEX", "GOC", "HOT"
  ],

  withdrawalFee: {
    Kraken: {
      'USDT': {
        'base': "USDT",
        "minimumwithdrawal": "16",
        "withdrawFee": "8",
      },
      'BTC': {
        "base": "BTC",
        "minimumwithdrawal": "0.0005",
        "withdrawFee": "0.0002",
      },
      'ETH': {
        "base": "ETH",
        "minimumwithdrawal": "0.005",
        "withdrawFee": "0.003",
      },
      'BNB': {
        "base": "BNB",
        "minimumwithdrawal": "0",
        "withdrawFee": "0",
      },
      'MATIC': {
        "base": "MATIC",
        "minimumwithdrawal": "6.5",
        "withdrawFee": "4",
      },
      'AVAX': {
        "base": "AVAX",
        "minimumwithdrawal": "0.5",
        "withdrawFee": "0.05",
      },
      'FTM': {
        "base": "FTM",
        "minimumwithdrawal": "0.14",
        "withdrawFee": "0.07",
      },
      'ADA': {
        "base": "ADA",
        "minimumwithdrawal": "5",
        "withdrawFee": "1",
      },
      'SOL': {
        "base": "SOL",
        "minimumwithdrawal": "0.02",
        "withdrawFee": "0.01",
      },
      'SHIB': {
        "base": "SHIB",
        "minimumwithdrawal": "746000",
        "withdrawFee": "400000",
      },
      'CRV': {
        "base": "CRV",
        "minimumwithdrawal": "11",
        "withdrawFee": "5.5",
      },
      '1INCH': {
        "base": "1INCH",
        "minimumwithdrawal": "22",
        "withdrawFee": "11",
      },
      'BAL': {
        "base": "BAL",
        "minimumwithdrawal": "1.7",
        "withdrawFee": "0.81",
      },
      'DASH': {
        "base": "DASH",
        "minimumwithdrawal": "0.01",
        "withdrawFee": "0.005",
      },
      'DOT': {
        "base": "DOT",
        "minimumwithdrawal": "1.05",
        "withdrawFee": "0.05",
      },
      'DOGE': {
        "base": "DOGE",
        "minimumwithdrawal": "50",
        "withdrawFee": "4",
      },
      'HBAR': {
        "base": "HBAR",
        "minimumwithdrawal": "0",
        "withdrawFee": "0",
      },
      'MANA': {
        "base": "MANA",
        "minimumwithdrawal": "19",
        "withdrawFee": "9.5",
      },
      'NEO': {
        "base": "NEO",
        "minimumwithdrawal": "0",
        "withdrawFee": "0",
      },
      'THETA': {
        "base": "THETA",
        "minimumwithdrawal": "0",
        "withdrawFee": "0",
      },
      'TRX': {
        "base": "TRX",
        "minimumwithdrawal": "20",
        "withdrawFee": "15",
      },
      'VET': {
        "base": "VET",
        "minimumwithdrawal": "0",
        "withdrawFee": "0",
      },
      'APE': {
        "base": "APE",
        "minimumwithdrawal": "2.6",
        "withdrawFee": "1.3",
      },
      'LDO': {
        "base": "LDO",
        "minimumwithdrawal": "5",
        "withdrawFee": "2.5",
      },
      'GALA': {
        "base": "GALA",
        "minimumwithdrawal": "280.00",
        "withdrawFee": "140.00",
      },
      'SAND': {
        "base": "SAND",
        "minimumwithdrawal": "18.00",
        "withdrawFee": "8.80",
      },
      'ICP': {
        "base": "ICP",
        "minimumwithdrawal": "0.04",
        "withdrawFee": "0.001",
      },
      'DENT': {
        "base": "DENT",
        "minimumwithdrawal": "11000.00",
        "withdrawFee": "5100.00",
      },
      'ENJ': {
        "base": "ENJ",
        "minimumwithdrawal": "28.00",
        "withdrawFee": "14.00",
      },
      'QTUM': {
        "base": "QTUM",
        "minimumwithdrawal": "0.1",
        "withdrawFee": "0.01",
      },
      'ZRX': {
        "base": "ZRX",
        "minimumwithdrawal": "2.41806",
        "withdrawFee": "2.01505",
      },
    }
  },



  okexChains: {
    '1INCH': '1INCH-ERC20',
    AAVE: 'AAVE-ERC20',
    ALGO: 'ALGO-Algorand',
    ANT: 'ANT-ERC20',
    AVAX: 'AVAX-Avalanche C-Chain',
    BAT: 'BAT-ERC20',
    BCH: 'BCH-BitcoinCash',
    BTC: 'BTC-Bitcoin',
    COMP: 'COMP-ERC20',
    CRV: 'CRV-ERC20',
    DASH: 'DASH-Digital Cash',
    DOT: 'DOT-Polkadot',
    ETC: 'ETC-Ethereum Classic',
    ETH: 'ETH-ERC20',
    FIL: 'FIL-ERC20',
    GRT: 'GRT-ERC20',
    HBAR: 'HBAR-Hedera',
    ICP: 'ICP-Dfinity',
    IOTA: 'IOTA-MIOTA',
    JST: 'JST-TRON',
    LINK: 'LINK-ERC20',
    LTC: 'LTC-Litecoin',
    LUNA: 'LUNA-Terra',
    MANA: 'MANA-ERC20',
    MATIC: 'MATIC-Polygon',
    NEO: 'NEO-N3',
    OMG: 'OMG-ERC20',
    ONT: 'ONT-Ontology',
    QTUM: 'QTUM-Quantum',
    SHIB: 'SHIB-ERC20',
    SLP: 'SLP-ERC20',
    SUN: 'SUN-TRON',
    SUSHI: 'SUSHI-ERC20',
    THETA: 'THETA-Theta',
    TRX: 'TRX-TRON',
    UNI: 'UNI-ERC20',
    USDT: 'USDT-TRC20',
    XMR: 'XMR-Monero',
    XTZ: 'XTZ-Tezos',
    YFI: 'YFI-ERC20',
    YFII: 'YFII-ERC20',
    ZEC: 'ZEC-Zcash',
    ZEN: 'ZEN-Horizen'
  }
};
// const fee = currencyPairs.withdrawFee.Kraken["BTC_USDT"]
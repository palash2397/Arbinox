import express from "express";
import Mongoose from "mongoose";
import * as http from "http";
import * as path from "path";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import apiErrorHandler from '../helper/apiErrorHandler';
import WebSocket from 'websocket';
import notificationController from "../api/v1/controllers/notification/controller";
import config from "config";
// import logger from "../helper/logger";
require('../api/v1/controllers/cronjob/cronIndex');
require('../api/v1/controllers/cronjob/blockChainFunctionController')
import directController from '../api/v1/controllers/directArbitrage/controller'
import triangularController from '../api/v1/controllers/triangularArbitrage/controller'
import loopcontroller from '../api/v1/controllers/loopArbitrage/controller'
import intraArbitrageSingleExchange from '../api/v1/controllers/intraArbitrageSingleExchange/controller'
import chartFucntion from '../helper/chart'
import walletController  from "../api/v1/controllers/wallet/controller";


const WebSocketServer = WebSocket.server;
const WebSocketClient = WebSocket.client;
const client = new WebSocketClient();
const app = new express();
const server = http.createServer(app);
const root = path.normalize(`${__dirname}/../..`);
const wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false,
  maxReceivedFrameSize: 64 * 1024 * 1024,   // 64MiB
  maxReceivedMessageSize: 64 * 1024 * 1024, // 64MiB
  fragmentOutgoingMessages: false,
  keepalive: false,
  disableNagleAlgorithm: false
});

class ExpressServer {
  constructor() {
    app.use(express.json({ limit: '1000mb' }));

    app.use(express.urlencoded({ extended: true, limit: '1000mb' }))

    app.use(morgan('dev'))

    app.use(
      cors({
        allowedHeaders: ["Content-Type", "token", "authorization"],
        exposedHeaders: ["token", "authorization"],
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        preflightContinue: false,
      })
    );
  }
  router(routes) {
    routes(app);
    return this;
  }

  configureSwagger(swaggerDefinition) {
    const options = {
      // swaggerOptions : { authAction :{JWT :{name:"JWT", schema :{ type:"apiKey", in:"header", name:"Authorization", description:""}, value:"Bearer <JWT>"}}},
      swaggerDefinition,
      apis: [
        path.resolve(`${root}/server/api/v1/controllers/**/*.js`),
        path.resolve(`${root}/api.yaml`),
      ],
    };

    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerJSDoc(options))
    );
    return this;
  }

  handleError() {
    app.use(apiErrorHandler);

    return this;
  }

  configureDb(dbUrl) {
    return new Promise((resolve, reject) => {
      Mongoose.connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        family: 4,
        keepAlive: true,
        connectTimeoutMS: 1000 * 60 * 5
      }, (err) => {
        if (err) {
          console.log(`Error in mongodb connection ${err.message}`);
          return reject(err);
        }
        console.log("Mongodb connection established");
        return resolve(this);
      });
    });
  }

  // })

  listen(port) {
    server.listen(port, () => {
      console.log(`Secure app is listening @port ${port}`, new Date().toLocaleString());
      console.log(`Swagger URL: http://${config.get('hostAddress')}api-docs`);
    });
    return app;
  }
}

wsServer.on('request', function (request) {
  if (!originIsAllowed(request.origin)) {
    request.reject();
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
    return;
  }
  const connection = request.accept('', request.origin);

  async function getNotificationList(token) {
    if (connection.connected) {
      let result = await notificationController.getNotificationList(token);
      if (result) {
        let data = JSON.stringify(result);
        connection.sendUTF(data);
      }
      setTimeout(() => {
        getNotificationList(token)
      }, 5000);
    }
  }
  //******************************************************************************************/
  connection.on('message', async function (message) {
    try {
      let request = JSON.parse(message.utf8Data);
      if (request.options == 'getNotificationList') {
        let response = await getNotificationList(request.token)
        if (response) { connection.sendUTF(response); }
      }
    } catch (error) { console.log('websocket message event error: ', error) }
  })

  //*********************getProfitPath******************************/
  async function directFilterProfitPath(token, exchange1, exchange2, capital, startToken) {
    if (connection.connected) {
      let result = await directController.filterProfitPathsForWebsocket(token, exchange1, exchange2, capital, startToken);
      if (result) {
        let data = JSON.stringify(result);
        connection.sendUTF(data);
      }
      setTimeout(() => {
        directFilterProfitPath(token, exchange1, exchange2, capital, startToken)
      }, 1000);
    }
  }

  connection.on('message', async function (message) {
    try {
      let request = JSON.parse(message.utf8Data);
      if (request.options == 'directProfitpath') {
        let response = await directFilterProfitPath(request.token, request.exchange1, request.exchange2, request.capital, request.startToken)
        if (response) { connection.sendUTF(response); }
      }
    } catch (error) { console.log('websocket message event error: ', error) }
  })

  async function triangularFilterProfitPath(token, uid, depth, capital, coins) {
    if (connection.connected) {
      let result = await triangularController.filterProfitPathsWebSocket(token, uid, depth, capital, coins);
      if (result) {
        let data = JSON.stringify(result);
        connection.sendUTF(data);
      }
      setTimeout(() => {
        triangularFilterProfitPath(token, uid, depth, capital, coins)
      }, 1000);
    }
  }

  connection.on('message', async function (message) {
    try {
      let request = JSON.parse(message.utf8Data);
      if (request.options == 'triangularProfitpath') {
        let response = await triangularFilterProfitPath(request.token, request.uid, request.depth, request.capital, request.coins)
        if (response) { connection.sendUTF(response); }
      }
    } catch (error) { console.log('websocket message event error: ', error) }
  })

  async function intraSingleExchangeFilterProfitPath(token, uid, capital, coins, profit) {
    if (connection.connected) {
      let result = await intraArbitrageSingleExchange.filterProfitPathsWebSocket(token, uid, capital, coins, profit);
      if (result) {
        let data = JSON.stringify(result);
        connection.sendUTF(data);
      }
      setTimeout(() => {
        intraSingleExchangeFilterProfitPath(token, uid, capital, coins, profit)
      }, 1000);
    }
  }

  connection.on('message', async function (message) {
    try {
      let request = JSON.parse(message.utf8Data);
      if (request.options == 'intraSingleExchangeProfitpath') {
        let response = await intraSingleExchangeFilterProfitPath(request.token, request.uid, request.capital, request.coins, request.profit)
        if (response) { connection.sendUTF(response); }
      }
    } catch (error) { console.log('websocket message event error 212: ', error) }
  })

  async function loopFilterProfitPath(token, exchange1, exchange2, exchange3, startToken, capital) {
    if (connection.connected) {
      let result = await loopcontroller.filterProfitPathsWebSocket(token, exchange1, exchange2, exchange3, startToken, capital);
      if (result) {
        let data = JSON.stringify(result);
        connection.sendUTF(data);
      }
      setTimeout(() => {
        loopFilterProfitPath(token, exchange1, exchange2, exchange3, startToken, capital)
      }, 5000);
    }
  }

  connection.on('message', async function (message) {
    try {
      let request = JSON.parse(message.utf8Data);
      if (request.options == 'loopProfitpath') {
        let response = await loopFilterProfitPath(request.token, request.exchange1, request.exchange2, request.exchange3, request.startToken, request.capital)
        if (response) { connection.sendUTF(response); }
      }
    } catch (error) { console.log('websocket message event error: ', error) }
  })

  connection.on('message', async function (message) {
    try {
      let request = JSON.parse(message.utf8Data);
      if (request.options == 'chart') {
        let response = await charts(request.exchange, request.symbol, request.interval)
        if (response) { connection.sendUTF(response); }
      }
    } catch (error) { console.log('chart websocket message event error: ', error) }
  })

  async function charts(exchange, symbol, interval) {
    if (connection.connected) {
      let result = await chartFucntion.ohlc(exchange, symbol, interval);
      if (result) {
        let data = JSON.stringify(result);
        connection.sendUTF(data);
      }
      setTimeout(() => {
        charts(exchange, symbol, interval)
      }, 9000);
    }
  }

  connection.on('message', async function (message) {
    try {
      let request = JSON.parse(message.utf8Data);
      if (request.options == 'askbid') {
        let response = await askbids(request.token,request.exchange, request.symbol, request.limit)
        if (response) { connection.sendUTF(response); }
      }
    } catch (error) { console.log('askbids websocket message event error: ', error) }
  })

  async function askbids(token,exchange, symbol, limit) {
    if (connection.connected) {
      let result = await walletController.askBidSocket(token,exchange, symbol, limit);
      if (result) {
        let data = JSON.stringify(result);
        connection.sendUTF(data);
      }
      setTimeout(() => {
        askbids(token,exchange, symbol, limit)
      }, 5000);
    }
  }

  connection.on('message', async function (message) {
    try {
      let request = JSON.parse(message.utf8Data);
      if (request.options == 'marketTicker') {
        let response = await marketData(request.exchange, request.symbol)
        if (response) { connection.sendUTF(response); }
      }
    } catch (error) { console.log('marketData websocket message event error: ', error) }
  })

  async function marketData(exchange, symbol) {
    if (connection.connected) {
      let result = await chartFucntion.marketData(exchange, symbol);
      if (result) {
        let data = JSON.stringify(result);
        connection.sendUTF(data);
      }
      setTimeout(() => {
        marketData(exchange, symbol)
      }, 4000);
    }
  }

  connection.on('close', function (reasonCode, description) {
    console.log(new Date() + ' Peer ' + connection.remoteAddress + ' Client has disconnected.');
  });
  connection.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
  });

});

client.on('connect', function (connection) {
  connection.on('message', function (error) {
    console.log(new Date() + ' WebSocket Client Connected');
  });
  connection.on('error', function (error) {
    console.log("Connection Error: " + error.toString());
  });
  connection.on('close', function () {
    console.log('echo-protocol Connection Closed');
  });

});

client.connect(config.get('websocketAddress'), '');


export default ExpressServer;

function originIsAllowed(origin) {
  return true;
}


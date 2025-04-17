import Express from "express";
import controller from "./controller";
import auth from "../../../../helper/auth";


export default Express.Router()


    .use(auth.verifyToken)
    .get('/Dashboard', controller.Dashboard)
    .get('/DashboardRecentData', controller.DashboardRecentData)
    .get('/cryptoAssetprofit', controller.cryptoAssetprofit)
    .get('/connectedExchangeList', controller.connectedExchangeList)
    .get('/connectedExchangePreviousList', controller.connectedExchangePreviousList)
    .get('/userDashboard', controller.userDashboard)



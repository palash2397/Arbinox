import Express from "express";
import controller from "./controller";
import auth from "../../../../helper/auth";
import upload from '../../../../helper/uploadHandler';


export default Express.Router()
    .use(auth.verifyToken)
    .post('/filterProfitPaths', controller.filterProfitPaths)
    .post('/autoTradeOnOff', controller.autoTradeOnOff)
    .post('/tradeProfitPaths', controller.tradeProfitPaths)
    .get('/viewPlacedTrade/:_id', controller.viewPlacedTrade)
    .put('/activeBlockPlacedTrade', controller.activeBlockPlacedTrade)
    .delete('/deletePlacedTrade', controller.deletePlacedTrade)
    .post('/cancelledOrder/:_id', controller.cancelledOrder)
    .post('/listPlacedTradeWithFilter', controller.listPlacedTradeWithFilter)
    .post('/listPlacedTradeWithFilterForParticularUser', controller.listPlacedTradeWithFilterForParticularUser)
    .get('/getDataAutoTradeOnOff', controller.getDataAutoTradeOnOff)
    .post('/sniperBotOnOff', controller.sniperBotOnOff)
    .get('/getDataSniperBotOnOff', controller.getDataSniperBotOnOff)
    .post('/rebalancingTrade', controller.rebalancingTrade)
    .get('/getDataRebalancingBotOnOff', controller.getDataRebalancingBotOnOff)
    .put('/updatePlacedTrade', controller.updatePlacedTrade)
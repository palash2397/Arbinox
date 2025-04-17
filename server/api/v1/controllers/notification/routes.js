import Express from "express";
import controller from "./controller";
import auth from '../../../../helper/auth'
import upload from '../../../../helper/uploadHandler';


export default Express.Router()
    .use(auth.verifyToken)
    .get('/listNotification', controller.listNotification)
    .get('/viewNotification/:_id', controller.viewNotification)
    .get('/readNotification', controller.readNotification)
    .delete('/clearNotification', controller.clearNotification)
    .put('/enableDisableNotification', controller.enableDisableNotification)
// .put('/editNotification', controller.editNotification)


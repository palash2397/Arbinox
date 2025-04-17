import Express from "express";
import controller from "./controller";
import auth from "../../../../helper/auth";


export default Express.Router()


    .use(auth.verifyToken)
    .post('/addIpAddress', controller.addIpAddress)
    .get('/ipAddressList', controller.ipAddressList)
    .get('/ipAddressView', controller.ipAddressView)
    .put('/ipAddressEnableDisable', controller.ipAddressEnableDisable)
    .put('/updateIpAddress', controller.updateIpAddress)
    .post('/addSubAdmin', controller.addSubAdmin)
    .put('/editSubAdmin', controller.editSubAdmin)
    .get('/subAdminList', controller.subAdminList)
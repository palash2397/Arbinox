import Express from "express";
import controller from "./controller";
import auth from '../../../../helper/auth'
import upload from '../../../../helper/uploadHandler';


export default Express.Router()
    .get('/listStaticContent', controller.listStaticContent)
    .get('/viewStaticContent', controller.viewStaticContent)
    .get('/viewFAQ', controller.viewFAQ)
    .get('/faqList', controller.faqList)
    .post('/addContactUs', controller.addContactUs)
    .use(auth.verifyToken)
    .post('/addStaticContent', controller.addStaticContent)
    .put('/editStaticContent', controller.editStaticContent)
    .post('/addFAQ', controller.addFAQ)
    .delete('/deleteFAQ', controller.deleteFAQ)
    .put('/editFAQ', controller.editFAQ)

    .use(upload.uploadFile)



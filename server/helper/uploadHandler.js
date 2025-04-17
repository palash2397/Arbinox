import multer from 'multer';
import path from 'path';
import Boom from 'boom';
const fs = require('fs');

export class UploadHandler {
    constructor(fileSize) {
        this.fileSize = fileSize;
        this.max_image_size = 204800;
        this.max_video_size = 2048000;
        this.storage = multer.diskStorage({
            destination(req, file, cb) {
                const root = path.normalize(`${__dirname}/../..`);
                cb(null, `${root}/uploads/`);
            },
            filename(req, file, cb) {
                cb(null, `${Date.now()}_${file.originalname.replace(/\s/g, '')}`);
            },
        });
        this.uploadFile = this.uploadFile.bind(this);
        const root = path.normalize(`${__dirname}/../..`);
    }

    /**
     * @param  {} req
     * @param  {} res
     * @param  {} next
     * @param  {} upload
     */
    handleUploadError(req, res, next, upload) {
        upload(req, res, function (err) {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(Boom.badRequest(err, 'File size limit exceeds'));
                }
                return next(Boom.badRequest(err, 'Error in file upload'));
            }
            return next();
        });
    }


    /**
     * @param  {} req
     * @param  {} res
     * @param  {} next
     */
    uploadFile(req, res, next) {
        const upload = multer({
            storage: this.storage,
            fileFilter: function (req, file, cb) {
                var ext = path.extname(file.originalname).toLowerCase();
                cb(null, true)
            },
            limits: {
                fileSize: 1000000 * 90
            },
        }).any();
        this.handleUploadError(req, res, next, upload);
    }


}


export default new UploadHandler(10);
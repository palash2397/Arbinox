import { transports, format, createLogger } from 'winston';
import fs from 'fs';
import path from 'path';
import winston from 'winston/lib/winston/config';
require('winston-daily-rotate-file')



const logDir = path.normalize(`${__dirname}/../../log`);
const {
    combine,
    timestamp,
    label,
    prettyPrint,
} = format;

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const console = createLogger({
    format: combine(
        timestamp(),
        prettyPrint(),
    ),
    transports: [
        new transports.DailyRotateFile({
            filename: `${logDir}/%DATE%/info.log`,
            datePattern: 'YYYY-MM-DD',
            level: 'info'
        }),
        new transports.DailyRotateFile({
            filename: `${logDir}/%DATE%/error.log`,
            datePattern: 'YYYY-MM-DD',
            level: 'error'
        }),
        new transports.DailyRotateFile({
            filename: `${logDir}/%DATE%/warn.log`,
            datePattern: 'YYYY-MM-DD',
            level: 'warn'
        }),
        new transports.DailyRotateFile({
            filename: `${logDir}/%DATE%/debug.log`,
            datePattern: 'YYYY-MM-DD',
            level: 'debug'
        })

    ]
});

export class Logger {
    log(msg) {
        console.info(msg);
    }
    info(msg) {
        console.info(msg);
    }
    warn(msg) {
        console.warn(msg);
    }
    debug(msg) {
        console.debug(msg);
    }
    error(msg) {
        console.error(msg);
    }
}

export default new Logger();
import { Context } from "koa";
import { transports, format } from "winston";
import * as path from "path";

import { config } from "./config";
import { failure } from "./entity/result";

const logger = (winstonInstance: any): any => {
    winstonInstance.configure({
        level: config.debugLogging ? "debug" : "info",
        transports: [
            //
            // - Write all logs error (and below) to `error.log`.
            new transports.File({ filename: path.resolve(__dirname, "../error.log"), level: "error" }),
            //
            // - Write to all logs with specified level to console.
            new transports.Console({
                format: format.combine(
                    format.colorize(),
                    format.simple()
                )
            })
        ]
    });

    return async (ctx: Context, next: () => Promise<any>): Promise<void> => {
        let errStatus = 0;
        let errMsg = "";

        const startTime = new Date();
        try {
            await next();
        } catch (err) {
            errStatus = err.status || 500;
            errMsg = err.message;

            ctx.status = 200;
            ctx.body = failure(errStatus, errMsg);
        }
        const stopTime = new Date();

        const ms = stopTime.getTime() - startTime.getTime();

        const timeBetween = `${startTime.toLocaleString()} - ${stopTime.toLocaleString()}`;

        let logLevel: string;
        if (errStatus) {
            logLevel = "error";
        } else {
            logLevel = "info";
        }

        let msg = `http-transport ${ms}ms [${timeBetween}] ${ctx.method} ${ctx.originalUrl} ${ctx.status}`;
        if (errMsg) {
            msg = `${msg} error -> ${errStatus} ${errMsg}`;
        }

        winstonInstance.log(logLevel, msg);
    };
};

export { logger };
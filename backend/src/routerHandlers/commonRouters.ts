'use strict';

import * as fs from "node:fs";
import * as path from "node:path";
import { ReadableStream } from "node:stream/web";

import { settings } from "../../../api/routers";
import { DEFAULT_cooldown } from "../common/env";
import { fastifyApp } from "../server/fastifyInit";

const default_maxAge = 86400;

export function startCommonRoutersHandling(app = fastifyApp) {
    app.all('/ping', () => {
        const date = new Date();

        return {
            pong: date.getTime(),
            now_iso: date.toISOString(),
        };
    });

    app[settings.method]<settings.Types>(settings.url, function() {
        return {
            success: true,
            settings: {
                minimalCooldown: DEFAULT_cooldown,
            },
        } satisfies settings.Types["Reply"];
    });

    app.get('/favicon.ico', async (_req, reply) => {
        const stream = fs.createReadStream(path.join(__dirname, '../static/favicon/favicon.ico'));

        reply
            .header('cache-control', `max-age=${default_maxAge}`)
            .type('image/x-icon')
        ;
        reply.send(ReadableStream.from(stream));
    });
}

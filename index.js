'use strict';

const redis = require('redis');
const COUNTER_TTL = 48 * 60 * 60;

module.exports.title = 'Stats Counter';
module.exports.init = function(app, done) {
    // prefer redis provided by the configuration
    const client = app.config.redis
        ? redis.createClient(typeof app.config.redis === 'string' ? { url: app.config.redis } : app.config.redis)
        : app.db.redis;
    const prefix = app.config.prefix ? app.config.prefix + '_' : '';
    const logError = err => app.logger.error('Redis', err.message);

    if (app.config.redis) {
        client.on('error', logError);
        return client.connect().then(registerHook, done);
    }

    registerHook();

    function registerHook() {
        app.addHook('queue:release', (zone, data, next) => {
            if (!data || !data.status) {
                return next();
            }

            let date = new Date();
            let year = date.getUTCFullYear() + '';
            let month = date.getUTCMonth() + 1;
            let day = date.getUTCDate();

            month = (month < 10 ? '0' : '') + month;
            day = (day < 10 ? '0' : '') + day;

            let suffix = '^' + year + '/' + month + '/' + day;
            let aggregateKey = prefix + (data.status.delivered ? 'delivered' : 'bounced');
            let key = aggregateKey + '_' + zone.name + suffix;
            let domainKey = prefix + 'domains' + suffix;

            const query = client
                .multi()
                .incr(key)
                .expire(key, COUNTER_TTL);

            // Legacy aggregates: no readers found in WebAdmin or ZoneMTA.
            // Uncomment if a consumer needs them; retain expiry on each key.
            // query
            //     .incr(aggregateKey)
            //     .expire(aggregateKey, COUNTER_TTL)
            //     .incr(aggregateKey + suffix)
            //     .expire(aggregateKey + suffix, COUNTER_TTL)
            //     .incr(aggregateKey + '_' + zone.name)
            //     .expire(aggregateKey + '_' + zone.name, COUNTER_TTL);

            // ZoneMTA may provide a callback-based Redis client.
            if (typeof query.zIncrBy === 'function') {
                query.zIncrBy(domainKey, 1, data.domain).expire(domainKey, COUNTER_TTL);
                // Legacy undated ranking: grows with distinct domains while traffic keeps its TTL refreshed.
                // query.zIncrBy(prefix + 'domains', 1, data.domain).expire(prefix + 'domains', COUNTER_TTL);
                query.exec().catch(logError);
            } else {
                query.zincrby(domainKey, 1, data.domain).expire(domainKey, COUNTER_TTL);
                // query.zincrby(prefix + 'domains', 1, data.domain).expire(prefix + 'domains', COUNTER_TTL);
                query.exec((err, replies) => {
                    if (err) {
                        return logError(err);
                    }
                    // ioredis returns command errors inside [error, result] pairs.
                    for (const reply of replies || []) {
                        const commandError = Array.isArray(reply) ? reply[0] : reply;
                        if (commandError instanceof Error) {
                            logError(commandError);
                        }
                    }
                });
            }

            // Do not wait until counters are updated before returning.
            setImmediate(next);
        });

        done();
    }
};

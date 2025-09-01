"use strict";
/**
 * question router
 */
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreRouter('api::question.question', {
    config: {
        find: {
            policies: [],
            middlewares: [],
        },
        findOne: {
            policies: [],
            middlewares: [],
        },
        create: {
            policies: [],
            middlewares: [],
        },
        update: {
            policies: [],
            middlewares: [],
        },
        delete: {
            policies: [],
            middlewares: [],
        },
    },
    only: ['find', 'findOne', 'create', 'update', 'delete'],
    except: [],
    prefix: '',
});

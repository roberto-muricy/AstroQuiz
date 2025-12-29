'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/quiz/start',
      handler: 'api::quiz-engine.quiz.start',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/quiz/question/:sessionId',
      handler: 'api::quiz-engine.quiz.getQuestion',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/quiz/answer',
      handler: 'api::quiz-engine.quiz.submitAnswer',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/quiz/finish/:sessionId',
      handler: 'api::quiz-engine.quiz.finish',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/quiz/pause/:sessionId',
      handler: 'api::quiz-engine.quiz.pause',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/quiz/resume/:sessionId',
      handler: 'api::quiz-engine.quiz.resume',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/quiz/session/:sessionId',
      handler: 'api::quiz-engine.quiz.getSession',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/quiz/rules',
      handler: 'api::quiz-engine.quiz.getRules',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/quiz/pool-stats',
      handler: 'api::quiz-engine.quiz.getPoolStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/quiz/health',
      handler: 'api::quiz-engine.quiz.health',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};



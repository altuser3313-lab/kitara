import { Router } from 'express';

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function asyncRouter() {
  const router = Router();
  for (const method of ['get', 'post', 'put', 'patch', 'delete', 'use']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) => {
      if (typeof path === 'function' || Array.isArray(path)) {
        return original(...[path, ...handlers].flat(Infinity).map((h) => (typeof h === 'function' && h.length < 4 ? wrap(h) : h)));
      }
      return original(path, ...handlers.flat(Infinity).map((h) => (typeof h === 'function' && h.length < 4 ? wrap(h) : h)));
    };
  }
  return router;
}

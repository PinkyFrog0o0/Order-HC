// Node 16 上 crypto 模块本身没 getRandomValues(Vite 5 走默认 import 用),挂在 webcrypto 上
// Node 19+ 上 webcrypto 已暴露,这里是 noop
const crypto = require('node:crypto');
if (typeof crypto.getRandomValues !== 'function') {
  crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
}
// 也填到 globalThis 上(其它库可能直接用 globalThis.crypto)
if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto = crypto.webcrypto;
}

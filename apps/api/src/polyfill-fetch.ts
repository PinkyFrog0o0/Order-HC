/**
 * Node 16/17 没有原生全局 fetch。本文件把 undici 的 fetch/Headers/Request/Response
 * 挂到 globalThis，main.ts 顶部 import 一次即可。
 *
 * Node 18+ 上 globalThis.fetch 已存在，下面所有 if 都不会触发，原生 fetch 优先。
 *
 * 为什么用 undici：Node 18+ 内置 fetch 就是 undici 实现的；同一份代码、同一份行为，
 * 未来升 Node 后这层 polyfill 直接变成 noop，不需要再换库。
 */
import { fetch, Headers, Request, Response } from 'undici';

if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
  globalThis.Headers = Headers as unknown as typeof globalThis.Headers;
  globalThis.Request = Request as unknown as typeof globalThis.Request;
  globalThis.Response = Response as unknown as typeof globalThis.Response;
}

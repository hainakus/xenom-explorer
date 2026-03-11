// Loads the Xenom WASM SDK dynamically from public/sdk/ at runtime.
// The SDK must be built from the Xenom fork of rusty-kaspa and placed in:
//   public/sdk/kaspa.js
//   public/sdk/kaspa_bg.wasm
// (Same pattern as xenom-web-wallet by hainakus)

let _sdk = null;
let _initPromise = null;

export async function initWasm() {
  if (_sdk) return _sdk;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const sdkUrl = `${location.origin}/sdk/kaspa.js`;
    const kaspa = await import(/* @vite-ignore */ sdkUrl);
    await kaspa.default('/sdk/kaspa_bg.wasm');
    _sdk = kaspa;
    return kaspa;
  })();

  return _initPromise;
}

export const isWasmReady = () => _sdk !== null;
export const getSDK = () => _sdk;

// Lazy proxy accessors — resolved after initWasm() completes
export const RpcClient  = (...args) => new (_sdk.RpcClient)(...args);
export const Encoding   = new Proxy({}, { get: (_, k) => _sdk?.Encoding?.[k] });

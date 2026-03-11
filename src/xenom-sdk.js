// Xenom Explorer SDK — Xenom WASM SDK (Borsh, loaded from public/sdk/)

import { initWasm, isWasmReady, getSDK } from './xenom-wasm.js';

// ── CONFIG ────────────────────────────────────────────────────
const NODE_URL = import.meta.env.VITE_XENOM_NODE_URL || 'ws://localhost:17110';
const API_URL  = import.meta.env.VITE_XENOM_API_URL  || 'https://explorer.xenom.space/api';

// ── UTILITIES ─────────────────────────────────────────────────
export const shortHash = (h = '', len = 13) =>
  h ? h.slice(0, len) + '…' + h.slice(-6) : '—';

export const formatAmount = (s) => {
  if (s == null) return '—';
  return (Number(s) / 1e8).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }) + ' XENOM';
};

export const formatTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(parseInt(ts));
  return isNaN(d) ? '—' : d.toLocaleString('en-GB', { hour12: false });
};

export const timeAgo = (ts) => {
  if (!ts) return '—';
  const diff = Date.now() - parseInt(ts);
  if (diff < 60000)    return Math.floor(diff / 1000)    + 's ago';
  if (diff < 3600000)  return Math.floor(diff / 60000)   + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
};

export const withPrefix = (addr) => {
  if (!addr) return '';
  return addr.startsWith('xenom:') ? addr : 'xenom:' + addr;
};

export const sameAddr = (a, b) => {
  if (!a || !b) return false;
  const pa = (a.includes(':') ? a.split(':')[1] : a).slice(0, -8);
  const pb = (b.includes(':') ? b.split(':')[1] : b).slice(0, -8);
  return pa === pb && pa.length > 10;
};

// ── HELPERS ───────────────────────────────────────────────────
const n = (v) => Number(v ?? 0);

// ── XENOM SDK CLASS ────────────────────────────────────────────
export class XenomSDK {
  constructor() {
    this.rpc   = null;
    this.ready = false;
    this._onConnect    = [];
    this._onDisconnect = [];
    this._onBlock      = [];

    this.shortHash    = shortHash;
    this.formatAmount = formatAmount;
    this.formatTime   = formatTime;
    this.timeAgo      = timeAgo;
    this.withPrefix   = withPrefix;
    this.sameAddr     = sameAddr;
  }

  async initWasm() {
    await initWasm();
    console.log('[XenomSDK] kaspa-wasm ready');
  }

  // ── CONNECTION ────────────────────────────────────────────────
  connectWebSocket() {
    if (this.rpc || !isWasmReady()) return;
    const kaspa = getSDK();

    this.rpc = new kaspa.RpcClient({ url: NODE_URL, encoding: kaspa.Encoding.Borsh, networkId: 'mainnet' });

    this.rpc.addEventListener('connect', async () => {
      console.log('[XenomSDK] wRPC connected');
      this.ready = true;
      this._onConnect.forEach(cb => cb());
      try { await this.rpc.subscribeBlockAdded(); } catch (_) {}
    });

    this.rpc.addEventListener('disconnect', () => {
      console.log('[XenomSDK] wRPC disconnected');
      this.ready = false;
      this._onDisconnect.forEach(cb => cb());
    });

    this.rpc.addEventListener('block-added', (event) => {
      const block = event?.data?.block ?? event?.block ?? event;
      if (!block) return;
      const _h = block?.verboseData?.hash || block?.header?.hash || '';
      if (_h) this._onBlock.forEach(cb => cb({ ...block, _h }));
    });

    this.rpc.connect().catch(err => console.error('[XenomSDK] connect error:', err));
  }

  on(event, cb) {
    if (event === 'connect')    this._onConnect.push(cb);
    if (event === 'disconnect') this._onDisconnect.push(cb);
    if (event === 'block')      this._onBlock.push(cb);
  }

  off(event, cb) {
    if (event === 'connect')    this._onConnect    = this._onConnect.filter(f => f !== cb);
    if (event === 'disconnect') this._onDisconnect = this._onDisconnect.filter(f => f !== cb);
    if (event === 'block')      this._onBlock      = this._onBlock.filter(f => f !== cb);
  }

  disconnect() {
    if (this.rpc) { this.rpc.disconnect().catch(() => {}); this.rpc = null; this.ready = false; }
  }

  _rpc() {
    if (!this.ready) throw new Error('Not connected');
    return this.rpc;
  }

  // ── NETWORK INFO ──────────────────────────────────────────────
  async getBlockDagInfo() {
    const r = await this._rpc().getBlockDagInfo();
    console.debug('[wRPC] getBlockDagInfo:', r);
    return {
      blockCount:      n(r.blockCount      ?? r.block_count),
      virtualDaaScore: n(r.virtualDaaScore ?? r.virtual_daa_score),
      difficulty:      n(r.difficulty),
      networkName:     r.network ?? r.networkName ?? r.network_name ?? '—',
      pastMedianTime:  n(r.pastMedianTime  ?? r.past_median_time),
    };
  }

  async getXenomdInfo() {
    const r = await this._rpc().getServerInfo();
    console.debug('[wRPC] getServerInfo:', r);
    const mem = await this._rpc().getMempoolEntries({}).catch(() => ({ entries: [] }));
    return {
      isSynced:      r.isSynced      ?? r.is_synced      ?? false,
      serverVersion: r.serverVersion ?? r.server_version ?? r.networkId ?? '—',
      mempoolSize:   mem?.entries?.length ?? 0,
    };
  }

  async getCoinSupply() {
    const r = await this._rpc().getCoinSupply();
    console.debug('[wRPC] getCoinSupply:', r);
    return {
      circulatingSupply: String(r.circulatingSompi ?? r.circulating_sompi ?? 0),
      maxSupply:         String(r.maxSompi         ?? r.max_sompi         ?? 0),
    };
  }

  // ── BLOCKS ────────────────────────────────────────────────────
  async getBlock(hash, includeTransactions = true) {
    const r = await this._rpc().getBlock({ hash, includeTransactions });
    return r.block ?? r;
  }

  // ── TRANSACTIONS ──────────────────────────────────────────────
  async getTransaction(transactionId) {
    // 1. Try mempool (pending TXs)
    try {
      const r = await this._rpc().getMempoolEntry({ transactionId, includeOrphanPool: true });
      const tx = r?.entry?.transaction ?? r;
      if (tx && (tx.inputs != null || tx.outputs != null)) {
        return { ...tx, _mempool: true };
      }
    } catch (_) {}

    // 2. REST API indexed lookup (fast O(1) for confirmed TXs)
    if (API_URL) {
      try {
        const res = await fetch(`${API_URL}/transactions/${transactionId}?resolve_previous_outpoints=light`);
        if (res.ok) {
          const data = await res.json();
          const tx = data?.transaction ?? data;
          if (tx && (tx.transaction_id || tx.inputs != null || tx.outputs != null)) {
            return { ...tx, _confirmed: true, _rest: true };
          }
        }
      } catch (_) {}
    }

    // 3. BFS from sink — scans recent blocks (fallback when REST unavailable)
    try {
      const sinkRes = await this._rpc().getSink().catch(() => null);
      const dagInfo = await this._rpc().getBlockDagInfo();
      const startHash =
        sinkRes?.sink ??
        dagInfo?.sink ??
        (Array.isArray(dagInfo?.tipHashes) ? dagInfo.tipHashes[0] : null) ??
        (Array.isArray(dagInfo?.tip_hashes) ? dagInfo.tip_hashes[0] : null);
      if (!startHash) throw new Error('no start hash');

      const visited = new Set();
      const queue = [startHash];
      let depth = 0;
      while (queue.length && depth < 100) {
        const hash = queue.shift();
        if (!hash || visited.has(hash)) continue;
        visited.add(hash);
        depth++;
        try {
          const blockRes = await this._rpc().getBlock({ hash, includeTransactions: true });
          const block = blockRes?.block ?? blockRes;
          const txList = block?.transactions ?? [];
          for (const tx of txList) {
            const id =
              tx.verboseData?.transactionId ??
              tx.verboseData?.transaction_id ??
              tx.id ?? '';
            if (id === transactionId) {
              return {
                ...tx,
                _confirmed: true,
                block_time: Number(
                  block?.header?.timestamp ??
                  tx.verboseData?.blockTime ??
                  tx.verboseData?.block_time ?? 0
                ) || null,
              };
            }
          }
          const hdr = block?.header ?? {};
          let parents = [];
          if (Array.isArray(hdr.parentsByLevel?.[0]))      parents = hdr.parentsByLevel[0];
          else if (Array.isArray(hdr.parentsByLevel))       parents = hdr.parentsByLevel.flat();
          else if (Array.isArray(hdr.parents?.[0]?.parentHashes)) parents = hdr.parents[0].parentHashes;
          else if (Array.isArray(hdr.parents))              parents = hdr.parents.flat().filter(p => typeof p === 'string');
          else if (Array.isArray(hdr.parent_hashes))        parents = hdr.parent_hashes;
          for (const p of parents) {
            if (p && typeof p === 'string' && !visited.has(p)) queue.push(p);
          }
        } catch (_) {}
      }
    } catch (_) {}

    throw new Error('Transaction not found.');
  }

  // ── ADDRESS ───────────────────────────────────────────────────
  async getAddressBalance(address) {
    try {
      const r = await this._rpc().getBalanceByAddress({ address });
      const bal = BigInt(r.balance ?? 0);
      if (bal > 0n) return { balance: String(bal) };
    } catch (_) {}
    // Fallback: sum UTXOs directly
    try {
      const r = await this._rpc().getUtxosByAddresses([address]);
      const total = (r?.entries ?? []).reduce(
        (s, e) => s + BigInt(e?.utxoEntry?.amount ?? e?.amount ?? 0), 0n
      );
      return { balance: String(total) };
    } catch (_) {}
    return { balance: '0' };
  }

  async getAddressTransactions(address, limit = 20, offset = 0) {
    // REST API indexed lookup — only use if it returns results (empty = not indexed yet)
    if (API_URL) {
      try {
        const url = `${API_URL}/addresses/${address}/full-transactions?limit=${limit}&offset=${offset}&resolve_previous_outpoints=light`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const txList = Array.isArray(data) ? data : (data?.transactions ?? []);
          if (txList.length > 0) {
            return txList.map(tx => ({
              ...tx,
              transaction_id: tx.transaction_id ?? tx.transactionId ?? '',
              transactionId:  tx.transaction_id ?? tx.transactionId ?? '',
              is_accepted:    tx.is_accepted ?? true,
              block_time:     tx.block_time ? Number(tx.block_time) : null,
            }));
          }
        }
      } catch (_) {}
    }

    // Fallback: current UTXOs only (no spent tx history via wRPC)
    const r = await this._rpc().getUtxosByAddresses([address]);
    const entries = r?.entries ?? [];
    const sorted = [...entries]
      .sort((a, b) => {
        const sa = BigInt(a?.utxoEntry?.blockDaaScore ?? a?.blockDaaScore ?? 0);
        const sb = BigInt(b?.utxoEntry?.blockDaaScore ?? b?.blockDaaScore ?? 0);
        return sb > sa ? 1 : sb < sa ? -1 : 0;
      })
      .slice(0, 100)
      .slice(offset, offset + limit);

    let timestamps = null;
    try {
      const daaScores = sorted.map(e =>
        BigInt(e?.utxoEntry?.blockDaaScore ?? e?.blockDaaScore ?? 0)
      );
      const tsRes = await this._rpc().getDaaScoreTimestampEstimate({ daaScores });
      timestamps = tsRes?.timestamps ?? null;
    } catch (_) {}

    return sorted.map((e, i) => ({
      transaction_id: e?.outpoint?.transactionId ?? '',
      transactionId:  e?.outpoint?.transactionId ?? '',
      is_accepted:    true,
      block_time:     timestamps ? Number(timestamps[i] ?? 0) || null : null,
      _utxo:          true,
      amount:         String(e?.utxoEntry?.amount ?? e?.amount ?? 0),
      outputs: [{ amount: e?.utxoEntry?.amount ?? e?.amount ?? 0, script_public_key_address: address }],
      inputs: [],
    }));
  }

  async getUtxosByAddress(address) {
    const r = await this._rpc().getUtxosByAddresses([address]);
    return r?.entries ?? [];
  }
}

// Singleton
export const xenomSDK = new XenomSDK();

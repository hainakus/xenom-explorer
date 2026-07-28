import { useState, useEffect, useCallback, useRef } from 'react';
import { xenomSDK } from './xenom-sdk';
import LogoIcon from './LogoIcon.jsx';
import './styles.css';

function DifficultyChart({ samples = [] }) {
  const points = samples.filter(sample => Number.isFinite(sample.v) && sample.v > 0);
  const width = 760;
  const height = 220;
  const padding = { top: 18, right: 18, bottom: 26, left: 18 };

  if (points.length < 2) {
    return (
      <div className="difficulty-chart empty-state">
        <div className="difficulty-empty">Collecting difficulty samples…</div>
      </div>
    );
  }

  const values = points.map(point => point.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(1, max * 0.08);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const scaleX = index => padding.left + (innerWidth * index) / (points.length - 1);
  const scaleY = value => padding.top + innerHeight - ((value - min) / range) * innerHeight;

  const coords = points.map((point, index) => ({ x: scaleX(index), y: scaleY(point.v) }));
  const smoothPath = (segments, close = false) => {
    if (segments.length < 2) return '';
    const start = segments[0];
    let path = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const point0 = segments[index - 1] || segments[index];
      const point1 = segments[index];
      const point2 = segments[index + 1];
      const point3 = segments[index + 2] || point2;
      const control1X = point1.x + (point2.x - point0.x) / 6;
      const control1Y = point1.y + (point2.y - point0.y) / 6;
      const control2X = point2.x - (point3.x - point1.x) / 6;
      const control2Y = point2.y - (point3.y - point1.y) / 6;
      path += ` C ${control1X.toFixed(2)} ${control1Y.toFixed(2)}, ${control2X.toFixed(2)} ${control2Y.toFixed(2)}, ${point2.x.toFixed(2)} ${point2.y.toFixed(2)}`;
    }
    if (close) path += ' Z';
    return path;
  };
  const linePath = smoothPath(coords);
  const areaBase = height - padding.bottom;
  const areaPath = `${smoothPath(coords)} L ${coords[coords.length - 1].x.toFixed(2)} ${areaBase} L ${coords[0].x.toFixed(2)} ${areaBase} Z`;
  const first = points[0].v;
  const last = points[points.length - 1].v;
  const delta = first > 0 ? ((last - first) / first) * 100 : 0;
  const guideCount = 6;
  const minIndex = values.indexOf(min);
  const maxIndex = values.indexOf(max);
  const startLabel = new Date(points[0].t).toLocaleString('en-GB', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endLabel = new Date(points[points.length - 1].t).toLocaleString('en-GB', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="difficulty-chart">
      <div className="difficulty-chart-top">
        <div>
          <div className="difficulty-label">Difficulty evolution</div>
          <div className="difficulty-meta">
            <span className="difficulty-value">{last.toFixed(6)}</span>
            <span className={'difficulty-chip ' + (delta >= 0 ? 'up' : 'down')}>
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="difficulty-note">
          {points.length} samples · live trend
        </div>
      </div>

      <div className="difficulty-plot">
        <div className="difficulty-axis min">Min {min.toFixed(6)}</div>
        <div className="difficulty-axis max">Max {max.toFixed(6)}</div>
        <div className="difficulty-timeline start">{startLabel}</div>
        <div className="difficulty-timeline end">{endLabel}</div>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Blockchain difficulty evolution chart">
          <defs>
            <linearGradient id="difficultyLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--cyan)" />
              <stop offset="52%" stopColor="var(--violet)" />
              <stop offset="100%" stopColor="var(--magenta)" />
            </linearGradient>
            <linearGradient id="difficultyFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--bio-green)" stopOpacity="0.35" />
              <stop offset="60%" stopColor="var(--bio-green)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--bio-green)" stopOpacity="0" />
            </linearGradient>
            <filter id="difficultyGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {Array.from({ length: guideCount }).map((_, index) => {
            const y = padding.top + (innerHeight * index) / (guideCount - 1);
            return <line key={index} x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="difficulty-grid-line" />;
          })}

          <path d={areaPath} className="difficulty-area" fill="url(#difficultyFill)" />
          <path d={linePath} className="difficulty-line" stroke="url(#difficultyLine)" filter="url(#difficultyGlow)" />
          {coords.map((point, index) => (
            <circle
              key={`${points[index].t}-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === points.length - 1 ? 3.2 : 1.8}
              className={[
                'difficulty-dot',
                index === points.length - 1 ? 'current' : '',
                index === minIndex ? 'low' : '',
                index === maxIndex ? 'high' : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

// Copy Button Component
function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  const copy = () => {
    const done = () => { setOk(true); setTimeout(() => setOk(false), 1500); };
    function fallback() {
      const el = document.createElement('textarea');
      el.value = text; el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(el); el.focus(); el.select();
      document.execCommand('copy');
      document.body.removeChild(el); done();
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else { fallback(); }
  };
  return <button className="cp-btn" onClick={copy}>{ok ? '✓ copied' : 'copy'}</button>;
}

// Loading / Error Components
const Loading = () => (
  <div className="loading">
    <span className="spinner">⟳</span> Loading...
  </div>
);

const ErrBox = ({ msg }) => <div className="err-box">⚠ {msg}</div>;

// Search Bar Component
function SearchBar({ onNav }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    const v = q.trim(); if (!v || busy) return;
    // Address: starts with xenom: or is an unprefixed address payload (61-63 chars)
    if (v.startsWith('xenom:')) { setQ(''); onNav({ page: 'address', id: v }); return; }
    if (v.length >= 61 && v.length <= 63 && !/[^a-z0-9]/i.test(v)) {
      setQ(''); onNav({ page: 'address', id: 'xenom:' + v }); return;
    }
    // 64-char hex: could be block hash OR tx id — probe node to decide
    if (v.length === 64 && /^[0-9a-f]+$/i.test(v)) {
      setBusy(true);
      try {
        await xenomSDK.getBlock(v, false);
        setQ(''); onNav({ page: 'block', id: v });
      } catch {
        setQ(''); onNav({ page: 'tx', id: v });
      } finally { setBusy(false); }
      return;
    }
    // Anything else: treat as tx id
    setQ(''); onNav({ page: 'tx', id: v });
  };
  return (
    <div className="search-wrap">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && go()}
        placeholder="Block hash / address / tx ID…"
        disabled={busy}
      />
      <button onClick={go} disabled={busy}>{busy ? '…' : '⌕'}</button>
    </div>
  );
}

// Dashboard Component
function Dashboard({ onNav }) {
  const [dag, setDag] = useState(null);
  const [node, setNode] = useState(null);
  const [supply, setSupply] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [difficultyHistory, setDifficultyHistory] = useState([]);
  const [live, setLive] = useState(false);
  const flashRef = useRef(null);

  const pushDifficultySample = useCallback((difficulty) => {
    if (!Number.isFinite(difficulty) || difficulty <= 0) return;
    const now = Date.now();
    setDifficultyHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && Math.abs(last.v - difficulty) < 1e-12 && now - last.t < 12000) {
        return prev;
      }
      const next = [...prev, { t: now, v: difficulty }];
      return next.slice(-28);
    });
  }, []);

  // Poll stats every 6s — each loads independently; also reload on connect
  useEffect(() => {
    const load = () => {
      xenomSDK.getBlockDagInfo().then(data => {
        setDag(data);
        pushDifficultySample(data?.difficulty);
      }).catch(() => {});
      xenomSDK.getXenomdInfo().then(setNode).catch(() => {});
      xenomSDK.getCoinSupply().then(setSupply).catch(() => {});
    };
    load();
    const t = setInterval(load, 6000);
    xenomSDK.on('connect', load);
    return () => {
      clearInterval(t);
      xenomSDK.off('connect', load);
    };
  }, [pushDifficultySample]);

  // WASM RPC live blocks
  useEffect(() => {
    const onConnect    = () => setLive(true);
    const onDisconnect = () => setLive(false);
    const onBlock = (block) => {
      const _h = block?.verboseData?.hash || block?.header?.hash || '';
      if (!_h) return;
      setBlocks(prev => {
        const merged = [{ ...block, _h }, ...prev];
        const seen = new Set();
        return merged.filter(b => {
          if (!b._h || seen.has(b._h)) return false;
          seen.add(b._h); return true;
        }).slice(0, 25);
      });
    };

    xenomSDK.on('connect',    onConnect);
    xenomSDK.on('disconnect', onDisconnect);
    xenomSDK.on('block',      onBlock);

    return () => {
      xenomSDK.off('connect',    onConnect);
      xenomSDK.off('disconnect', onDisconnect);
      xenomSDK.off('block',      onBlock);
    };
  }, []);

  const hashrate = dag ? (dag.difficulty * 2 / 1000).toFixed(4) : '—';
  const circ = supply ? (Number(supply.circulatingSupply) / 1e8).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';
  const maxS = supply ? (Number(supply.maxSupply) / 1e8).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';
  const pct = supply ? (Number(supply.circulatingSupply) / Number(supply.maxSupply) * 100).toFixed(1) : null;

  const lastBlock = blocks.length ? blocks[0] : null;
  const lastHdr = lastBlock?.header || {};

  return (
    <div>
      <div className="stat-hero">
        <div className="stat">
          <div className="stat-val">{dag ? Number(dag.blockCount).toLocaleString() : '—'}</div>
          <div className="stat-lbl">Block Count</div>
        </div>
        <div className="stat">
          <div className="stat-val" style={{ fontSize: '1.7rem' }}>{hashrate}</div>
          <div className="stat-lbl">Network Hashrate</div>
          <div className="stat-sub">Difficulty: {dag ? dag.difficulty.toFixed(6) : '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-val" style={{ fontSize: '1.5rem' }}>{circ}</div>
          <div className="stat-lbl">Circulating Supply</div>
          <div className="stat-sub">Max: {maxS}</div>
        </div>
        <div className="stat">
          <div className="stat-val" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span className={'dot' + (node?.isSynced ? '' : ' off')} />
            {node?.isSynced ? 'SYNCED' : 'SYNCING'}
          </div>
          <div className="stat-lbl">Node Status</div>
          <div className="stat-sub">{dag?.networkName || '—'}</div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stats-row-item">
          <div className="stats-row-lbl">Network Difficulty</div>
          <div className="stats-row-val">{dag ? dag.difficulty.toFixed(6) : '—'}</div>
        </div>
        <div className="stats-row-item">
          <div className="stats-row-lbl">Network Hashrate</div>
          <div className="stats-row-val">{hashrate} KH/s</div>
        </div>
        <div className="stats-row-item">
          <div className="stats-row-lbl">Network</div>
          <div className="stats-row-val">{dag?.networkName || '—'}</div>
        </div>
      </div>

      <div className="hero-grid">
        <DifficultyChart samples={difficultyHistory} />
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <span className="sec-title">Latest Blocks</span>
          <span className="live-badge">
            <span className={'dot' + (live ? '' : ' off')} style={{ width: 5, height: 5 }} /> Live
          </span>
        </div>
        {blocks.length === 0
          ? <div className="empty">Connecting to live block stream…</div>
          : <table className="tbl">
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>Blue Score</th>
                  <th>DAA Score</th>
                  <th>TXs</th>
                  <th>Time</th>
                  <th>Nonce</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b, i) => {
                  const h = b._h;
                  const hdr = b.header || {};
                  const txs = b.transactions || [];
                  return (
                    <tr key={h || i} ref={i === 0 ? flashRef : null} className={i === 0 ? 'bflash' : ''}>
                      <td>
                        <button className="lnk" onClick={() => onNav({ page: 'block', id: h })}>
                          {xenomSDK.shortHash(h, 14)}
                        </button>
                      </td>
                      <td style={{ color: 'var(--tx)' }}>{hdr.blueScore ? Number(hdr.blueScore).toLocaleString() : '—'}</td>
                      <td style={{ color: 'var(--txd)' }}>{hdr.daaScore ? Number(hdr.daaScore).toLocaleString() : '—'}</td>
                      <td><span className="badge bc">{txs.length}</span></td>
                      <td style={{ color: 'var(--txd)', fontSize: '.6rem' }}>{xenomSDK.timeAgo(hdr.timestamp)}</td>
                      <td style={{ color: 'var(--txd)', fontSize: '.6rem' }}>{hdr.nonce}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        }
      </div>

      <div className="stats-row">
        <div className="stats-row-item">
          <div className="stats-row-lbl">Latest Hash</div>
          <div className="stats-row-val">
            {lastBlock
              ? <button className="lnk" onClick={() => onNav({ page: 'block', id: lastBlock._h })}>{xenomSDK.shortHash(lastBlock._h, 14)}</button>
              : '—'}
          </div>
        </div>
        <div className="stats-row-item">
          <div className="stats-row-lbl">Block Time</div>
          <div className="stats-row-val">{lastHdr.timestamp ? xenomSDK.timeAgo(lastHdr.timestamp) : '—'}</div>
        </div>
        <div className="stats-row-item">
          <div className="stats-row-lbl">Max Supply</div>
          <div className="stats-row-val">{maxS}</div>
        </div>
      </div>
    </div>
  );
}

// Block Page Component
function BlockPage({ id, onNav }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    const load = () => {
      setLoading(true); setErr(null);
      xenomSDK.getBlock(id, true)
        .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
    };
    load();
    xenomSDK.on('connect', load);
    return () => xenomSDK.off('connect', load);
  }, [id]);

  if (loading) return <Loading />;
  if (err) return <ErrBox msg={err} />;
  if (!data) return null;

  const hdr = data.header || {};
  const txs = data.transactions || [];
  const hash = data.verboseData?.hash || id;

  return (
    <div>
      <div className="pg-hdr">
        <div className="pg-title">◈ Block</div>
        <div className="pg-sub">
          <span>{hash}</span><CopyBtn text={hash} />
        </div>
      </div>

      <div className="tabs">
        <button className={'tab' + (tab === 'info' ? ' active' : '')} onClick={() => setTab('info')}>
          Block Info
        </button>
        <button className={'tab' + (tab === 'txs' ? ' active' : '')} onClick={() => setTab('txs')}>
          Transactions&nbsp;<span className="badge bc">{txs.length}</span>
        </button>
      </div>

      {tab === 'info' && (
        <div className="panel"><div style={{ padding: '1rem 1.25rem' }}>
          {[
            ['Hash', hash],
            ['Blue Score', hdr.blueScore ? Number(hdr.blueScore).toLocaleString() : '—'],
            ['DAA Score', hdr.daaScore ? Number(hdr.daaScore).toLocaleString() : '—'],
            ['Timestamp', xenomSDK.formatTime(hdr.timestamp)],
            ['Bits', hdr.bits],
            ['Nonce', hdr.nonce],
            ['Version', hdr.version],
            ['Blue Work', hdr.blueWork],
            ['Hash Merkle Root', hdr.hashMerkleRoot],
            ['Accepted ID Merkle', hdr.acceptedIdMerkleRoot],
            ['UTXO Commitment', hdr.utxoCommitment],
            ['Pruning Point', hdr.pruningPoint],
          ].map(([l, v]) => (
            <div className="det-row" key={l}>
              <div className="det-lbl">{l}</div>
              <div className="det-val">{v || '—'}</div>
            </div>
          ))}
        </div></div>
      )}

      {tab === 'txs' && (
        <div>
          {txs.length === 0
            ? <div className="empty">No transactions in this block</div>
            : txs.map((tx, i) => {
                const txId = tx.verboseData?.transactionId || 'tx-' + i;
                const ins = tx.inputs || [];
                const outs = tx.outputs || [];
                const tot = outs.reduce((s, o) => s + Number(o.value ?? o.amount ?? 0), 0);
                const isCoinbase = ins.length === 0;
                return (
                  <div className="tx-card" key={txId}>
                    <div className="tx-card-hdr">
                      <button className="lnk" onClick={() => onNav({ page: 'tx', id: txId, data: tx })}>
                        {xenomSDK.shortHash(txId, 16)}
                      </button>
                      <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {isCoinbase && <span className="badge bg">COINBASE</span>}
                        <span className="badge bc">{ins.length} in</span>
                        <span className="badge bg">{outs.length} out</span>
                        <span className="amt">{xenomSDK.formatAmount(tot)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

// Address Page Component
function AddressPage({ id, onNav }) {
  const [bal, setBal] = useState(null);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    const load = () => {
      setLoading(true); setErr(null); setPage(0);
      Promise.all([
        xenomSDK.getAddressBalance(id),
        xenomSDK.getAddressTransactions(id, LIMIT, 0).catch(() => []),
      ]).then(([b, t]) => { setBal(b); setTxs(Array.isArray(t) ? t : []); })
        .catch(e => setErr(e.message))
        .finally(() => setLoading(false));
    };
    load();
    xenomSDK.on('connect', load);
    return () => xenomSDK.off('connect', load);
  }, [id]);

  const loadPage = (p) => {
    setPage(p);
    xenomSDK.getAddressTransactions(id, LIMIT, p * LIMIT)
      .then(t => setTxs(Array.isArray(t) ? t : [])).catch(() => {});
  };

  if (loading) return <Loading />;
  if (err) return <ErrBox msg={err} />;

  return (
    <div>
      <div className="pg-hdr">
        <div className="pg-title">◈ Address</div>
        <div className="pg-sub"><span>{id}</span><CopyBtn text={id} /></div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginBottom: '1.5rem' }}>
        <div className="stat">
          <div className="stat-lbl">Balance</div>
          <div className="amt-g" style={{ fontFamily: 'var(--fd)', fontSize: '1rem', textShadow: '0 0 12px var(--glow)' }}>
            {xenomSDK.formatAmount(bal?.balance)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Transactions</div>
          <div className="stat-val">{txs.length + page * LIMIT}</div>
          <div className="stat-sub">Page {page + 1}</div>
        </div>
      </div>

      <div className="sec-hdr">
        <div className="sec-title">Transaction History</div>
        <div className="sec-line" />
      </div>

      {txs.length === 0
        ? <div className="empty">No transactions found for this address</div>
        : <>
            {txs.map((tx, i) => {
              const txId = tx.transaction_id || tx.transactionId || 'tx-' + i;
              return (
                <div className="tx-card" key={txId} style={{ marginBottom: '1rem' }}>
                  <div className="tx-card-hdr">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
                      <button className="lnk" onClick={() => onNav({ page: 'tx', id: txId, data: tx })}>{xenomSDK.shortHash(txId, 18)}</button>
                      {(() => { const confirmed = tx.is_accepted || tx.accepting_block_hash || tx.block_time; return <span className={'badge ' + (confirmed ? 'bg' : 'by')}>{confirmed ? 'ACCEPTED' : 'PENDING'}</span>; })()}
                    </div>
                    <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                      <span style={{ color: 'var(--txd)', fontSize: '.6rem' }}>{xenomSDK.timeAgo(tx.block_time)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: '1rem', padding: '1rem 0', fontFamily: 'var(--fm)', fontSize: '.7rem' }}>
              {page > 0 && <button className="lnk" onClick={() => loadPage(page - 1)}>← Previous</button>}
              {txs.length === LIMIT && <button className="lnk" onClick={() => loadPage(page + 1)}>Next →</button>}
            </div>
          </>
      }
    </div>
  );
}

// Transaction Page Component
function TxPage({ id, onNav, prefetch }) {
  const [tx, setTx] = useState(prefetch ?? null);
  const [loading, setLoading] = useState(!prefetch);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (prefetch) return;
    const load = () => {
      setLoading(true); setErr(null);
      xenomSDK.getTransaction(id)
        .then(setTx).catch(e => setErr(e.message)).finally(() => setLoading(false));
    };
    load();
    xenomSDK.on('connect', load);
    return () => xenomSDK.off('connect', load);
  }, [id, prefetch]);

  if (loading) return <Loading />;
  if (err) return <ErrBox msg={err} />;
  if (!tx) return null;

  const ins = tx.inputs || [];
  const outs = tx.outputs || [];
  const blockTime = tx.block_time || Number(tx.verboseData?.blockTime ?? 0) || null;
  const outAmt = (o) => Number(o.value ?? o.amount ?? 0);
  const inAmt  = (inp) => Number(
    inp.previous_outpoint_amount ?? inp.amount ??
    inp.utxo?.amount ?? inp.utxoEntry?.amount ?? 0
  );
  const totIn  = ins.reduce((s, i) => s + inAmt(i), 0);
  const totOut = outs.reduce((s, o) => s + outAmt(o), 0);
  const fee = totIn - totOut;
  const isCoinbase = ins.length === 0;

  return (
    <div>
      <div className="pg-hdr">
        <div className="pg-title">◈ Transaction</div>
        <div className="pg-sub"><span>{id}</span><CopyBtn text={id} /></div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', marginBottom: '1.5rem' }}>
        <div className="stat">
          <div className="stat-lbl">Total Input</div>
          <div className="amt" style={{ fontSize: '.95rem' }}>{isCoinbase ? 'Coinbase' : xenomSDK.formatAmount(totIn)}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Total Output</div>
          <div className="amt-g" style={{ fontSize: '.95rem' }}>{xenomSDK.formatAmount(totOut)}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Fee</div>
          <div className={fee > 0 ? 'amt-r' : 'amt-g'} style={{ fontSize: '.95rem' }}>
            {isCoinbase ? '—' : (fee > 0 ? xenomSDK.formatAmount(fee) : '0')}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Block Time</div>
          <div style={{ fontSize: '.72rem', fontFamily: 'var(--fm)', color: 'var(--tx)' }}>{xenomSDK.formatTime(blockTime)}</div>
          <div className="stat-sub">{xenomSDK.timeAgo(blockTime)}</div>
        </div>
      </div>

      <div className="grid2">
        {/* INPUTS */}
        <div>
          <div className="sec-hdr">
            <div className="sec-title">Inputs ({ins.length})</div>
            <div className="sec-line" />
          </div>
          {isCoinbase
            ? <div className="panel" style={{ padding: '1rem' }}>
                <span className="badge bg" style={{ marginRight: '.5rem' }}>COINBASE</span>
                <span style={{ fontFamily: 'var(--fm)', fontSize: '.65rem', color: 'var(--txd)' }}>Mining reward</span>
              </div>
            : ins.map((inp, i) => (
                <div className="panel" key={i} style={{ padding: '.85rem 1rem', marginBottom: '.5rem' }}>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: '.6rem', color: 'var(--txd)', marginBottom: '.3rem' }}>
                    Input #{inp.index ?? i}
                  </div>
                  {inp.previous_outpoint_hash
                    ? <button className="lnk" style={{ fontSize: '.63rem', display: 'block', marginBottom: '.25rem' }}
                        onClick={() => onNav({ page: 'tx', id: inp.previous_outpoint_hash })}>
                        {xenomSDK.shortHash(inp.previous_outpoint_hash, 18)}
                      </button>
                    : <div style={{ color: 'var(--txd)', fontSize: '.63rem' }}>—</div>
                  }
                  {inp.previous_outpoint_amount > 0 &&
                    <div className="amt" style={{ fontSize: '.6rem' }}>{xenomSDK.formatAmount(inp.previous_outpoint_amount)}</div>
                  }
                </div>
              ))
          }
        </div>

        {/* OUTPUTS */}
        <div>
          <div className="sec-hdr">
            <div className="sec-title">Outputs ({outs.length})</div>
            <div className="sec-line" />
          </div>
          {outs.map((out, i) => {
            const addr = out.script_public_key_address || out.verboseData?.scriptPublicKeyAddress;
            return (
              <div className="panel" key={i} style={{ padding: '.85rem 1rem', marginBottom: '.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                  <span style={{ fontFamily: 'var(--fm)', fontSize: '.6rem', color: 'var(--txd)' }}>Output #{i}</span>
                  <span className="amt">{xenomSDK.formatAmount(out.value ?? out.amount)}</span>
                </div>
                {addr
                  ? <button className="lnk" style={{ fontSize: '.63rem' }} onClick={() => onNav({ page: 'address', id: xenomSDK.withPrefix(addr) })}>
                      {xenomSDK.shortHash(addr, 20)}
                    </button>
                  : <div style={{ color: 'var(--txd)', fontSize: '.63rem' }}>Unknown script</div>
                }
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const parsePath = () => {
  const parts = window.location.pathname.replace(/^\//, '').split('/');
  const seg = parts[0];
  const id  = decodeURIComponent(parts.slice(1).join('/'));
  if (seg === 'txs'                        && id) return { page: 'tx',      id };
  if (seg === 'blocks'                      && id) return { page: 'block',   id };
  if ((seg === 'wallets' || seg === 'addresses') && id) return { page: 'address', id };
  return { page: 'dashboard' };
};

const navToPath = (t) => {
  if (t.page === 'tx')      return `/txs/${encodeURIComponent(t.id)}`;
  if (t.page === 'block')   return `/blocks/${encodeURIComponent(t.id)}`;
  if (t.page === 'address') return `/wallets/${encodeURIComponent(t.id)}`;
  return '/';
};

// Main App Component
function App() {
  const [nav, setNav] = useState(() => parsePath());
  const [live, setLive] = useState(xenomSDK.ready);
  const [wasmInitialized, setWasmInitialized] = useState(false);

  const onNav = useCallback(t => {
    const path = navToPath(t);
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    setNav(t);
  }, []);

  useEffect(() => {
    const handler = () => setNav(parsePath());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  useEffect(() => {
    const onConnect    = () => setLive(true);
    const onDisconnect = () => setLive(false);
    xenomSDK.on('connect',    onConnect);
    xenomSDK.on('disconnect', onDisconnect);

    xenomSDK.initWasm()
      .then(() => {
        setWasmInitialized(true);
        return xenomSDK.connectWebSocket();
      })
      .catch(err => console.error('[XenomSDK] WASM init failed:', err));

    return () => {
      xenomSDK.off('connect',    onConnect);
      xenomSDK.off('disconnect', onDisconnect);
      xenomSDK.disconnect();
    };
  }, []);

  return (
    <div className="wrap">
      <nav>
        <button className="hamburger" aria-label="Menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="logo" onClick={() => onNav({ page: 'dashboard' })}>
          <span className="logo-icon" aria-hidden="true">
            <LogoIcon className="logo-dna" />
          </span>
          <span className="logo-wordmark">XENOMORPH</span>
        </div>
        <SearchBar onNav={onNav} />
        <ul className="nav-links">
          <li>
            <button
              className={nav.page === 'dashboard' ? 'active' : ''}
              onClick={() => onNav({ page: 'dashboard' })}>
              Dashboard
            </button>
          </li>
        </ul>
        <div className="nav-actions">
          <button className="nav-icon" aria-label="Account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          <button className="nav-icon" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <span
            className={'dot' + (live ? '' : ' off')}
            title={live ? 'Live stream connected' : 'Disconnected'}
          />
        </div>
      </nav>

        <main>
          {nav.page === 'dashboard' && <Dashboard onNav={onNav} />}
          {nav.page === 'block' && <BlockPage id={nav.id} onNav={onNav} />}
          {nav.page === 'address' && <AddressPage id={nav.id} onNav={onNav} />}
          {nav.page === 'tx' && <TxPage id={nav.id} onNav={onNav} prefetch={nav.data} />}
        </main>

        <footer>
          <div className="footer-brand">
            <span className="logo-icon" aria-hidden="true" style={{ width: '1.3rem', height: '1.3rem', fontSize: '0.6rem' }}>
              <LogoIcon className="logo-dna" />
            </span>
            <span>XENOMORPH EXPLORER</span>
          </div>
          <div className="footer-socials">
            <a href="https://x.com/XenomCrypto" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </a>
            <a href="https://discord.gg/HDZvEEDuSP" target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.6-5.6A8.38 8.38 0 0 1 3.5 11.5a8.5 8.5 0 0 1 13.1-7.1 8.38 8.38 0 0 1 3.8.9L21 3l-1.6 5.6a8.38 8.38 0 0 1 .9 2.9z" />
              </svg>
            </a>
            <a href="https://github.com/hainakus/Xenomorph" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7a3.37 3.37 0 0 0-.94 2.58V22" />
              </svg>
            </a>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span className={'dot' + (live ? '' : ' off')} style={{ width: 5, height: 5 }} />
            {live ? 'LIVE' : 'OFFLINE'} · {wasmInitialized ? 'WASM' : 'API'} Powered
          </span>
        </footer>
      </div>
  );
}

export default App;

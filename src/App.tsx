import React, { useState, useEffect, useCallback, useRef } from 'react';
import { bitable } from '@lark-opdev/block-bitable-api';

const PATH_FIELD = '分类';
const ID_FIELD = '分类ID';
const EMDASH_ID_FIELD = 'Emdash ID';
const EMDASH_ID_NAMES = ['Emdash ID', 'EmDashID', 'EmDash ID', 'EmdashID', 'emdash id', 'EmDashId'];
const UPDATE_FIELD_NAMES = ['Update', 'update', 'UPDATE'];
const DEFAULT_BASE_URL = 'https://m3.uuprints.com/_emdash/api';
// 分类树名称：uupack 用 product，m3 用 products
// 集合名称：uupack 用 products，m3 用 products
const getTaxonomy = (url: string) => url.includes('uupack') ? 'products1' : 'products';
const getCollection = (url: string) => 'products';
const TAXONOMY_NAME = 'products';

// 每张飞书表格独立配置（key 带 tableId 前缀）
const getTokenKey = (tableId: string) => `emdash_token_${tableId}`;
const getUrlKey = (tableId: string) => `emdash_url_${tableId}`;

interface CategoryOption { value: string; label: string; }

function getItems(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data?.data?.terms) return data.data.terms;
  if (data?.data) return data.data;
  if (data?.items) return data.items;
  return [];
}
function p1(data: any): CategoryOption[] {
  const items = getItems(data);
  if (!Array.isArray(items)) return [];
  return items.map((i: any) => ({ value: String(i.id || ''), label: i.label || i.name || i.slug || String(i.id) }));
}
function pc(children: any): CategoryOption[] {
  if (!Array.isArray(children)) return [];
  return children.map((c: any) => ({ value: String(c.id || ''), label: c.label || c.name || c.slug || String(c.id) }));
}
function ls(k: string) { try { return localStorage.getItem(k) || ''; } catch { return ''; } }
function ss(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

const st: any = {
  c: { padding: 16, fontFamily: 'system-ui,"PingFang SC","Microsoft YaHei",sans-serif', fontSize: 13, color: '#1f2329' },
  card: { background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 16, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
  fg: { marginBottom: 14 }, lb: { display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 },
  hint: { fontSize: 11, color: '#646a73', marginTop: 4 }, row: { display: 'flex', gap: 8 }, f1: { flex: 1 },
  inp: { width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #dee0e3', borderRadius: 6, outline: 'none', background: '#fff', color: '#1f2329' },
  inpD: { width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #dee0e3', borderRadius: 6, outline: 'none', background: '#f2f3f5', color: '#bbb' },
  sel: { width: '100%', padding: '8px 28px 8px 12px', fontSize: 13, border: '1px solid #dee0e3', borderRadius: 6, outline: 'none', background: '#fff', color: '#1f2329', appearance: 'none' },
  selD: { width: '100%', padding: '8px 28px 8px 12px', fontSize: 13, border: '1px solid #dee0e3', borderRadius: 6, outline: 'none', background: '#f2f3f5', color: '#bbb', cursor: 'not-allowed', appearance: 'none' },
  selW: { position: 'relative' }, arr: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #999', pointerEvents: 'none' },
  btn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' },
  btnP: { background: '#3370ff', color: '#fff', padding: '8px 16px' }, btnO: { background: '#fff', color: '#3370ff', border: '1px solid #3370ff', padding: '5px 12px', fontSize: 12 },
  btnB: { width: '100%', padding: '10px 16px', fontSize: 14 }, btnS: { padding: '5px 12px', fontSize: 12 }, btnX: { opacity: 0.5, cursor: 'not-allowed' },
  err: { padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12, background: '#fff0f0', color: '#f54a45', border: '1px solid #fdd', display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }, dotG: { background: '#20a85e' }, dotC: { background: '#ccc' }, dotO: { background: '#ff8800' },
  tag: { display: 'inline-block', padding: '2px 8px', background: '#f0f4ff', color: '#3370ff', borderRadius: 4, fontSize: 11 },
  ctr: { textAlign: 'center', marginTop: 12, fontSize: 12, color: '#646a73' },
};
function m(...os: any[]) { return Object.assign({}, ...os.filter(Boolean)); }

const ToastC: React.FC<{ msg: string; tp?: string; done: () => void }> = ({ msg, tp, done }) => {
  useEffect(() => { const t = setTimeout(done, 2500); return () => clearTimeout(t); }, [done]);
  return React.createElement('div', { style: { position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', background: tp === 'err' ? '#f54a45' : '#20a85e', boxShadow: '0 4px 12px rgba(0,0,0,0.18)', zIndex: 999, pointerEvents: 'none' } }, msg);
};

const Sel: React.FC<{ lb: string; v: string; opts: CategoryOption[]; dis: boolean; chg: (e: any) => void }> = ({ lb, v, opts, dis, chg }) => {
  const safe = Array.isArray(opts) ? opts : [];
  return React.createElement('div', { style: st.fg },
    React.createElement('div', { style: st.lb }, lb),
    React.createElement('div', { style: st.selW },
      React.createElement('select', { style: dis ? st.selD : st.sel, value: v, onChange: chg, disabled: dis },
        React.createElement('option', { value: '' }, '-- 请选择 --'),
        safe.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label))),
      React.createElement('div', { style: st.arr })));
};

export const App: React.FC = () => {
  const [tkIn, setTkIn] = useState('');
  const [ok, setOk] = useState(false);
  const [ld, setLd] = useState(false);
  const [l1, setL1] = useState<CategoryOption[]>([]);
  const [l2, setL2] = useState<CategoryOption[]>([]);
  const [l3, setL3] = useState<CategoryOption[]>([]);
  const [cmap, setCmap] = useState<Record<string, any[]>>({});
  const [tidx, setTidx] = useState<Record<string, { label: string; slug: string; ancestors: { id: string; label: string; slug: string }[] }>>({});
  const [s1, setS1] = useState(''); const [s2, setS2] = useState(''); const [s3, setS3] = useState('');
  const [bi, setBi] = useState(DEFAULT_BASE_URL);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tp?: string } | null>(null);
  const [wr, setWr] = useState(false);
  const [conf, setConf] = useState(false);
  const [uu, setUu] = useState(false);
  const initRef = useRef(false);
  const fieldCache = useRef<Record<string, string>>({});
  const tableIdRef = useRef<string>('');
  // 动态 API origin：从用户输入的 API 地址提取，不同表可用不同站点
  const baseOriginRef = useRef('https://m3.uuprints.com');
  // 动态分类树：m3 用 products，uupack 用 product
  const taxonomyNameRef = useRef('products');
  const taxonomyEncRef = useRef('product');
  // 动态集合名：m3 用 products，uupack 用 products
  const collectionRef = useRef('products');
  // 配置表驱动的映射: { 飞书列名: { emdashKey, type } }
  const mappingRef = useRef<Record<string, { key: string; type: 'string' | 'number' | 'content' }>>({});

  // 从字段列表中按中文名找字段 ID（每次都重新查找，避免跨表缓存污染）
  const getFieldId = (list: any[], ...names: string[]): string => {
    for (const n of names) {
      const f = list.find((x: any) => x.fieldName === n || x.name === n);
      if (f) return f.id;
    }
    return '';
  };
  const getFieldObj = (list: any[], ...names: string[]): any => {
    for (const n of names) {
      const f = list.find((x: any) => x.fieldName === n || x.name === n);
      if (f) return f;
    }
    return null;
  };

  useEffect(() => {
 (async () => {
      try {
        const sel = await (bitable.base as any).getSelection();
        const newTid = sel?.tableId || '';
        // 检测表切换：如果 tableId 变了，重新加载该表配置
        if (newTid !== tableIdRef.current) {
          tableIdRef.current = newTid;
          const stk = ls(getTokenKey(newTid));
          const sur = ls(getUrlKey(newTid));
          if (stk && sur) { setTkIn(stk); setBi(sur); go(stk, sur); }
          else if (sur) { setBi(sur); setTkIn(''); }
          else { setBi(''); setTkIn(''); }
          mappingRef.current = {};
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const toastFn = useCallback((msg: string, tp?: string) => setToast({ msg, tp }), []);

  const go = useCallback(async (tk: string, url: string) => {
    setLd(true); setErr(null);
    try {
      // 根据 URL 自动选择分类树名称
      const tname = getTaxonomy(url);
      taxonomyNameRef.current = tname;
      taxonomyEncRef.current = encodeURIComponent(tname);
      collectionRef.current = getCollection(url);
      console.log('[连接] 分类树:', tname, '集合:', collectionRef.current);
      const resp = await fetch(`${url}/taxonomies/${taxonomyEncRef.current}/terms`, { headers: { Authorization: `Bearer ${tk}` } });
      if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.msg || d.message || `HTTP ${resp.status}`); }
      const data = await resp.json();
      const flat = p1(data);
      if (!flat.length) throw new Error(`解析失败:\n${JSON.stringify(data).slice(0, 500)}`);
      const items = getItems(data);
      const map: Record<string, any[]> = {};
      const index: Record<string, { label: string; slug: string; ancestors: { id: string; label: string; slug: string }[] }> = {};
      const walk = (nodes: any[], anc: { id: string; label: string; slug: string }[]) => {
        for (const n of nodes) {
          const id = String(n.id || '');
          const slug = n.slug || n.name?.toLowerCase().replace(/\s+/g, '-') || '';
          map[id] = n.children || [];
          index[id] = { label: n.label || n.name || '', slug, ancestors: anc };
          if (n.children) walk(n.children, anc.concat([{ id, label: n.label || n.name || '', slug }]));
        }
      };
      walk(items, []);

      setL1(flat); setCmap(map); setTidx(index);
      setOk(true); ss(getTokenKey(tableIdRef.current), tk); ss(getUrlKey(tableIdRef.current), url);
      // 从用户输入的 API 地址提取 origin，后续所有 API 调用使用此 origin
      baseOriginRef.current = new URL(url).origin;
      console.log('[连接] API origin:', baseOriginRef.current);
      // 连接成功后加载字段映射表（用当前实际表名）
      const curId = ((await (bitable.base as any).getSelection().catch(() => ({}))) as any).tableId || '';
      const bizName = (await bitable.base.getTableMetaList()).find((t: any) => t.id === curId)?.name || '';
      await loadMappingConfig(bizName);
      toastFn('连接成功');

      // 自动回显：读取当前行的分类ID，还原选中状态
      await restoreSelection(index, map);
    } catch (e: any) { setOk(false); setErr('连接失败: ' + e.message); }
    finally { setLd(false); }
  }, [toastFn]);

  const onGo = () => { if (tkIn.trim()) go(tkIn.trim(), bi.trim() || DEFAULT_BASE_URL); };
  const onOff = () => { setOk(false); setL1([]); setL2([]); setL3([]); setCmap({}); setTidx({}); setS1(''); setS2(''); setS3(''); setErr(null); ss(getTokenKey(tableIdRef.current), ''); };

  const restoreSelection = async (
    index: Record<string, { label: string; slug: string; ancestors: { id: string; label: string; slug: string }[] }>,
    map: Record<string, any[]>
  ) => {
    try {
      const sel: any = await (bitable.base as any).getSelection();
      const { tableId, recordId } = sel;
      if (!tableId || !recordId) return;

      const table = await bitable.base.getTableById(tableId);
      const fields = await table.getFieldMetaList();
      const idFid = getFieldId(fields, '分类ID', ID_FIELD, '分类id');
      if (!idFid) { console.warn('[回显] 未找到分类ID列'); return; }

      const raw = await table.getCellValue(idFid, recordId).catch(() => null);
      // 飞书文本字段返回 IOpenSegment[]
      let catId = '';
      if (typeof raw === 'string') { catId = raw.trim(); }
      else if (typeof raw === 'number') { catId = String(raw); }
      else if (raw != null && typeof raw === 'object') {
        try {
          let txt = '';
          for (const seg of Object.values(raw)) {
            if (seg && typeof seg === 'object' && 'text' in (seg as any)) txt += (seg as any).text || '';
          }
          catId = txt.trim();
        } catch { catId = ''; }
      }
      if (!catId) return;

      const term = index[catId];
      if (!term) { console.log(`[回显] 分类ID "${catId}" 未在新分类树中找到，需重新选择`); return; }

      const ancs = term.ancestors;
      if (ancs.length >= 2) {
        // 三级分类: L1 → L2 → L3
        const l1Id = ancs[0].id; const l2Id = ancs[1].id;
        setS1(l1Id);
        setL2(pc(map[l1Id] || []));
        setS2(l2Id);
        setL3(pc(map[l2Id] || []));
        setS3(catId);
      } else if (ancs.length === 1) {
        // 二级分类
        const l1Id = ancs[0].id;
        setS1(l1Id); setL2(pc(map[l1Id] || [])); setS2(catId);
        setL3([]); setS3('');
      } else {
        // 一级分类
        setS1(catId); setL2([]); setL3([]); setS2(''); setS3('');
      }
    } catch { /* 静默失败 */ }
  };

  const on1 = (e: any) => { const v = e.target.value; setS1(v); setS2(''); setS3(''); setL3([]); setL2(v ? pc(cmap[v] || []) : []); };
  const on2 = (e: any) => {
    const v = e.target.value; setS2(v); setS3('');
    if (!v) { setL3([]); return; }
    const kids = cmap[s1] || [];
    const p = kids.find((k: any) => String(k.id) === v);
    setL3(pc(p?.children || []));
  };

  const doUpdate = async (): Promise<{ table: any; recordId: string; path: string }> => {
    const n1 = l1.find(o => o.value === s1)?.label || '';
    const n2 = l2.find(o => o.value === s2)?.label || '';
    const n3 = l3.find(o => o.value === s3)?.label || '';
    const path = [n1, n2, n3].filter(Boolean).join(' > ');

    const sel: any = await (bitable.base as any).getSelection();
    const { tableId, recordId } = sel;
    if (!tableId || !recordId) throw new Error('无法获取当前记录');

    const table = await bitable.base.getTableById(tableId);
    const fields = await table.getFieldMetaList();

    // 写分类路径
    const pfid = getFieldId(fields, PATH_FIELD);
    if (pfid) await table.setCellValue(pfid, recordId, path);

    // 写分类ID
    const idfid = getFieldId(fields, ID_FIELD);
    if (idfid) await table.setCellValue(idfid, recordId, s3);

    return { table, recordId, path };
  };

  const onWrite = async () => {
    if (!s3) { setErr('请完整选择三级分类'); return; }
    setWr(true); setErr(null);
    try {
      await doUpdate();
      toastFn('写入成功');
    } catch (e: any) { setErr('写入失败: ' + e.message); }
    finally { setWr(false); }
  };

  // ---- 共享工具 ----
  const readCell = (v: any): string => {
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number') return String(v);
    if (v != null && typeof v === 'object') {
      try {
        let txt = '';
        for (const seg of Object.values(v)) {
          if (seg && typeof seg === 'object' && 'text' in (seg as any)) txt += (seg as any).text || '';
        }
        return txt.trim();
      } catch { return ''; }
    }
    return '';
  };

  // ---- 核心：根据当前业务表名自动查找映射表 ----
  const loadMappingConfig = async (bizTableName?: string) => {
    try {
      const tables = await bitable.base.getTableMetaList();
      let mapTable: any;
      if (bizTableName) {
        // 找名称同时包含当前表名 + "映射" 的表（如"数据表1-映射表"/"数据表2-映射表"）
        mapTable = tables.find((t: any) => {
          const n = t.name || '';
          return n.includes(bizTableName) && n.includes('映射');
        });
        if (!mapTable) console.warn(`[映射] 未找到同时含"${bizTableName}"和"映射"的表`);
      } else {
        // 兜底：找名称包含"映射"的表
        mapTable = tables.find((t: any) => (t.name || '').includes('映射'));
      }
      if (!mapTable) { console.warn('[映射] 未找到映射表'); return 0; }
      console.log(`[映射] 使用表: "${mapTable.name}"`);
      const t = await bitable.base.getTableById(mapTable.id);
      const fields = await t.getFieldMetaList();
      const feishuFid = fields.find((f: any) => (f.fieldName || f.name || '').includes('列名'))?.id || '';
      const emdashFid = fields.find((f: any) => /emdash/i.test(f.fieldName || f.name || ''))?.id || '';
      if (!feishuFid || !emdashFid) { console.warn('[映射] 未找到列名或EmDash字段名列'); return 0; }
      const records = await t.getRecordIdList();
      console.log(`[映射] 映射表共 ${records.length} 行`);
      mappingRef.current = {};
      let count = 0;
      for (const rid of records) {
        const feishuName = readCell(await t.getCellValue(feishuFid, rid).catch(() => null));
        const emdashKey = readCell(await t.getCellValue(emdashFid, rid).catch(() => null));
        if (!feishuName || !emdashKey) continue;
        const type: 'string' | 'number' | 'content' = EMDASH_NUMERIC.has(emdashKey) ? 'number' : EMDASH_CONTENT.has(emdashKey) ? 'content' : 'string';
        mappingRef.current[feishuName] = { key: emdashKey, type };
        count++;
      }
      console.log(`[映射] 加载 ${count} 条映射:`, JSON.stringify(mappingRef.current));
      return count;
    } catch (e: any) { console.error('[映射] 加载失败:', e.message); return 0; }
  };

  const EMDASH_NUMERIC = new Set(['price']);
  const EMDASH_CONTENT = new Set(['content']);
  const EMDASH_BLACKLIST = new Set([
    '分类', '分类ID', '分类 ID', 'Update', 'update_time', '分类路径',
  ]);

  // 从飞书字段列表构建 fieldId → { emdashKey, type } 映射
  const buildFidToEmdash = (fields: any[]): Record<string, { key: string; type: 'string' | 'number' | 'content' }> => {
    const map: Record<string, { key: string; type: 'string' | 'number' | 'content' }> = {};
    for (const f of fields) {
      const name = (f.fieldName || f.name || '').trim();
      if (EMDASH_BLACKLIST.has(name) || EMDASH_BLACKLIST.has(name.toLowerCase())) continue;
      const cfg = mappingRef.current[name];
      if (!cfg) continue;
      map[f.id] = cfg;
    }
    return map;
  };

  // 从飞书记录读取所有映射字段值，组装 EmDash data payload
  const assembleEmdashData = async (
    table: any, recordId: string, fid2em: Record<string, { key: string; type: 'string' | 'number' | 'content' }>,
    ensureTitle: boolean
  ): Promise<{ data: Record<string, any>; titleOk: boolean }> => {
    const data: Record<string, any> = {};
    let titleOk = false;
    for (const [fid, cfg] of Object.entries(fid2em)) {
      try {
        const raw = await table.getCellValue(fid, recordId).catch(() => null);
        // 处理飞书字段：文本/数字/多选/附件等
        let val: any = null;
        if (raw === null || raw === undefined || raw === '') { /* skip */ }
        else if (Array.isArray(raw)) {
          // 飞书多选/附件/成员/多行文本→数组
          const texts = raw.map((x: any) => (x && typeof x === 'object' ? (x.text || x.name || x.label || '') : String(x))).filter(Boolean);
          if (cfg.key === 'duoxuan') { val = texts; }
          else if (cfg.key === 'danxuan') { val = texts[0] || null; }
          else {
            // JSON/多行文本：直接拼接，不用逗号分隔
            val = texts.join('');
          }
        } else if (typeof raw === 'object') {
          // 处理单选 {id, text} 和多行文本 IOpenSegment[]
          if ('text' in (raw as any) && 'id' in (raw as any)) {
            // 单选字段直接取 text
            val = (raw as any).text || null;
          } else {
            let txt = '';
            for (const seg of Object.values(raw)) {
              if (seg && typeof seg === 'object' && 'text' in (seg as any)) txt += (seg as any).text || '';
            }
            val = txt.trim() || null;
          }
        } else {
          val = raw;
        }
        if (val === null || val === '' || (Array.isArray(val) && val.length === 0)) continue;

        if (cfg.type === 'content') {
          data[cfg.key] = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(val) }] }] };
        } else if (cfg.type === 'number') {
          const n = typeof val === 'number' ? val : parseFloat(String(val));
          if (!isNaN(n)) data[cfg.key] = n;
        } else {
          data[cfg.key] = cfg.key === 'danxuan' ? String(val) : (Array.isArray(val) ? val : String(val));
        }
        if (cfg.key === 'title') titleOk = true;
      } catch { /* skip */ }
    }
    if (ensureTitle && !titleOk) { data.title = '未命名'; }
    return { data, titleOk };
  };

  // 按字段显示名查找字段 ID（不使用缓存，每次重新查找避免缓存污染）
  const findFieldId = (fields: any[], ...names: string[]): string => {
    for (const n of names) {
      const f = fields.find((x: any) => x.fieldName === n || x.name === n);
      if (f) return f.id;
    }
    return '';
  };

  // 从标题生成 URL 友好的 slug
  const makeSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff\-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || `entry-${Date.now()}`;
  };

  const createPage = async (table: any, fields: any[], recordId: string, emdashFid: string): Promise<string> => {
    console.log('[createPage] 开始建页面，recordId:', recordId);
    const fid2em = buildFidToEmdash(fields);
    const { data: fullData } = await assembleEmdashData(table, recordId, fid2em, true);
    if (!fullData.title) fullData.title = '未命名';
    console.log('[createPage] 映射字段:', JSON.stringify(Object.keys(fid2em)), '组装数据 keys:', JSON.stringify(Object.keys(fullData)));

    const apiUrl = `${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}`;
    console.log('[createPage] API URL:', apiUrl);
    console.log('[createPage] collection:', collectionRef.current, 'origin:', baseOriginRef.current);

    // 构建 payload：EmDash POST 要求三个顶层字段 — data(内容)、slug(URL标识)、status(状态)
    const makePayload = (data: Record<string, any>) => {
      const safe: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && (v as any).type === 'doc') continue;
        safe[k] = v;
      }
      return {
        data: safe,
        slug: makeSlug(safe.title || fullData.title || 'untitled'),
        status: 'draft',
      };
    };

    const doPost = async (label: string, payload: any): Promise<{ id?: string; status?: number; text?: string }> => {
      const body = JSON.stringify(payload);
      console.log(`[createPage] ${label} body 长度:`, body.length, 'bytes, keys:', JSON.stringify(Object.keys(payload)));
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
        body,
      });
      const text = await resp.text().catch(() => '');
      console.log(`[createPage] ${label} 响应:`, resp.status, text.slice(0, 500));
      if (resp.status >= 200 && resp.status < 300) {
        try {
          const d = JSON.parse(text);
          const paths = [d?.id, d?.data?.id, d?.data?.item?.id, d?.data?.item, d?.pageId];
          let id = '';
          for (const p of paths) { if (p) { id = String(p); break; } }
          if (!id) {
            const search = (obj: any): string => {
              if (!obj || typeof obj !== 'object') return '';
              if (obj.id && typeof obj.id === 'string' && obj.id.startsWith('01')) return obj.id;
              for (const v of Object.values(obj)) { const r = search(v); if (r) return r; }
              return '';
            };
            id = search(d);
          }
          if (id) { console.log('[createPage] 拿到 pageId:', id); return { id }; }
        } catch { /* fall through */ }
      }
      return { status: resp.status, text };
    };

    // 带 slug 冲突重试的 POST 封装
    const postWithSlugRetry = async (
      label: string, payload: any, baseSlug: string, maxRetries = 5
    ): Promise<string | null> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (attempt > 1) payload.slug = `${baseSlug}-${attempt}`;
        const result = await doPost(`${label} (尝试${attempt})`, payload);
        if (result.id) return result.id;
        // 只有 409 SLUG_CONFLICT 才值得重试，其他错误直接放弃
        if (result.status !== 409) break;
        console.log(`[createPage] ${label} slug 冲突(${payload.slug}), 尝试 -${attempt+1}`);
      }
      return null;
    };

    // 策略1: 完整 payload（含 slug），自动重试 slug 冲突
    let fullPayload = makePayload(fullData);
    let baseSlug = fullPayload.slug;
    let id = await postWithSlugRetry('策略1-完整', fullPayload, baseSlug);

    // 策略2: 仅 title + slug，自动重试 slug 冲突
    if (!id) {
      id = await postWithSlugRetry('策略2-最小', {
        data: { title: fullData.title },
        slug: baseSlug,
        status: 'draft',
      }, baseSlug);
    }

    // 策略3: 随机 slug 兜底
    if (!id) {
      const randomSlug = `entry-${Date.now()}`;
      id = await postWithSlugRetry('策略3-兜底', {
        data: {},
        slug: randomSlug,
        status: 'draft',
      }, '', 1); // 随机 slug 几乎不冲突，试一次即可
    }

    if (!id) {
      throw new Error(`创建页面失败（3条策略均未成功），请查看控制台日志`);
    }

    // 创建成功后用 PUT 补全完整字段数据（如果策略2/3 成功但数据不全）
    if (Object.keys(fullData).length > 1 || (fullData.title && Object.keys(fullData).length > 0)) {
      try {
        const fullPayload = makePayload(fullData);
        delete (fullPayload as any).slug; // PUT 不需要 slug
        const putResp = await fetch(`${apiUrl}/${id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(fullPayload),
        });
        const putBody = await putResp.text().catch(() => '');
        console.log('[createPage] PUT 补全响应:', putResp.status, putBody.slice(0, 300));
        if (!putResp.ok) {
          console.warn('[createPage] PUT 补全失败（页面已创建，字段需在 EmDash 后台添加）');
        }
      } catch (e) { console.warn('[createPage] PUT 补全网络错误:', e); }
    }

    if (emdashFid) await table.setCellValue(emdashFid, recordId, id);
    return id;
  };

  const resolveTermIds = (): string[] => {
    const term = tidx[s3];
    if (!term) throw new Error(`分类 ID ${s3} 不存在`);
    const ids: string[] = [];
    const ancs = term.ancestors;
    if (Array.isArray(ancs)) for (const a of ancs) ids.push(String(a.id));
    ids.push(String(s3));
    return ids;
  };

  const resolveTermSlugs = (): string[] => {
    const term = tidx[s3];
    if (!term) return [];
    const slugs: string[] = [];
    const ancs = term.ancestors;
    if (Array.isArray(ancs)) for (const a of ancs) if (a.slug) slugs.push(a.slug);
    if (term.slug) slugs.push(term.slug);
    return slugs;
  };

  // ---- 按钮 A: 修改分类确认 ----
  const onConfirm = async () => {
    if (!s3) { setErr('请完整选择三级分类'); return; }
    setConf(true); setErr(null);
    try {
      // 动作1: 更新飞书分类字段
      const { table, recordId } = await doUpdate();

      // 提前加载映射表和业务表名（createPage 和后续 PUT 都需要完整映射）
      const curTableId = ((await (bitable.base as any).getSelection().catch(() => ({}))) as any).tableId || '';
      const bizName = (await bitable.base.getTableMetaList()).find((t: any) => t.id === curTableId)?.name || '';
      await loadMappingConfig(bizName);
      try { localStorage.removeItem('fid2emdash_v1'); } catch { /* ignore */ }

      // 确保有 Emdash ID（映射已加载，createPage 可传完整字段）
      const fields = await table.getFieldMetaList();
      const emdashFid = getFieldId(fields, ...EMDASH_ID_NAMES);
      let pageId = readCell(emdashFid ? await table.getCellValue(emdashFid, recordId).catch(() => null) : null);
      if (!pageId) pageId = await createPage(table, fields, recordId, emdashFid);

      // 提交分类 termIds（同步等待，失败时可见错误）
      const termIds = resolveTermIds();
      console.log('[修改分类提交] pageId:', pageId, 'termIds:', JSON.stringify(termIds));
      const tr = await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}/terms/${taxonomyEncRef.current}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ termIds }),
      });
      const tb = await tr.text();
      console.log('[修改分类提交] 分类响应:', tr.status, tb.slice(0, 300));
      if (!tr.ok) throw new Error(`分类关联失败 HTTP ${tr.status}: ${tb.slice(0, 200)}`);

      const allFields = await table.getFieldMetaList();
      // 映射已在上面加载，直接复用 bizName

      console.log('[修改分类确认] 当前表:', bizName, 'tableId:', curTableId);
      for (const f of allFields) console.log(`  ${f.id} = "${f.fieldName || f.name}"`);

      const fid2em = buildFidToEmdash(allFields);
      console.log('[修改分类确认] 字段→EmDash 映射:', JSON.stringify(Object.fromEntries(Object.entries(fid2em).map(([fid, c]) => [fid, c.key]))));

      const { data: emdashData, titleOk } = await assembleEmdashData(table, recordId, fid2em, false);
      if (!titleOk && !emdashData.title) emdashData.title = '未命名';
      console.log('[修改分类确认] PUT payload:', JSON.stringify({ data: emdashData }).slice(0, 1000));

      // EmDash 对多选字段是追加而非覆盖，先清空再写入避免旧值残留
      if (emdashData.duoxuan !== undefined) {
        await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { duoxuan: [] } }),
        });
      }
      if (emdashData.danxuan !== undefined) {
        await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { danxuan: null } }),
        });
      }

      const resp = await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: emdashData }),
      });
      // 如果 404（Emdash ID 来自其他表/已删除），清除旧 ID 并重建
      if (resp.status === 404) {
        console.log('[修改分类提交] 产品 404，重建中...');
        if (emdashFid) await table.setCellValue(emdashFid, recordId, '').catch(() => {});
        pageId = await createPage(table, fields, recordId, emdashFid);
        // 重建后重新 PUT
        const resp2 = await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: emdashData }),
        });
        if (!resp2.ok) { const e = await resp2.text().catch(() => ''); throw new Error(`重建产品 HTTP ${resp2.status}: ${e.slice(0, 200)}`); }
      } else if (!resp.ok) {
        const e = await resp.text().catch(() => '');
        throw new Error(`提交完整记录 HTTP ${resp.status}: ${e.slice(0, 200)}`);
      }

      // 发布页面（默认状态是 draft，Post 到 publish 端点改为 published）
      await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tkIn}` },
      });

      toastFn('提交成功');
    } catch (e: any) { setErr('提交失败: ' + e.message); }
    finally { setConf(false); }
  };

  // ---- 按钮 B: UU要更（批量模式） ----
  const onUuUpdate = async () => {
    console.log('=== UU v0.5.0 批量 ===');
    setUu(true); setErr(null);
    try {
      const sel: any = await (bitable.base as any).getSelection();
      const { tableId } = sel;
      if (!tableId) throw new Error('无法获取当前表格');

      const table = await bitable.base.getTableById(tableId);
      const fields = await table.getFieldMetaList();
      // 根据当前业务表名加载对应映射表
      const bizName = (await bitable.base.getTableMetaList()).find((t: any) => t.id === tableId)?.name || '';
      await loadMappingConfig(bizName);
      const emdashFid = getFieldId(fields, ...EMDASH_ID_NAMES);
      const updateFid = getFieldId(fields, ...UPDATE_FIELD_NAMES);
      if (!updateFid) throw new Error('Update 字段不存在');

      // 一次性获取 Update 列全表值，无需逐条查
      const updateField = await table.getFieldById(updateFid);
      const allVals = await updateField.getFieldValueList();
      console.log('[UU批量] Update 列共', allVals.length, '条记录');

      // 筛选 Update = "UU要更" 的记录
      const uu: string[] = [];
      for (const fv of allVals) {
        if (!fv.record_id) continue;
        const v = fv.value;
        if (Array.isArray(v)) {
          if (v.some((o: any) => o.text === 'UU要更' || o.name === 'UU要更')) uu.push(fv.record_id);
        } else if (typeof v === 'string' && v === 'UU要更') {
          uu.push(fv.record_id);
        }
      }
      if (uu.length === 0) { toastFn('没有需要更新的记录'); return; }
      console.log('[UU批量] 找到', uu.length, '条待处理');

      // 预取 Update 字段配置（写回用）
      const updateFieldObj = getFieldObj(fields, ...UPDATE_FIELD_NAMES);
      const utype = updateFieldObj?.type || updateFieldObj?.fieldType || '';
      const opts = updateFieldObj?.property?.options || [];
      const doneOpt = opts.find((o: any) => o.name === 'UU已更');
      const doneVal: any = doneOpt ? [{ id: doneOpt.id, text: doneOpt.name }] : [{ text: 'UU已更' }];

      let ok = 0, fail = 0;
      // 预建字段映射（所有记录共用同一张表的字段结构）
      const fid2em = buildFidToEmdash(fields);
      const catIdFid = getFieldId(fields, ID_FIELD);

      // ========== 自动同步删除：找出已从飞书删除但仍留在 EmDash 的记录 ==========
      try {
        // 1. 读取飞书所有记录的 Emdash ID
        const emdashFidObj = emdashFid ? await table.getFieldById(emdashFid).catch(() => null) : null;
        const feishuIds: Set<string> = new Set();
        if (emdashFidObj) {
          const allIds = await emdashFidObj.getFieldValueList().catch(() => []) as any[];
          for (const fv of allIds) {
            const val = readCell(fv.value);
            if (val && typeof val === 'string' && val.startsWith('01')) feishuIds.add(val);
          }
        }
        // 2. 从 EmDash 获取所有产品 ID
        const emdashResp = await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}?limit=500`, {
          headers: { Authorization: `Bearer ${tkIn}` },
        });
        if (emdashResp.ok) {
          const emdashData = await emdashResp.json();
          const items: any[] = emdashData?.data?.items || emdashData?.data || [];
          if (items.length > feishuIds.size / 2) { // 确保取到了数据
            for (const item of items) {
              const id = item?.id || item?.item?.id || '';
              // 如果 EmDash 有 ID、但这个 ID 不在飞书表中 → 说明飞书已删除
              if (id && id.startsWith('01') && !feishuIds.has(id)) {
                console.log('[UU批量] 自动删除 EmDash 孤立记录:', id, item?.data?.title || '');
                await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${id}/trash`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${tkIn}` },
                }).catch(e => console.warn('[UU批量] 删除失败:', id, e.message));
                await new Promise(r => setTimeout(r, 200)); // 避免太快
              }
            }
          }
        }
      } catch (e) { console.warn('[UU批量] 删除同步异常:', e); }
      // ========== 删除同步结束 ==========

      for (let i = 0; i < uu.length; i++) {
        const rid = uu[i];
        try {
          let pageId = readCell(emdashFid ? await table.getCellValue(emdashFid, rid).catch(() => null) : null);

          // 无 ID：调用 createPage 创建页面（内置三策略容错：完整字段→title+status→title）
          if (!pageId) {
            pageId = await createPage(table, fields, rid, emdashFid);
            console.log('[UU批量] 新建页面', pageId);
          }

          // 无论是否新建页面，都提交本条完整记录到 EmDash
          const { data: emdashData } = await assembleEmdashData(table, rid, fid2em, false);
          if (Object.keys(emdashData).length > 0) {
            const putResp = await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: emdashData }),
            });
            // 如果页面已删除（404），清除旧 ID 并重建
            if (putResp.status === 404) {
              console.warn('[UU批量] 页面 404，清除旧 ID 重建');
              if (emdashFid) await table.setCellValue(emdashFid, rid, '').catch(() => {});
              pageId = await createPage(table, fields, rid, emdashFid);
              // 重建后重新 PUT
              const retryResp = await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: emdashData }),
              });
              if (!retryResp.ok) {
                const e = await retryResp.text().catch(() => '');
                throw new Error(`重建产品 HTTP ${retryResp.status}: ${e.slice(0, 200)}`);
              }
            } else if (!putResp.ok) {
              const e = await putResp.text().catch(() => '');
              throw new Error(`更新产品 HTTP ${putResp.status}: ${e.slice(0, 200)}`);
            }
          }
          // 如果已写入分类ID，同步到 EmDash 分类树（分类始终走 pages）
          try {
            const catId = readCell(catIdFid ? await table.getCellValue(catIdFid, rid).catch(() => null) : null);
            if (catId && tidx[catId]) {
              const ids: string[] = [];
              const ancs = tidx[catId].ancestors;
              if (Array.isArray(ancs)) for (const a of ancs) ids.push(String(a.id));
              ids.push(String(catId));
              const tr = await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}/terms/${taxonomyEncRef.current}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${tkIn}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ termIds: ids }),
              });
              console.log('[UU批量] 分类:', tr.ok ? 'OK' : `${tr.status}`);
            }
          } catch { /* 失败不阻断 */ }

          // 发布页面
          await fetch(`${baseOriginRef.current}/_emdash/api/content/${collectionRef.current}/${pageId}/publish`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tkIn}` },
          });

          if (utype === 4 || utype === 'MultiSelect') {
            await table.setCellValue(updateFid, rid, doneVal);
          } else {
            await table.setCellValue(updateFid, rid, 'UU已更');
          }
          ok++;
        } catch (e: any) {
          console.error('[UU批量] 记录', rid.slice(0, 8), '失败:', e.message);
          fail++;
        }
      }
      toastFn(`批量完成: ${ok} 成功, ${fail} 失败`);
    } catch (err: any) { setErr('UU批量失败: ' + err.message); }
    finally { setUu(false); }
  };

  const s1l = s1 ? l1.find(o => o.value === s1)?.label : '';
  const s2l = s2 ? l2.find(o => o.value === s2)?.label : '';
  const s3l = s3 ? l3.find(o => o.value === s3)?.label : '';
  const canW = !!(s3 && ok && !wr);
  const canC = !!(s3 && ok && !conf);
  const canU = !!(ok && !uu);

  return React.createElement('div', { style: st.c },
    toast && React.createElement(ToastC, { msg: toast.msg, tp: toast.tp, done: () => setToast(null) }),

    React.createElement('div', { style: st.card },
      React.createElement('div', { style: st.title },
        React.createElement('span', { style: m(st.dot, ld ? st.dotO : ok ? st.dotG : st.dotC) }), 'EmDash API 连接'),
      React.createElement('div', { style: st.fg },
        React.createElement('div', { style: st.lb }, 'API 地址'),
        React.createElement('input', { type: 'text', style: ok ? st.inpD : st.inp, value: bi, onChange: (e: any) => setBi(e.target.value), placeholder: DEFAULT_BASE_URL, disabled: ok })),
      React.createElement('div', { style: st.fg },
        React.createElement('div', { style: st.lb }, 'API Token'),
        React.createElement('div', { style: st.row },
          React.createElement('input', { type: 'password', style: m(ok ? st.inpD : st.inp, st.f1), value: tkIn, onChange: (e: any) => setTkIn(e.target.value), placeholder: '输入 EmDash API Token', disabled: ok }),
          ok ? React.createElement('button', { style: m(st.btn, st.btnO, st.btnS), onClick: onOff }, '断开') :
            React.createElement('button', { style: m(st.btn, st.btnP, st.btnS, (!tkIn.trim() || ld) ? st.btnX : {}), onClick: onGo, disabled: !tkIn.trim() || ld }, ld ? '连接中...' : '连接')),
        React.createElement('div', { style: st.hint }, 'Token 自动保存，下次打开自动连接'))),

    err && React.createElement('div', { style: st.err },
      React.createElement('span', { style: st.f1 }, err),
      React.createElement('button', { style: m(st.btn, st.btnO, st.btnS, { borderColor: '#fcc', color: '#c00' }), onClick: () => setErr(null) }, '关闭')),

    React.createElement('div', { style: st.card },
      React.createElement('div', { style: st.title }, '分类选择'),
      React.createElement(Sel, { lb: '一级分类', v: s1, opts: l1, dis: !ok || !l1.length, chg: on1 }),
      React.createElement(Sel, { lb: '二级分类', v: s2, opts: l2, dis: !s1 || !l2.length, chg: on2 }),
      React.createElement(Sel, { lb: '三级分类', v: s3, opts: l3, dis: !s2 || !l3.length, chg: (e: any) => setS3(e.target.value) }),
      s3 && React.createElement('div', { style: { marginTop: 8, fontSize: 12, color: '#646a73' } },
        '已选：', React.createElement('span', { style: st.tag }, s3l), ' | 路径：', React.createElement('span', { style: st.tag }, `${s1l} > ${s2l} > ${s3l}`))),

    React.createElement('div', { style: m(st.row) },
      React.createElement('button', {
        style: m(st.btn, st.btnP, st.f1, !canW ? st.btnX : {}),
        onClick: onWrite, disabled: !canW
      }, wr ? '写入中...' : '分类写入'),
      React.createElement('button', {
        style: m(st.btn, { background: '#20a85e', color: '#fff', padding: '10px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }, st.f1, !canC ? st.btnX : {}),
        onClick: onConfirm, disabled: !canC
      }, conf ? React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
        React.createElement('span', { style: { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' } }),
        '提交中...'
      ) : '修改分类 提交'),
      React.createElement('button', {
        style: m(st.btn, { background: '#ff8800', color: '#fff', padding: '10px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap' }, st.f1, !canU ? st.btnX : {}),
        onClick: onUuUpdate, disabled: !canU
      }, uu ? React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
        React.createElement('span', { style: { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' } }),
        '提交中...'
      ) : 'UU要更 提交')
    ),

    !ok && React.createElement('div', { style: st.ctr }, '请先输入 Token 并点击"连接"')
  );
};

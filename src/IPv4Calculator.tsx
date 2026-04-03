import { useState, useEffect } from 'react'
import { Calculator, Plus, Trash2, Copy, ChevronDown, ChevronUp, Sun, Moon, Languages } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'IPv4 Subnet Calculator',
    subtitle: 'Calculate subnet information and perform VLSM division. Everything runs client-side.',
    subnetCalc: 'Subnet Calculator',
    subnetDesc: 'Enter a CIDR block (e.g. 192.168.1.0/24)',
    cidrLabel: 'IPv4 Block (CIDR)',
    calculate: 'Calculate',
    usableHosts: 'usable hosts',
    network: 'Network',
    broadcast: 'Broadcast',
    firstUsable: 'First usable IP',
    lastUsable: 'Last usable IP',
    subnetMask: 'Subnet mask',
    wildcardMask: 'Wildcard mask',
    totalHosts: 'Total hosts',
    inputIp: 'Input IP',
    binaryRep: 'Binary representation',
    ip: 'IP',
    mask: 'Mask',
    net: 'Network',
    vlsmTitle: 'VLSM Calculator',
    vlsmDesc: 'Divide a network into variable-length subnets',
    baseNetwork: 'Base network (optional, uses the field above if empty)',
    subnetsNeeded: 'Required subnets',
    namePlaceholder: 'Name (e.g. Servers)',
    hosts: 'Hosts',
    addSubnet: 'Add subnet',
    calcVlsm: 'Calculate VLSM',
    subnet: 'Subnet',
    copied: 'copied',
    errorInvalid: 'Invalid address. Use format: 192.168.1.0/24',
    errorSubnet: 'Add at least one subnet.',
    errorOverflow: 'Network too small for the requested subnets.',
    builtBy: 'Built by',
  },
  pt: {
    title: 'Calculadora IPv4',
    subtitle: 'Calcule informacoes de sub-rede e realize divisao VLSM. Tudo roda no navegador.',
    subnetCalc: 'Calculadora de Sub-rede',
    subnetDesc: 'Informe um bloco no formato CIDR (ex.: 192.168.1.0/24)',
    cidrLabel: 'Bloco IPv4 (CIDR)',
    calculate: 'Calcular',
    usableHosts: 'hosts utilizaveis',
    network: 'Rede',
    broadcast: 'Broadcast',
    firstUsable: 'Primeiro IP util',
    lastUsable: 'Ultimo IP util',
    subnetMask: 'Mascara de sub-rede',
    wildcardMask: 'Mascara curinga',
    totalHosts: 'Total de hosts',
    inputIp: 'IP informado',
    binaryRep: 'Representacao binaria',
    ip: 'IP',
    mask: 'Mascara',
    net: 'Rede',
    vlsmTitle: 'Calculadora VLSM',
    vlsmDesc: 'Divida uma rede em sub-redes de tamanhos diferentes',
    baseNetwork: 'Rede base (opcional, usa o campo acima se vazio)',
    subnetsNeeded: 'Sub-redes necessarias',
    namePlaceholder: 'Nome (ex.: Servidores)',
    hosts: 'Hosts',
    addSubnet: 'Adicionar sub-rede',
    calcVlsm: 'Calcular VLSM',
    subnet: 'Sub-rede',
    copied: 'copiado',
    errorInvalid: 'Endereco invalido. Use o formato: 192.168.1.0/24',
    errorSubnet: 'Adicione pelo menos uma sub-rede.',
    errorOverflow: 'Rede insuficiente para acomodar as sub-redes solicitadas.',
    builtBy: 'Criado por',
  }
} as const
type Lang = keyof typeof translations

// ── IPv4 helpers ─────────────────────────────────────────────────────────────
function ipToInt(ip: string) { return ip.split('.').reduce((a, o) => (a << 8) + parseInt(o, 10), 0) >>> 0 }
function intToIp(n: number) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.') }
function ipToBinary(ip: string) { return ip.split('.').map(o => parseInt(o, 10).toString(2).padStart(8, '0')).join('.') }
function maskFromPrefix(p: number) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0 }
function wildcardFromMask(m: number) { return (~m) >>> 0 }
function calcNet(ip: number, mask: number) { return (ip & mask) >>> 0 }
function calcBcast(net: number, mask: number) { return (net | wildcardFromMask(mask)) >>> 0 }

function parseCIDR(input: string) {
  const [ipStr, prefixStr] = input.trim().split('/')
  const prefix = parseInt(prefixStr, 10)
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null
  const octets = ipStr?.split('.')
  if (octets?.length !== 4) return null
  for (const o of octets) { const n = parseInt(o, 10); if (isNaN(n) || n < 0 || n > 255) return null }
  return { ip: ipStr, prefix }
}

function calculateSubnet(input: string) {
  const parsed = parseCIDR(input)
  if (!parsed) return null
  const { ip, prefix } = parsed
  const ipInt = ipToInt(ip), maskInt = maskFromPrefix(prefix), wildInt = wildcardFromMask(maskInt)
  const netInt = calcNet(ipInt, maskInt), broadInt = calcBcast(netInt, maskInt)
  const totalHosts = prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.pow(2, 32 - prefix) - 2
  return {
    network: intToIp(netInt), broadcast: intToIp(broadInt), mask: intToIp(maskInt), wildcard: intToIp(wildInt),
    firstUsable: prefix >= 31 ? intToIp(netInt) : intToIp(netInt + 1),
    lastUsable: prefix >= 31 ? intToIp(broadInt) : intToIp(broadInt - 1),
    totalHosts, prefix, input: ip,
    ipBinary: ipToBinary(ip), maskBinary: ipToBinary(intToIp(maskInt)), netBinary: ipToBinary(intToIp(netInt)),
  }
}

function calculateVLSM(baseNetwork: string, subnets: { name: string; hosts: number }[]) {
  const parsed = parseCIDR(baseNetwork)
  if (!parsed) return null
  const sorted = [...subnets].sort((a, b) => b.hosts - a.hosts)
  const results: any[] = []
  let current = ipToInt(parsed.ip) & maskFromPrefix(parsed.prefix)
  for (const sub of sorted) {
    let bits = 0; while (Math.pow(2, bits) < sub.hosts + 2) bits++
    const prefix = 32 - bits
    if (prefix < parsed.prefix) return null
    const maskInt = maskFromPrefix(prefix), netInt = current, broadInt = calcBcast(netInt, maskInt)
    results.push({
      name: sub.name || `Subnet ${results.length + 1}`,
      network: intToIp(netInt) + `/${prefix}`, firstUsable: intToIp(netInt + 1),
      lastUsable: intToIp(broadInt - 1), broadcast: intToIp(broadInt),
      mask: intToIp(maskInt), hosts: Math.pow(2, bits) - 2,
    })
    current = (broadInt + 1) >>> 0
  }
  return results
}

// ── ResultRow ────────────────────────────────────────────────────────────────
function ResultRow({ label, value, mono = true, copiedText = 'copied' }: { label: string; value: string; mono?: boolean; copiedText?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-200 dark:border-zinc-800 last:border-0 px-4">
      <span className="text-sm text-zinc-500 dark:text-zinc-400 w-44 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="shrink-0 rounded p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
          <Copy size={12} />
        </button>
        {copied && <span className="text-[10px] text-blue-500 shrink-0">{copiedText}</span>}
      </div>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────
export default function IPv4Calculator() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [input, setInput] = useState('192.168.1.0/24')
  const [result, setResult] = useState<ReturnType<typeof calculateSubnet>>(null)
  const [error, setError] = useState('')
  const [showBin, setShowBin] = useState(false)
  const [vlsmBase, setVlsmBase] = useState('')
  const [vlsmSubs, setVlsmSubs] = useState([{ name: '', hosts: '' }])
  const [vlsmResult, setVlsmResult] = useState<any[] | null>(null)
  const [vlsmError, setVlsmError] = useState('')

  const t = translations[lang]
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const handleCalc = () => {
    const r = calculateSubnet(input)
    if (!r) { setError(t.errorInvalid); setResult(null) } else { setError(''); setResult(r) }
  }

  const handleVLSM = () => {
    const subs = vlsmSubs.map(s => ({ name: s.name, hosts: parseInt(s.hosts, 10) })).filter(s => s.hosts > 0)
    if (!subs.length) { setVlsmError(t.errorSubnet); return }
    const r = calculateVLSM(vlsmBase || input, subs)
    if (!r) { setVlsmError(t.errorOverflow); setVlsmResult(null) } else { setVlsmError(''); setVlsmResult(r) }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><Calculator size={18} className="text-white" /></div>
            <span className="font-semibold">IPv4 Calculator</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"><Languages size={14} />{lang.toUpperCase()}</button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <a href="https://github.com/gmowses/ipv4-calculator" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Subnet Calculator */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
            <div><h2 className="font-semibold">{t.subnetCalc}</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">{t.subnetDesc}</p></div>
            <div className="flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCalc()}
                placeholder="192.168.1.0/24"
                className="flex-1 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={handleCalc} className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 h-10 text-sm font-medium text-white hover:bg-blue-600 transition-colors"><Calculator size={15} />{t.calculate}</button>
            </div>
            {error && <p className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">/{result.prefix}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">{result.totalHosts.toLocaleString()} {t.usableHosts}</span>
                </div>
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <ResultRow label={t.network} value={`${result.network}/${result.prefix}`} copiedText={t.copied} />
                  <ResultRow label={t.broadcast} value={result.broadcast} copiedText={t.copied} />
                  <ResultRow label={t.firstUsable} value={result.firstUsable} copiedText={t.copied} />
                  <ResultRow label={t.lastUsable} value={result.lastUsable} copiedText={t.copied} />
                  <ResultRow label={t.subnetMask} value={result.mask} copiedText={t.copied} />
                  <ResultRow label={t.wildcardMask} value={result.wildcard} copiedText={t.copied} />
                  <ResultRow label={t.totalHosts} value={result.totalHosts.toLocaleString()} mono={false} copiedText={t.copied} />
                  <ResultRow label={t.inputIp} value={result.input} copiedText={t.copied} />
                </div>
                <button onClick={() => setShowBin(b => !b)} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                  {showBin ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{t.binaryRep}
                </button>
                {showBin && (
                  <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-4 space-y-2 overflow-x-auto">
                    {[{ label: t.ip, val: result.ipBinary }, { label: t.mask, val: result.maskBinary }, { label: t.net, val: result.netBinary }].map(({ label, val }) => (
                      <div key={label} className="flex items-center gap-3 text-xs"><span className="w-16 shrink-0 text-zinc-400">{label}</span><span className="font-mono whitespace-nowrap">{val}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VLSM */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
            <div><h2 className="font-semibold">{t.vlsmTitle}</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">{t.vlsmDesc}</p></div>
            <input value={vlsmBase} onChange={e => setVlsmBase(e.target.value)} placeholder="10.0.0.0/16"
              className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="space-y-2">
              <p className="text-sm font-medium">{t.subnetsNeeded}</p>
              {vlsmSubs.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input value={row.name} onChange={e => setVlsmSubs(s => s.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))} placeholder={t.namePlaceholder}
                    className="flex-1 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" value={row.hosts} onChange={e => setVlsmSubs(s => s.map((r, idx) => idx === i ? { ...r, hosts: e.target.value } : r))} placeholder={t.hosts} min={1}
                    className="w-28 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={() => setVlsmSubs(s => s.filter((_, idx) => idx !== i))} disabled={vlsmSubs.length === 1}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 hover:border-red-300 disabled:opacity-30 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => setVlsmSubs(s => [...s, { name: '', hosts: '' }])} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-blue-500 transition-colors"><Plus size={13} />{t.addSubnet}</button>
            </div>
            {vlsmError && <p className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">{vlsmError}</p>}
            <button onClick={handleVLSM} className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors"><Calculator size={15} />{t.calcVlsm}</button>

            {vlsmResult && (
              <div className="space-y-3">
                {vlsmResult.map((sub: any, i: number) => (
                  <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">{t.subnet} {i + 1}</span>
                      <span className="text-sm font-medium">{sub.name}</span>
                      <span className="ml-auto text-xs text-zinc-400 font-mono">{sub.network}</span>
                    </div>
                    <ResultRow label={t.firstUsable} value={sub.firstUsable} copiedText={t.copied} />
                    <ResultRow label={t.lastUsable} value={sub.lastUsable} copiedText={t.copied} />
                    <ResultRow label={t.broadcast} value={sub.broadcast} copiedText={t.copied} />
                    <ResultRow label={t.subnetMask} value={sub.mask} copiedText={t.copied} />
                    <ResultRow label={t.hosts} value={sub.hosts.toLocaleString()} mono={false} copiedText={t.copied} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}

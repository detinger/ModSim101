import { useState, useEffect, useRef } from 'react'
import CodePanel from '../components/CodePanel'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

// ─── Utility math ───────────────────────────────────────────────────────────
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length }
function variance(arr) { const m = mean(arr); return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1) }
function std(arr) { return Math.sqrt(variance(arr)) }

// Log-Gamma via Lanczos
function lgamma(x) {
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x)
    x--;
    let a = c[0]; const t = x + g + 0.5
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i)
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

// PDF functions
const pdf = {
    norm: (x, mu, sig) => Math.exp(-0.5 * ((x - mu) / sig) ** 2) / (sig * Math.sqrt(2 * Math.PI)),
    lnorm: (x, mu, sig) => x > 0 ? Math.exp(-0.5 * ((Math.log(x) - mu) / sig) ** 2) / (x * sig * Math.sqrt(2 * Math.PI)) : 0,
    exp: (x, rate) => x >= 0 ? rate * Math.exp(-rate * x) : 0,
    weibull: (x, k, lam) => x >= 0 ? (k / lam) * Math.pow(x / lam, k - 1) * Math.exp(-Math.pow(x / lam, k)) : 0,
    gamma: (x, k, theta) => x >= 0 ? Math.exp((k - 1) * Math.log(x) - x / theta - k * Math.log(theta) - lgamma(k)) : 0,
    logis: (x, mu, s) => { const e = Math.exp(-(x - mu) / s); return e / ((1 + e) ** 2 * s) },
    triang: (x, a, b, c) => {
        if (x < a || x > b) return 0;
        if (x <= c && c > a) return 2 * (x - a) / ((b - a) * (c - a));
        if (x > c && b > c) return 2 * (b - x) / ((b - a) * (b - c));
        return 0;
    },
}

// --- Random Generators ---
function rnorm(n, mu=0, sig=1) {
    return Array.from({length: n}, () => mu + Math.sqrt(-2.0 * Math.log(1 - Math.random())) * Math.cos(2.0 * Math.PI * Math.random()) * sig);
}
function rlnorm(n, mu=0, sig=1) { return rnorm(n, mu, sig).map(Math.exp); }
function rexp(n, rate=1) { return Array.from({length: n}, () => -Math.log(1 - Math.random()) / rate); }
function rweibull(n, k=1, lam=1) { return Array.from({length: n}, () => lam * Math.pow(-Math.log(1 - Math.random()), 1/k)); }
function rgamma(n, k, theta) {
    return Array.from({length: n}, () => {
        let s = 0;
        for(let i=0; i<Math.floor(k); i++) s += -Math.log(1 - Math.random());
        return s * theta;
    });
}
function rlogis(n, mu=0, s=1) {
    return Array.from({length: n}, () => {
        let p = Math.random() || 1e-9;
        if (p === 1) p = 1 - 1e-9;
        return mu + s * Math.log(p / (1 - p));
    });
}
function rtriang(n, a, b, c) {
    const fc = (c - a) / (b - a);
    return Array.from({length: n}, () => {
        let u = Math.random();
        return u < fc ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
    });
}

// Log-likelihood
function logLik(data, pdfFn, ...args) {
    return data.reduce((s, x) => {
        const v = pdfFn(x, ...args)
        return s + (v > 0 ? Math.log(v) : -Infinity)
    }, 0)
}

// MLE estimators (closed-form or MOM)
function fitNorm(data) { const m = mean(data), s = std(data); return { params: { μ: +m.toFixed(4), σ: +s.toFixed(4) }, ll: logLik(data, pdf.norm, m, s) } }
function fitLnorm(data) { const lv = data.map(x => Math.log(Math.max(x, 1e-9))); const m = mean(lv), s = std(lv); return { params: { μ: +m.toFixed(4), σ: +s.toFixed(4) }, ll: logLik(data, pdf.lnorm, m, s) } }
function fitExp(data) { const rate = 1 / mean(data); return { params: { rate: +rate.toFixed(4) }, ll: logLik(data, pdf.exp, rate) } }
function fitWeibull(data) {
    // MOM approximation
    const m = mean(data), v = variance(data)
    const cv = Math.sqrt(v) / m
    const k = Math.pow(1 / cv, 1.086)
    const lam = m / Math.exp(lgamma(1 + 1 / k))
    return { params: { k: +k.toFixed(4), λ: +lam.toFixed(4) }, ll: logLik(data, pdf.weibull, k, lam) }
}
function fitGamma(data) {
    const m = mean(data), v = variance(data)
    const k = m * m / v, theta = v / m
    return { params: { k: +k.toFixed(4), θ: +theta.toFixed(4) }, ll: logLik(data, pdf.gamma, k, theta) }
}
function fitLogis(data) { const m = mean(data), s = std(data) * Math.sqrt(3) / Math.PI; return { params: { μ: +m.toFixed(4), s: +s.toFixed(4) }, ll: logLik(data, pdf.logis, m, s) } }
function fitTriang(data) {
    const mi = Math.min(...data), ma = Math.max(...data);
    const r = (ma - mi) || 1e-9;
    const a = mi - r * 0.01;
    const b = ma + r * 0.01;
    let c = 3 * mean(data) - a - b;
    if (c < a) c = a;
    if (c > b) c = b;
    return { params: { a: +a.toFixed(4), b: +b.toFixed(4), c: +c.toFixed(4) }, ll: logLik(data, pdf.triang, a, b, c) }
}

const FITTERS = { Normal: fitNorm, 'Log-Normal': fitLnorm, Exponential: fitExp, Weibull: fitWeibull, Gamma: fitGamma, Logistic: fitLogis, Triangular: fitTriang }
const DIST_COLORS = {
    Normal: '#4f8eff', 'Log-Normal': '#f59e0b', Exponential: '#34d399',
    Weibull: '#f87171', Gamma: '#a78bfa', Logistic: '#fb923c', Triangular: '#e879f9'
}

const EXAMPLE1 = [4.9958942, 5.9730174, 9.8642732, 11.5609671, 10.1178216, 6.6279774, 9.2441754, 9.9419299, 13.4710469, 6.0601435, 8.2095239, 7.9456672, 12.7039825, 7.4197810, 9.5928275, 8.2267352, 2.8314614, 11.5653497, 6.0828073, 11.3926117, 10.5403929, 14.9751607, 11.7647580, 8.2867261, 10.0291522, 7.7132033, 6.3337642, 14.6066222, 11.3436587, 11.2717791, 10.8818323, 8.0320657, 6.7354041, 9.1871676, 13.4381778, 7.4353197, 8.9210043, 10.2010750, 11.9442048, 11.0081195]
const EXAMPLE2 = [37.50, 46.79, 48.30, 46.04, 43.40, 39.25, 38.49, 49.51, 40.38, 36.98, 40.00, 38.49, 37.74, 47.92, 44.53, 44.91, 44.91, 40.00, 41.51, 47.92, 36.98, 43.40]

function parseData(text) {
    return text.trim().split(/[\s,;]+/).map(Number).filter(v => !isNaN(v))
}

function buildHistogram(samples, bins = 25) {
    const min = Math.min(...samples), max = Math.max(...samples)
    const step = (max - min) / bins
    const counts = new Array(bins).fill(0)
    for (const v of samples) { const idx = Math.min(Math.floor((v - min) / step), bins - 1); counts[idx]++ }
    const labels = Array.from({ length: bins }, (_, i) => +(min + i * step + step / 2).toFixed(4))
    const density = counts.map(c => c / (samples.length * step))
    return { labels, density, min, max, step }
}

export default function StatFit() {
    const [rawText, setRawText] = useState(EXAMPLE1.join(', '))
    const [results, setResults] = useState(null)
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [genSize, setGenSize] = useState(100)
    const [genDist, setGenDist] = useState('Normal')

    const generateSample = () => {
        let arr = []
        const n = Math.max(4, Math.min(10000, Number(genSize) || 100))
        switch (genDist) {
            case 'Normal': arr = rnorm(n, 10, 2); break;
            case 'Log-Normal': arr = rlnorm(n, 2, 0.5); break;
            case 'Exponential': arr = rexp(n, 0.2); break;
            case 'Weibull': arr = rweibull(n, 2, 10); break;
            case 'Gamma': arr = rgamma(n, 3, 4); break;
            case 'Logistic': arr = rlogis(n, 10, 2); break;
            case 'Triangular': arr = rtriang(n, 2, 15, 10); break;
            default: arr = rnorm(n, 10, 2);
        }
        setRawText(arr.map(x => x.toFixed(4)).join(', '))
    }

    const chartRef = useRef(null)
    const chartInstance = useRef(null)

    const runFit = () => {
        const parsed = parseData(rawText)
        if (parsed.length < 4) { setError('Need at least 4 numeric values.'); return }
        setError('')
        const fits = {}
        for (const [name, fn] of Object.entries(FITTERS)) {
            try { fits[name] = fn(parsed) } catch (e) { /* skip */ }
        }
        setResults(fits)
        setData(parsed)
    }

    useEffect(() => { runFit() }, []) // auto-fit example on mount

    useEffect(() => {
        if (!results || !data) return
        const ctx = chartRef.current?.getContext('2d')
        if (!ctx) return
        if (chartInstance.current) chartInstance.current.destroy()

        const { labels, density, min: dmin, max: dmax } = buildHistogram(data, 20)
        const xRange = Array.from({ length: 200 }, (_, i) => dmin + (dmax - dmin) * (i / 199))

        // curve datasets per dist
        const curveDsets = Object.entries(results).map(([name, res]) => {
            let ys
            if (name === 'Normal') ys = xRange.map(x => pdf.norm(x, res.params.μ, res.params.σ))
            else if (name === 'Log-Normal') ys = xRange.map(x => pdf.lnorm(x, res.params.μ, res.params.σ))
            else if (name === 'Exponential') ys = xRange.map(x => pdf.exp(x, res.params.rate))
            else if (name === 'Weibull') ys = xRange.map(x => pdf.weibull(x, res.params.k, res.params.λ))
            else if (name === 'Gamma') ys = xRange.map(x => pdf.gamma(x, res.params.k, res.params.θ))
            else if (name === 'Logistic') ys = xRange.map(x => pdf.logis(x, res.params.μ, res.params.s))
            else if (name === 'Triangular') ys = xRange.map(x => pdf.triang(x, res.params.a, res.params.b, res.params.c))
            return {
                label: name, data: xRange.map((x, i) => ({ x, y: ys[i] })),
                type: 'line', borderColor: DIST_COLORS[name], borderWidth: 2,
                pointRadius: 0, tension: 0.3, fill: false,
            }
        })

        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Data (density)',
                        data: density,
                        backgroundColor: 'rgba(79,142,255,0.25)',
                        borderColor: 'rgba(79,142,255,0.5)',
                        borderWidth: 1,
                        borderRadius: 3,
                        barPercentage: 1,
                        categoryPercentage: 1,
                    },
                    ...curveDsets
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 400 },
                plugins: {
                    tooltip: { backgroundColor: 'rgba(11,14,26,0.9)', titleColor: '#fff', bodyColor: '#a8b2c8' },
                    legend: { labels: { color: '#a8b2c8', font: { size: 10 }, boxWidth: 12 } }
                },
                scales: {
                    x: { ticks: { color: '#8892b0', maxTicksLimit: 6 }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { ticks: { color: '#8892b0' }, grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'Density', color: '#8892b0', font: { size: 11 } } }
                }
            }
        })
        return () => { if (chartInstance.current) chartInstance.current.destroy() }
    }, [results, data])

    const sortedResults = results
        ? Object.entries(results).sort((a, b) => b[1].ll - a[1].ll)
        : []
    const bestFit = sortedResults[0]?.[0]

    return (
        <div>
            <div className="page-header">
                <span className="page-tag">Module 2 · StatFitR</span>
                <h1>Distribution Fitting Tool</h1>
                <p>
                    Given observed data, find which probability distribution best describes it.
                    Maximum Likelihood Estimation (MLE) finds the distribution parameters that
                    make the observed data most probable.
                </p>
            </div>

            <div className="concept-box">
                <strong>Log-Likelihood:</strong> For each candidate distribution, we compute the log-likelihood —
                the log probability of observing our data under that model. The distribution with the
                <strong> highest log-likelihood</strong> is the best fit.
                In R, the <code>fitdistrplus</code> package automates this via <code>fitdist(x, "norm")</code> etc.
            </div>

            {/* Data input */}
            <div className="glass-card">
                <h2>📥 Input Data</h2>
                <h3>Paste numeric values or generate synthetic data below:</h3>
                
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DISTRIBUTION</label>
                        <select style={{ width: 140, padding: '8px 10px', fontSize: '0.85rem', background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }} value={genDist} onChange={e => setGenDist(e.target.value)}>
                            {Object.keys(FITTERS).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SAMPLES (N)</label>
                        <input type="number" style={{ width: 90, padding: '8px 10px', fontSize: '0.85rem', background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} value={genSize} onChange={e => setGenSize(e.target.value)} min={4} max={10000} />
                    </div>
                    <button className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '8px 16px', height: 35, background: 'rgba(255,255,255,0.05)', fontWeight: 600 }} onClick={generateSample}>✨ Generate Data</button>
                    
                    <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border)', margin: '0 4px' }}></div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-end' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRESETS</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '6px 12px', height: 35 }} onClick={() => setRawText(EXAMPLE1.join(', '))}>Dataset 1</button>
                            <button className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '6px 12px', height: 35 }} onClick={() => setRawText(EXAMPLE2.join(', '))}>Dataset 2</button>
                        </div>
                    </div>
                </div>

                <textarea rows={5} value={rawText} onChange={e => setRawText(e.target.value)}
                    placeholder="e.g.: 4.99, 5.97, 9.86, 11.56 ..." />
                {error && <div style={{ color: '#f87171', fontSize: '0.82rem', marginTop: 8 }}>{error}</div>}
                <div style={{ marginTop: 14 }}>
                    <button className="btn btn-primary" onClick={runFit}>▶ Fit Distributions</button>
                </div>
            </div>

            {results && data && (
                <>
                    {/* Summary chips */}
                    <div className="info-chips">
                        <div className="info-chip">n = <strong>{data.length}</strong></div>
                        <div className="info-chip">mean = <strong>{mean(data).toFixed(3)}</strong></div>
                        <div className="info-chip">sd = <strong>{std(data).toFixed(3)}</strong></div>
                        <div className="info-chip">min = <strong>{Math.min(...data).toFixed(3)}</strong></div>
                        <div className="info-chip">max = <strong>{Math.max(...data).toFixed(3)}</strong></div>
                    </div>

                    <CodePanel title="Define Data in R" lang="R" style={{ marginBottom: 16, marginTop: 16 }}>
                        <span className="var">x</span> <span className="kw">&lt;-</span> <span className="fn">c</span>({data.join(', ')})
                    </CodePanel>
                    
                    <CodePanel title="Define Data in Python" lang="Python" langStyle={{ background: '#3776ab', color: 'white' }} style={{ marginBottom: 16 }}>
                        <span className="var">data</span> = [{data.join(', ')}]
                    </CodePanel>

                    {/* Density overlay chart */}
                    <div className="glass-card">
                        <h2>📊 Density Overlay</h2>
                        <div className="chart-wrap" style={{ height: 320 }}>
                            <canvas ref={chartRef} />
                        </div>
                    </div>

                    {/* Log-likelihood table */}
                    <div className="glass-card">
                        <h2>📋 Log-Likelihood Comparison</h2>
                        <h3>Higher log-likelihood = better fit</h3>
                        <table className="result-table">
                            <thead>
                                <tr>
                                    <th>Distribution</th>
                                    <th>Parameters</th>
                                    <th>Log-Likelihood</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedResults.map(([name, res]) => (
                                    <tr key={name} className={name === bestFit ? 'best-fit' : ''}>
                                        <td>
                                            <span style={{
                                                display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                                                backgroundColor: DIST_COLORS[name], marginRight: 8
                                            }} />
                                            {name}
                                            {name === bestFit && <span className="badge-best">Best fit</span>}
                                        </td>
                                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {Object.entries(res.params).map(([k, v]) => `${k}=${v}`).join(', ')}
                                        </td>
                                        <td>{isFinite(res.ll) ? res.ll.toFixed(3) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* R code */}
                    <CodePanel title="Equivalent R Code (fitdistrplus)" lang="R">
                        <span className="cmt"># install.packages("fitdistrplus")</span>{'\n'}
                        <span className="fn">library</span>(<span className="var">fitdistrplus</span>){'\n\n'}
                        <span className="cmt"># Explore distribution shape</span>{'\n'}
                        <span className="fn">descdist</span>(<span className="var">x</span>, discrete = <span className="kw">FALSE</span>){'\n\n'}
                        <span className="cmt"># Fit candidate distributions</span>{'\n'}
                        <span className="var">fits</span> <span className="kw">&lt;-</span> <span className="fn">list</span>({'\n'}
                        {'  '}<span className="var">norm</span>      = <span className="fn">fitdist</span>(<span className="var">x</span>, <span className="str">"norm"</span>),{'\n'}
                        {'  '}<span className="var">lnorm</span>     = <span className="fn">fitdist</span>(<span className="var">x</span>, <span className="str">"lnorm"</span>),{'\n'}
                        {'  '}<span className="var">exp</span>       = <span className="fn">fitdist</span>(<span className="var">x</span>, <span className="str">"exp"</span>),{'\n'}
                        {'  '}<span className="var">weibull</span>   = <span className="fn">fitdist</span>(<span className="var">x</span>, <span className="str">"weibull"</span>),{'\n'}
                        {'  '}<span className="var">gamma</span>     = <span className="fn">fitdist</span>(<span className="var">x</span>, <span className="str">"gamma"</span>),{'\n'}
                        {'  '}<span className="var">logis</span>     = <span className="fn">fitdist</span>(<span className="var">x</span>, <span className="str">"logis"</span>),{'\n'}
                        {'  '}<span className="cmt"># Requires 'triangle' package: install.packages("triangle")</span>{'\n'}
                        {'  '}<span className="var">triang</span>    = <span className="fn">fitdist</span>(<span className="var">x</span>, <span className="str">"triangle"</span>){'\n'}
                        ){'\n\n'}
                        <span className="cmt"># Compare log-likelihoods — highest = best fit</span>{'\n'}
                        <span className="fn">sapply</span>(<span className="var">fits</span>, <span className="kw">function</span>(i) i$loglik)
                    </CodePanel>

                    <CodePanel title="Equivalent Python Code (scipy.stats)" lang="Python" langStyle={{ background: '#3776ab', color: 'white' }} style={{ marginTop: 12 }}>
                        <span className="cmt"># pip install scipy</span>{'\n'}
                        <span className="kw">import</span> numpy <span className="kw">as</span> np{'\n'}
                        <span className="kw">import</span> scipy.stats <span className="kw">as</span> stats{'\n\n'}
                        <span className="cmt"># Assuming 'data' is your 1D numpy array of observations</span>{'\n'}
                        <span className="var">fits</span> = {'{'}{'\n'}
                        {'  '}<span className="str">"norm"</span>: stats.norm.fit(<span className="var">data</span>),{'\n'}
                        {'  '}<span className="str">"lognorm"</span>: stats.lognorm.fit(<span className="var">data</span>),{'\n'}
                        {'  '}<span className="str">"expon"</span>: stats.expon.fit(<span className="var">data</span>),{'\n'}
                        {'  '}<span className="str">"weibull_min"</span>: stats.weibull_min.fit(<span className="var">data</span>),{'\n'}
                        {'  '}<span className="str">"gamma"</span>: stats.gamma.fit(<span className="var">data</span>),{'\n'}
                        {'  '}<span className="str">"logistic"</span>: stats.logistic.fit(<span className="var">data</span>),{'\n'}
                        {'  '}<span className="str">"triang"</span>: stats.triang.fit(<span className="var">data</span>){'\n'}
                        {'}'}{'\n\n'}
                        <span className="cmt"># Compare log-likelihoods</span>{'\n'}
                        <span className="kw">for</span> dist_name, params <span className="kw">in</span> fits.<span className="fn">items</span>():{'\n'}
                        {'  '}<span className="var">dist_func</span> = <span className="fn">getattr</span>(stats, dist_name){'\n'}
                        {'  '}ll = np.<span className="fn">sum</span>(dist_func.<span className="fn">logpdf</span>(<span className="var">data</span>, *params)){'\n'}
                        {'  '}<span className="fn">print</span>(<span className="str">f"{'{dist_name}'}: {'{ll:.3f}'}"</span>)
                    </CodePanel>
                </>
            )}
        </div>
    )
}

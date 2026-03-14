import { useState, useEffect, useRef } from 'react'
import CodePanel from '../components/CodePanel'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const DISTRIBUTIONS = {
    normal: { label: 'Normal', params: [{ name: 'mean', min: -5, max: 5, step: 0.1, default: 0 }, { name: 'sd', min: 0.1, max: 5, step: 0.1, default: 1 }] },
    beta: { label: 'Beta', params: [{ name: 'α', min: 0.1, max: 15, step: 0.1, default: 7 }, { name: 'β', min: 0.1, max: 15, step: 0.1, default: 2 }] },
    lognormal: { label: 'Log-Normal', params: [{ name: 'μ', min: -3, max: 3, step: 0.1, default: 0 }, { name: 'σ', min: 0.1, max: 3, step: 0.1, default: 1 }] },
    exponential: { label: 'Exponential', params: [{ name: 'rate', min: 0.05, max: 3, step: 0.05, default: 1 }] },
    poisson: { label: 'Poisson', params: [{ name: 'λ', min: 0.5, max: 20, step: 0.5, default: 3 }] },
    chisq: { label: 'Chi²', params: [{ name: 'df', min: 1, max: 20, step: 1, default: 3 }] },
    triangular: { label: 'Triangular', params: [{ name: 'min', min: 0, max: 5, step: 0.5, default: 1 }, { name: 'max', min: 6, max: 15, step: 0.5, default: 10 }, { name: 'mode', min: 2, max: 8, step: 0.5, default: 4 }] },
}

// Box-Muller
function randNorm(mean = 0, sd = 1) {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function generateSamples(dist, params, n = 1000) {
    const samples = []
    if (dist === 'normal') {
        for (let i = 0; i < n; i++) samples.push(randNorm(params[0], params[1]))
    } else if (dist === 'beta') {
        // Johnk's method
        const a = params[0], b = params[1]
        for (let i = 0; i < n; i++) {
            let x, y
            do { x = Math.pow(Math.random(), 1 / a); y = Math.pow(Math.random(), 1 / b) } while (x + y > 1)
            samples.push(x / (x + y))
        }
    } else if (dist === 'lognormal') {
        const mu = params[0], sigma = params[1]
        for (let i = 0; i < n; i++) samples.push(Math.exp(randNorm(mu, sigma)))
    } else if (dist === 'exponential') {
        const rate = params[0]
        for (let i = 0; i < n; i++) samples.push(-Math.log(Math.random()) / rate)
    } else if (dist === 'poisson') {
        const lam = params[0]
        for (let i = 0; i < n; i++) {
            let k = 0, p = 1, L = Math.exp(-lam)
            do { k++; p *= Math.random() } while (p > L)
            samples.push(k - 1)
        }
    } else if (dist === 'chisq') {
        const df = params[0]
        for (let i = 0; i < n; i++) {
            let s = 0; for (let j = 0; j < df; j++) { const z = randNorm(); s += z * z }; samples.push(s)
        }
    } else if (dist === 'triangular') {
        const a = params[0], b = Math.max(a + 0.001, params[1]), c = Math.max(a, Math.min(b, params[2]));
        const fc = (c - a) / (b - a);
        for (let i = 0; i < n; i++) {
            let u = Math.random();
            samples.push(u < fc ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c)));
        }
    }
    return samples
}

function buildHistogram(samples, bins = 30) {
    const min = Math.min(...samples), max = Math.max(...samples)
    const step = (max - min) / bins
    const counts = new Array(bins).fill(0)
    for (const v of samples) {
        const idx = Math.min(Math.floor((v - min) / step), bins - 1)
        counts[idx]++
    }
    const labels = Array.from({ length: bins }, (_, i) => +(min + i * step + step / 2).toFixed(3))
    const density = counts.map(c => c / (samples.length * step))
    return { labels, density }
}

const R_CODES = {
    normal: (p) => `x <- rnorm(n, mean=${p[0]}, sd=${p[1]})\nplot(x, main='Normalna distribucija')\nhist(x, probability=TRUE)\ncurve(dnorm(x, mean=${p[0]}, sd=${p[1]}), add=TRUE)`,
    beta: (p) => `x <- rbeta(n, ${p[0]}, ${p[1]})\nplot(x, main='Beta distribucija')\nhist(x, probability=TRUE)\ncurve(dbeta(x, ${p[0]}, ${p[1]}), add=TRUE)`,
    lognormal: (p) => `x <- rlnorm(n, ${p[0]}, ${p[1]})\nplot(x, main='Log-Normalna distribucija')\nhist(x, probability=TRUE)\ncurve(dlnorm(x, ${p[0]}, ${p[1]}), add=TRUE)`,
    exponential: (p) => `x <- rexp(n, ${p[0]})\nplot(x, main='Eksponencijalna distribucija')\nhist(x, probability=TRUE)\ncurve(dexp(x, ${p[0]}), add=TRUE)`,
    poisson: (p) => `x <- rpois(n, ${p[0]})\nplot(x, main='Poissonova distribucija')\nhist(x, probability=TRUE, breaks=seq(-0.5, max(x)+0.5, 1))\nlines(0:10, dpois(0:10, ${p[0]}))`,
    chisq: (p) => `x <- rchisq(n, ${p[0]})\nplot(x, main='Hi-kvadrat distribucija')\nhist(x, probability=TRUE)\ncurve(dchisq(x, ${p[0]}), add=TRUE)`,
    triangular: (p) => `library(triangle)\n\nx <- rtriangle(n, a=${p[0]}, b=${p[1]}, c=${p[2]})\nplot(x, main='Triangular distribucija')\nhist(x, probability=TRUE)\ncurve(dtriangle(x, a=${p[0]}, b=${p[1]}, c=${p[2]}), add=TRUE)`,
}

const PYTHON_CODES = {
    normal: (p) => `import numpy as np\nimport matplotlib.pyplot as plt\nfrom scipy.stats import norm\n\nx = np.random.normal(loc=${p[0]}, scale=${p[1]}, size=n)\nplt.hist(x, density=True)\nx_grid = np.linspace(min(x), max(x), 100)\nplt.plot(x_grid, norm.pdf(x_grid, loc=${p[0]}, scale=${p[1]}))\nplt.show()`,
    beta: (p) => `import numpy as np\nimport matplotlib.pyplot as plt\nfrom scipy.stats import beta\n\nx = np.random.beta(a=${p[0]}, b=${p[1]}, size=n)\nplt.hist(x, density=True)\nx_grid = np.linspace(0, 1, 100)\nplt.plot(x_grid, beta.pdf(x_grid, a=${p[0]}, b=${p[1]}))\nplt.show()`,
    lognormal: (p) => `import numpy as np\nimport matplotlib.pyplot as plt\nfrom scipy.stats import lognorm\n\nx = np.random.lognormal(mean=${p[0]}, sigma=${p[1]}, size=n)\nplt.hist(x, density=True)\nx_grid = np.linspace(min(x), max(x), 100)\nplt.plot(x_grid, lognorm.pdf(x_grid, s=${p[1]}, scale=np.exp(${p[0]})))\nplt.show()`,
    exponential: (p) => `import numpy as np\nimport matplotlib.pyplot as plt\nfrom scipy.stats import expon\n\nx = np.random.exponential(scale=1/${p[0]}, size=n)\nplt.hist(x, density=True)\nx_grid = np.linspace(0, max(x), 100)\nplt.plot(x_grid, expon.pdf(x_grid, scale=1/${p[0]}))\nplt.show()`,
    poisson: (p) => `import numpy as np\nimport matplotlib.pyplot as plt\nfrom scipy.stats import poisson\n\nx = np.random.poisson(lam=${p[0]}, size=n)\nplt.hist(x, density=True, bins=np.arange(-0.5, max(x)+1.5, 1))\np_grid = np.arange(0, max(x)+1)\nplt.plot(p_grid, poisson.pmf(p_grid, mu=${p[0]}))\nplt.show()`,
    chisq: (p) => `import numpy as np\nimport matplotlib.pyplot as plt\nfrom scipy.stats import chi2\n\nx = np.random.chisquare(df=${p[0]}, size=n)\nplt.hist(x, density=True)\nx_grid = np.linspace(min(x), max(x), 100)\nplt.plot(x_grid, chi2.pdf(x_grid, df=${p[0]}))\nplt.show()`,
    triangular: (p) => {
        const a = p[0], b = Math.max(a + 0.001, p[1]), mode = Math.max(a, Math.min(b, p[2]));
        const c = (mode - a) / (b - a);
        return `import numpy as np\nimport matplotlib.pyplot as plt\nfrom scipy.stats import triang\n\na, b, mode = ${a}, ${b}, ${mode}\nc = (mode - a) / (b - a)\n\nx = triang.rvs(c, loc=a, scale=(b-a), size=n)\nplt.hist(x, density=True)\nx_grid = np.linspace(a, b, 100)\nplt.plot(x_grid, triang.pdf(x_grid, c, loc=a, scale=(b-a)))\nplt.show()`
    },
}

export default function Lesson02() {
    const [dist, setDist] = useState('normal')
    const [params, setParams] = useState([0, 1])
    const [n, setN] = useState(1000)

    const chartRef = useRef(null)
    const chartInstance = useRef(null)

    const config = DISTRIBUTIONS[dist]

    const handleDistChange = (d) => {
        setDist(d)
        setParams(DISTRIBUTIONS[d].params.map(p => p.default))
    }

    const handleParam = (i, v) => {
        const next = [...params]; next[i] = +v; setParams(next)
    }

    useEffect(() => {
        const ctx = chartRef.current?.getContext('2d')
        if (!ctx) return
        if (chartInstance.current) chartInstance.current.destroy()

        const samples = generateSamples(dist, params, n)
        const { labels, density } = buildHistogram(samples, 35)

        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Density',
                    data: density,
                    backgroundColor: 'rgba(79,142,255,0.45)',
                    borderColor: '#4f8eff',
                    borderWidth: 1,
                    borderRadius: 3,
                    barPercentage: 1,
                    categoryPercentage: 1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(11,14,26,0.9)',
                        titleColor: '#fff',
                        bodyColor: '#a8b2c8',
                        callbacks: { title: items => `x ≈ ${items[0].label}`, label: i => ` density: ${i.raw.toFixed(4)}` }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#8892b0', maxTicksLimit: 8, maxRotation: 0 },
                        grid: { color: 'rgba(255,255,255,0.04)' }
                    },
                    y: {
                        ticks: { color: '#8892b0' },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Density', color: '#8892b0', font: { size: 11 } }
                    }
                }
            }
        })
        return () => { if (chartInstance.current) chartInstance.current.destroy() }
    }, [dist, params, n])

    const rCode = R_CODES[dist](params)
    const pyCode = PYTHON_CODES[dist](params)

    return (
        <div>
            <div className="page-header">
                <span className="page-tag">Lesson 02 · Module 1</span>
                <h1>Probability Distributions</h1>
                <p>
                    Random simulation starts by drawing numbers from a probability distribution.
                    Adjust the distribution and its parameters to see how the shape of the density changes.
                </p>
            </div>

            <div className="concept-box">
                <strong>Key idea:</strong> A probability distribution describes the likelihood of each outcome.
                In R, every distribution has three function families: <code>d</code> (density), <code>p</code> (CDF),
                <code>q</code> (quantile), and <code>r</code> (random samples).
                For example <code>rnorm(n, mean, sd)</code> draws <em>n</em> samples from a Normal distribution.
            </div>

            <div className="glass-card">
                <h2>📊 Distribution Explorer</h2>

                <div className="controls-grid">
                    <div className="control-item">
                        <label>Distribution</label>
                        <select value={dist} onChange={e => handleDistChange(e.target.value)}>
                            {Object.entries(DISTRIBUTIONS).map(([k, v]) =>
                                <option key={k} value={k}>{v.label}</option>
                            )}
                        </select>
                    </div>
                    <div className="control-item">
                        <label>Sample size (n) <span>{n.toLocaleString()}</span></label>
                        <input type="range" min={100} max={5000} step={100} value={n}
                            onChange={e => setN(+e.target.value)} />
                    </div>
                    {config.params.map((p, i) => (
                        <div key={p.name} className="control-item">
                            <label>{p.name} <span>{params[i] ?? p.default}</span></label>
                            <input type="range" min={p.min} max={p.max} step={p.step}
                                value={params[i] ?? p.default}
                                onChange={e => handleParam(i, e.target.value)} />
                        </div>
                    ))}
                </div>

                <div className="chart-wrap" style={{ height: 300 }}>
                    <canvas ref={chartRef} />
                </div>

                <CodePanel title="Equivalent R Code" lang="R">
                    <span className="var">n</span> <span className="kw">&lt;-</span> <span className="num">{n}</span>{'\n'}
                    {rCode.split('\n').map((line, i) => (
                        <span key={i}>{line}{'\n'}</span>
                    ))}
                </CodePanel>

                <CodePanel title="Equivalent Python Code" lang="Python" langStyle={{ background: '#3776ab', color: 'white' }} style={{ marginTop: 12 }}>
                    <span className="var">n</span> = <span className="num">{n}</span>{'\n'}
                    {pyCode.split('\n').map((line, i) => (
                        <span key={i}>{line}{'\n'}</span>
                    ))}
                </CodePanel>
            </div>
        </div>
    )
}

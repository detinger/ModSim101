import { useState, useEffect, useRef } from 'react'
import CodePanel from '../components/CodePanel'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

function randNorm(mean = 0, sd = 1) {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function simulate(intercept, slope, errorSd, n) {
    const xs = Array.from({ length: n }, () => Math.random() * 10 + 10) // U(10,20)
    const trueY = xs.map(x => intercept + slope * x)
    const ys = trueY.map(y => y + randNorm(0, errorSd))
    return { xs, ys, trueY }
}

function olsLine(xs, ys) {
    const n = xs.length
    const mx = xs.reduce((a, b) => a + b, 0) / n
    const my = ys.reduce((a, b) => a + b, 0) / n
    const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0)
    const int = my - slope * mx
    return { slope, int }
}

export default function Lesson03() {
    const [intercept, setIntercept] = useState(10)
    const [slope, setSlope] = useState(1)
    const [errorSd, setErrorSd] = useState(2)
    const [n, setN] = useState(30)

    const chartRef = useRef(null)
    const chartInstance = useRef(null)

    useEffect(() => {
        const ctx = chartRef.current?.getContext('2d')
        if (!ctx) return
        if (chartInstance.current) chartInstance.current.destroy()

        const { xs, ys } = simulate(intercept, slope, errorSd, n)
        const ols = olsLine(xs, ys)
        const xMin = Math.min(...xs), xMax = Math.max(...xs)
        const trueLine = [{ x: xMin, y: intercept + slope * xMin }, { x: xMax, y: intercept + slope * xMax }]
        const olsLinePts = [{ x: xMin, y: ols.int + ols.slope * xMin }, { x: xMax, y: ols.int + ols.slope * xMax }]

        chartInstance.current = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Simulated data',
                        data: xs.map((x, i) => ({ x, y: ys[i] })),
                        backgroundColor: 'rgba(79,142,255,0.5)',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    },
                    {
                        label: 'True relationship',
                        data: trueLine,
                        type: 'line',
                        borderColor: '#34d399',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0,
                    },
                    {
                        label: 'OLS fit',
                        data: olsLinePts,
                        type: 'line',
                        borderColor: '#a78bfa',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        pointRadius: 0,
                        tension: 0,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                plugins: {
                    legend: {
                        labels: { color: '#a8b2c8', font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(11,14,26,0.9)',
                        titleColor: '#fff',
                        bodyColor: '#a8b2c8',
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#8892b0' },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Length (cm)', color: '#8892b0', font: { size: 11 } }
                    },
                    y: {
                        ticks: { color: '#8892b0' },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Swim speed (cm/s)', color: '#8892b0', font: { size: 11 } }
                    }
                }
            }
        })
        return () => { if (chartInstance.current) chartInstance.current.destroy() }
    }, [intercept, slope, errorSd, n])

    return (
        <div>
            <div className="page-header">
                <span className="page-tag">Lesson 03 · Module 1</span>
                <h1>Simple Linear Model Simulation</h1>
                <p>
                    A linear model has a <em>deterministic</em> component (the straight line) and a
                    <em> stochastic</em> component (random noise). Simulating it helps you understand
                    how noise affects our ability to recover the true relationship.
                </p>
            </div>

            <div className="concept-box">
                <strong>The model:</strong> &nbsp; <code>y = β₀ + β₁·x + ε</code>, where <code>ε ~ N(0, σ²)</code><br /><br />
                The <span style={{ color: 'var(--accent3)' }}>green line</span> shows the true relationship.
                The <span style={{ color: 'var(--accent2)' }}>purple dashed line</span> is the OLS estimate from simulated data.
                As noise (σ) increases, the OLS line drifts further from the truth.
            </div>

            <div className="glass-card">
                <h2>📈 Linear Model Simulator</h2>
                <div className="controls-grid">
                    <div className="control-item">
                        <label>Intercept (β₀) <span>{intercept}</span></label>
                        <input type="range" min={-5} max={25} step={0.5} value={intercept}
                            onChange={e => setIntercept(+e.target.value)} />
                    </div>
                    <div className="control-item">
                        <label>Slope (β₁) <span>{slope}</span></label>
                        <input type="range" min={-3} max={3} step={0.1} value={slope}
                            onChange={e => setSlope(+e.target.value)} />
                    </div>
                    <div className="control-item">
                        <label>Error SD (σ) <span>{errorSd}</span></label>
                        <input type="range" min={0} max={10} step={0.1} value={errorSd}
                            onChange={e => setErrorSd(+e.target.value)} />
                    </div>
                    <div className="control-item">
                        <label>Sample size (n) <span>{n}</span></label>
                        <input type="range" min={5} max={200} step={5} value={n}
                            onChange={e => setN(+e.target.value)} />
                    </div>
                </div>

                <div className="chart-wrap" style={{ height: 320 }}>
                    <canvas ref={chartRef} />
                </div>

                <CodePanel title="Equivalent R Code" lang="R">
                    <span className="var">intercept</span> <span className="kw">&lt;-</span> <span className="num">{intercept}</span>    <span className="cmt">#B_0</span>{'\n'}
                    <span className="var">slope</span>     <span className="kw">&lt;-</span> <span className="num">{slope}</span>        <span className="cmt">#B_1</span>{'\n'}
                    <span className="var">error_sd</span>  <span className="kw">&lt;-</span> <span className="num">{errorSd}</span>     <span className="cmt">#sigma</span>{'\n'}
                    <span className="var">n</span>         <span className="kw">&lt;-</span> <span className="num">{n}</span>{'\n\n'}
                    <span className="var">x</span> <span className="kw">&lt;-</span> <span className="fn">runif</span>(<span className="var">n</span>, <span className="num">10</span>, <span className="num">20</span>){'\n'}
                    <span className="var">y</span> <span className="kw">&lt;-</span> <span className="var">intercept</span> + <span className="var">slope</span>*<span className="var">x</span>         <span className="cmt">#Deterministički</span>{'\n'}
                    <span className="var">y</span> <span className="kw">&lt;-</span> <span className="var">y</span> + <span className="fn">rnorm</span>(<span className="var">n</span>, <span className="num">0</span>, <span className="var">error_sd</span>)  <span className="cmt">#Stohastički</span>{'\n\n'}
                    <span className="fn">plot</span>(<span className="var">x</span>, <span className="var">y</span>){'\n'}
                    <span className="fn">abline</span>(<span className="var">intercept</span>, <span className="var">slope</span>)         <span className="cmt"># Pravi odnos</span>{'\n'}
                    <span className="fn">abline</span>(<span className="fn">lm</span>(<span className="var">y</span>~<span className="var">x</span>), lty=<span className="num">2</span>)         <span className="cmt"># OLS regresija</span>
                </CodePanel>

                <CodePanel title="Equivalent Python Code" lang="Python" langStyle={{ background: '#3776ab', color: 'white' }} style={{ marginTop: 12 }}>
                    <span className="kw">import</span> numpy <span className="kw">as</span> np{'\n'}
                    <span className="kw">import</span> matplotlib.pyplot <span className="kw">as</span> plt{'\n'}
                    <span className="kw">from</span> sklearn.linear_model <span className="kw">import</span> LinearRegression{'\n\n'}
                    <span className="var">intercept</span> = <span className="num">{intercept}</span>    <span className="cmt"># B_0</span>{'\n'}
                    <span className="var">slope</span>     = <span className="num">{slope}</span>        <span className="cmt"># B_1</span>{'\n'}
                    <span className="var">error_sd</span>  = <span className="num">{errorSd}</span>     <span className="cmt"># sigma</span>{'\n'}
                    <span className="var">n</span>         = <span className="num">{n}</span>{'\n\n'}
                    <span className="var">x</span> = <span className="var">np</span>.<span className="var">random</span>.<span className="fn">uniform</span>(<span className="num">10</span>, <span className="num">20</span>, <span className="var">n</span>){'\n'}
                    <span className="var">y</span> = <span className="var">intercept</span> + <span className="var">slope</span> * <span className="var">x</span>                      <span className="cmt"># Deterministički</span>{'\n'}
                    <span className="var">y</span> = <span className="var">y</span> + <span className="var">np</span>.<span className="var">random</span>.<span className="fn">normal</span>(<span className="num">0</span>, <span className="var">error_sd</span>, <span className="var">n</span>)      <span className="cmt"># Stohastički</span>{'\n\n'}
                    <span className="var">plt</span>.<span className="fn">scatter</span>(<span className="var">x</span>, <span className="var">y</span>){'\n'}
                    <span className="var">plt</span>.<span className="fn">plot</span>(<span className="var">np</span>.<span className="fn">sort</span>(<span className="var">x</span>), <span className="var">intercept</span> + <span className="var">slope</span> * <span className="var">np</span>.<span className="fn">sort</span>(<span className="var">x</span>)) <span className="cmt"># Pravi odnos</span>{'\n\n'}
                    <span className="var">model</span> = <span className="fn">LinearRegression</span>().<span className="fn">fit</span>(<span className="var">x</span>.<span className="fn">reshape</span>(-<span className="num">1</span>, <span className="num">1</span>), <span className="var">y</span>){'\n'}
                    <span className="var">plt</span>.<span className="fn">plot</span>(<span className="var">np</span>.<span className="fn">sort</span>(<span className="var">x</span>), <span className="var">model</span>.<span className="fn">predict</span>(<span className="var">np</span>.<span className="fn">sort</span>(<span className="var">x</span>).<span className="fn">reshape</span>(-<span className="num">1</span>, <span className="num">1</span>)), linestyle=<span className="str">'--'</span>) <span className="cmt"># OLS regresija</span>{'\n'}
                    <span className="var">plt</span>.<span className="fn">show</span>()
                </CodePanel>
            </div>
        </div>
    )
}

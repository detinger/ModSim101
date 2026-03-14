import { useState, useEffect, useRef } from 'react'
import CodePanel from '../components/CodePanel'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

function sampleLetters(n) {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')
    const result = []
    for (let i = 0; i < n; i++) {
        result.push(letters[Math.floor(Math.random() * letters.length)])
    }
    return result
}

function flipCoins(n, pHeads) {
    let heads = 0, tails = 0
    for (let i = 0; i < n; i++) {
        Math.random() < pHeads ? heads++ : tails++
    }
    return { heads, tails }
}

export default function Lesson01() {
    const [nLetters, setNLetters] = useState(10)
    const [sampledLetters, setSampledLetters] = useState([])

    const [nFlips, setNFlips] = useState(100)
    const [pHeads, setPHeads] = useState(0.5)
    const [coinResult, setCoinResult] = useState(null)

    const chartRef = useRef(null)
    const chartInstance = useRef(null)

    const doSampleLetters = () => setSampledLetters(sampleLetters(nLetters))

    const doFlipCoins = () => {
        const result = flipCoins(nFlips, pHeads)
        setCoinResult(result)
    }

    useEffect(() => {
        if (!coinResult) return
        const ctx = chartRef.current.getContext('2d')
        if (chartInstance.current) chartInstance.current.destroy()

        chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Heads (Glava)', 'Tails (Pismo)'],
                datasets: [{
                    data: [coinResult.heads, coinResult.tails],
                    backgroundColor: ['rgba(79,142,255,0.7)', 'rgba(167,139,250,0.7)'],
                    borderColor: ['#4f8eff', '#a78bfa'],
                    borderWidth: 2,
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(11,14,26,0.9)',
                        titleColor: '#fff',
                        bodyColor: '#a8b2c8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                    }
                },
                scales: {
                    x: { ticks: { color: '#8892b0' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { ticks: { color: '#8892b0' }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
                }
            }
        })
        return () => { if (chartInstance.current) chartInstance.current.destroy() }
    }, [coinResult])

    return (
        <div>
            <div className="page-header">
                <span className="page-tag">Lesson 01 · Module 1</span>
                <h1>Random Sampling</h1>
                <p>
                    Computers generate <em>pseudo-random</em> numbers to simulate uncertainty.
                    The <code>sample()</code> function in R draws items from a pool — with or without replacement,
                    and with controllable probabilities.
                </p>
            </div>

            <div className="concept-box">
                <strong>Key idea:</strong> Random sampling lets us model real-world randomness.
                By setting probabilities we can model <em>biased</em> events — like an unfair coin where heads
                is more likely than tails.
                Running many repetitions (simulation) reveals the long-run frequencies predicted by probability theory.
            </div>

            {/* ── Letter Sampler ── */}
            <div className="glass-card">
                <h2>🔤 Letter Sampler</h2>
                <h3>Draw random letters from the alphabet</h3>
                <div className="controls-grid">
                    <div className="control-item">
                        <label>Number of letters <span>{nLetters}</span></label>
                        <input type="range" min={1} max={30} value={nLetters}
                            onChange={e => setNLetters(+e.target.value)} />
                    </div>
                </div>
                <button className="btn btn-primary" onClick={doSampleLetters}>▶ Sample</button>
                {sampledLetters.length > 0 && (
                    <div style={{
                        marginTop: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem',
                        letterSpacing: '0.05em', color: 'var(--accent)', lineHeight: 2, wordBreak: 'break-word'
                    }}>
                        {sampledLetters.join('  ')}
                    </div>
                )}

                <CodePanel title="Equivalent R Code" lang="R">
                    <span className="cmt"># Sample {nLetters} random letters</span>{'\n'}
                    <span className="fn">sample</span>(<span className="var">letters</span>, <span className="num">{nLetters}</span>)
                </CodePanel>

                <CodePanel title="Equivalent Python Code" lang="Python" langStyle={{ background: '#3776ab', color: 'white' }} style={{ marginTop: 12 }}>
                    <span className="kw">import</span> string{'\n'}
                    <span className="kw">import</span> random{'\n\n'}
                    <span className="cmt"># Sample {nLetters} random letters</span>{'\n'}
                    <span className="var">random</span>.<span className="fn">choices</span>(<span className="var">string</span>.ascii_lowercase, k=<span className="num">{nLetters}</span>)
                </CodePanel>
            </div>

            {/* ── Coin Flip ── */}
            <div className="glass-card">
                <h2>🪙 Coin Flip Simulator</h2>
                <h3>Flip a (possibly biased) coin N times</h3>
                <div className="controls-grid">
                    <div className="control-item">
                        <label>Number of flips <span>{nFlips}</span></label>
                        <input type="range" min={10} max={2000} step={10} value={nFlips}
                            onChange={e => setNFlips(+e.target.value)} />
                    </div>
                    <div className="control-item">
                        <label>P(Heads) <span>{pHeads.toFixed(2)}</span></label>
                        <input type="range" min={0} max={1} step={0.01} value={pHeads}
                            onChange={e => setPHeads(+e.target.value)} />
                    </div>
                </div>
                <button className="btn btn-primary" onClick={doFlipCoins}>▶ Flip Coins</button>

                {coinResult && (
                    <>
                        <div className="info-chips" style={{ marginTop: 16 }}>
                            <div className="info-chip">Heads: <strong>{coinResult.heads}</strong> ({(coinResult.heads / nFlips * 100).toFixed(1)}%)</div>
                            <div className="info-chip">Tails: <strong>{coinResult.tails}</strong> ({(coinResult.tails / nFlips * 100).toFixed(1)}%)</div>
                            <div className="info-chip">Expected heads: <strong>{(pHeads * nFlips).toFixed(0)}</strong></div>
                        </div>
                        <div className="chart-wrap">
                            <canvas ref={chartRef} />
                        </div>
                    </>
                )}

                <CodePanel title="Equivalent R Code" lang="R">
                    <span className="var">EQ</span> <span className="kw">&lt;-</span> <span className="fn">c</span>(<span className="str">'glava'</span>, <span className="str">'pismo'</span>){'\n'}
                    <span className="fn">sample</span>(<span className="var">EQ</span>, <span className="num">{nFlips}</span>, replace=<span className="kw">TRUE</span>, p=<span className="fn">c</span>(<span className="num">{pHeads.toFixed(2)}</span>, <span className="num">{(1 - pHeads).toFixed(2)}</span>))
                </CodePanel>

                <CodePanel title="Equivalent Python Code" lang="Python" langStyle={{ background: '#3776ab', color: 'white' }} style={{ marginTop: 12 }}>
                    <span className="kw">import</span> random{'\n\n'}
                    <span className="var">EQ</span> = [<span className="str">'glava'</span>, <span className="str">'pismo'</span>]{'\n'}
                    <span className="var">random</span>.<span className="fn">choices</span>(<span className="var">EQ</span>, weights=[<span className="num">{pHeads.toFixed(2)}</span>, <span className="num">{(1 - pHeads).toFixed(2)}</span>], k=<span className="num">{nFlips}</span>)
                </CodePanel>
            </div>
        </div>
    )
}

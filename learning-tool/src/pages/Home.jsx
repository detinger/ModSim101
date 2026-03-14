export default function Home({ navigate }) {
    return (
        <div>
            <div className="page-header">
                <span className="page-tag">Welcome</span>
                <h1>Introduction to Modelling &amp; Simulation</h1>
                <p>
                    An interactive learning environment built around R-based course materials.
                    Explore simulation concepts, probability distributions, and statistical fitting
                    through hands-on visualisations — no R required.
                </p>
            </div>

            <div className="concept-box">
                <strong>What is Modelling &amp; Simulation?</strong><br />
                Modelling is the process of creating a mathematical or computational abstraction of a real-world system.
                Simulation runs that model forward in time (or across many repetitions) to understand the system's behaviour
                under uncertainty. Statistical fitting connects observed data back to the model by identifying which
                probability distribution best describes the data.
            </div>

            <div className="module-cards">
                <div className="glass-card">
                    <div className="module-card-icon">🎲</div>
                    <h3>Module 1 – Simulation in R</h3>
                    <p>Learn the fundamentals of stochastic simulation: random sampling, probability distributions, and linear models.</p>
                    <div className="lesson-list" style={{ marginTop: 14 }}>
                        <span className="lesson-pill">01 · Random Sampling &amp; Coin Flip</span>
                        <span className="lesson-pill">02 · Distributions Explorer</span>
                        <span className="lesson-pill">03 · Simple Linear Model</span>
                    </div>
                </div>

                <div className="glass-card">
                    <div className="module-card-icon">🔍</div>
                    <h3>Module 2 – Statistical Fitting</h3>
                    <p>Given real data, discover which probability distribution fits it best using maximum likelihood estimation.</p>
                    <div className="lesson-list" style={{ marginTop: 14 }}>
                        <span className="lesson-pill">StatFitR · Distribution Fitting Tool</span>
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ marginTop: 8 }}>
                <h2>🚀 How to use this tool</h2>
                <ul style={{ paddingLeft: 20, lineHeight: 2, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    <li>Use the <strong style={{ color: 'var(--text)' }}>sidebar</strong> to navigate between lessons.</li>
                    <li>Each lesson includes a <strong style={{ color: 'var(--text)' }}>concept explanation</strong> followed by an <strong style={{ color: 'var(--text)' }}>interactive simulation</strong>.</li>
                    <li>The <strong style={{ color: 'var(--text)' }}>R Code</strong> panel at the bottom of each lesson shows the equivalent R script.</li>
                    <li>Adjust sliders and parameters to see charts update in real time.</li>
                </ul>
            </div>
        </div>
    )
}

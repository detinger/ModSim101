const NAV = [
    { id: 'home', icon: '🏠', label: 'Overview' },
    {
        section: 'Module 1 · Simulation in R',
        items: [
            { id: 'lesson01', icon: '🎲', label: 'Random Sampling', badge: '01' },
            { id: 'lesson02', icon: '📊', label: 'Distributions', badge: '02' },
            { id: 'lesson03', icon: '📈', label: 'Linear Model', badge: '03' },
        ]
    },
    {
        section: 'Module 2 · Statistical Fitting',
        items: [
            { id: 'statfit', icon: '🔍', label: 'Distribution Fitting' },
        ]
    }
]

export default function Sidebar({ current, navigate }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h2>ModSim101</h2>
                <p>Introduction to Modelling &amp; Simulation</p>
            </div>
            <nav className="sidebar-nav">
                {NAV.map((entry, i) => {
                    if (entry.section) {
                        return (
                            <div key={i}>
                                <div className="sidebar-section-label">{entry.section}</div>
                                {entry.items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`sidebar-item ${current === item.id ? 'active' : ''}`}
                                        onClick={() => navigate(item.id)}
                                    >
                                        <span className="icon">{item.icon}</span>
                                        <span>{item.label}</span>
                                        {item.badge && <span className="badge">{item.badge}</span>}
                                    </div>
                                ))}
                            </div>
                        )
                    }
                    return (
                        <div
                            key={entry.id}
                            className={`sidebar-item ${current === entry.id ? 'active' : ''}`}
                            onClick={() => navigate(entry.id)}
                        >
                            <span className="icon">{entry.icon}</span>
                            <span>{entry.label}</span>
                        </div>
                    )
                })}
            </nav>
        </aside>
    )
}

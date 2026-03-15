import React, { useRef, useState } from 'react';

export default function CodePanel({ title, lang, langStyle, children, style }) {
    const bodyRef = useRef(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (bodyRef.current) {
            navigator.clipboard.writeText(bodyRef.current.innerText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="code-panel" style={style}>
            <div className="code-panel-header">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>{title}</span>
                    {lang && <span className="code-lang" style={langStyle}>{lang}</span>}
                </div>
                <button className="copy-btn" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <div className="code-body" ref={bodyRef}>
                {children}
            </div>
        </div>
    );
}

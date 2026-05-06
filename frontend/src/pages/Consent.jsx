import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function Consent({ onAccepted, onDeclined }) {
    const [policy, setPolicy] = useState(null)

     useEffect(() => {
        fetch(`${API_BASE}/api/consent/policy`)
            .then(res => res.json())
            .then(data => setPolicy(data.policy))
            .catch(() => {})
    }, [])

    const handleAccept = () => {
        onAccepted()
    }

    if (!policy) return null

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
            }}
        >
            <div
                style={{
                    width: '480px',
                    background: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    margin: '1rem',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '1rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid #eee',
                    }}
                >
                    <div
                        style={{
                            width: '36px',
                            height: '36px',
                            background: '#1a5fa8',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>GR</span>
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: '500' }}>Monitoring Consent</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Policy v{policy.version} - required before proceeding</p>
                    </div>
                </div>

                <div
                    style={{
                        background: '#f7f9fc',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        fontSize: '13px',
                        color: '#555',
                        lineHeight: '1.7',
                    }}
                >
                    <p style={{ margin: '0 0 8px', fontWeight: '500', color: '#333' }}>What we monitor:</p>
                    <p style={{ margin: '0 0 6px' }}>- Keystroke dwell time and flight time</p>
                    <p style={{ margin: '0 0 6px' }}>- Paste events and clipboard activity</p>
                    <p style={{ margin: '0 0 6px' }}>- Tab blur and focus events</p>
                    <p style={{ margin: 0 }}>{policy.contentMarkdown}</p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleAccept}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#1a5fa8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                    >
                        I Accept
                    </button>
                    <button
                        onClick={onDeclined}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: 'white',
                            color: '#c0392b',
                            border: '1px solid #c0392b',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                    >
                        I Decline
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Consent

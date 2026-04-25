import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Fake flags (remove when backend is ready) ─────────────────────────────────
const fakeOwnFlags = [
    {
        id: 'flag-001',
        assignmentId: 'Essay: Impact of AI in Education',
        status: 'notified',
        createdAt: '2026-04-10T09:30:00Z',
        confidence: 87,
    },
]
// ─────────────────────────────────────────────────────────────────────────────

function AppealForm() {
    const navigate = useNavigate()
    const [flags] = useState(fakeOwnFlags)
    const [selectedFlagId, setSelectedFlagId] = useState(fakeOwnFlags[0]?.id || '')
    const [appealText, setAppealText] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const selectedFlag = flags.find(f => f.id === selectedFlagId)

    const handleSubmit = () => {
        if (appealText.trim().length < 20) {
            setError('Please write at least 20 characters explaining your appeal.')
            return
        }

        // ── Skip API call (uncomment when backend is ready) ──
        // await fetch(`http://localhost:4000/api/appeals/${selectedFlagId}`, {
        //   method: 'POST',
        //   headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ text: appealText })
        // })

        setSubmitted(true)
        setError('')
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a5fa8 0%, #3b8fd4 50%, #7bbfe8 100%)',
        }}>

            {/* Navbar */}
            <div style={{
                background: 'rgba(255,255,255,0.15)', padding: '1rem 2rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px', height: '36px', background: 'white', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <span style={{ color: '#1a5fa8', fontSize: '13px', fontWeight: '500' }}>GR</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '500', fontSize: '16px' }}>Guardrail LMS</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginLeft: '4px' }}>/ Submit Appeal</span>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white', borderRadius: '6px', padding: '5px 14px',
                        fontSize: '13px', cursor: 'pointer'
                    }}
                >
                    ← Back to Dashboard
                </button>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>

                {submitted ? (
                    /* Success state */
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '2rem', textAlign: 'center'
                    }}>
                        <p style={{ fontSize: '32px', margin: '0 0 12px' }}>✅</p>
                        <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: '18px', color: '#1a1a2e' }}>
                            Appeal Submitted
                        </p>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: '#666' }}>
                            Your appeal has been sent to your teacher for review. You will be notified of their decision.
                        </p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            style={{
                                padding: '10px 24px', background: '#1a5fa8', color: 'white',
                                border: 'none', borderRadius: '6px', fontSize: '14px',
                                fontWeight: '500', cursor: 'pointer'
                            }}
                        >
                            Back to Dashboard
                        </button>
                    </div>

                ) : (
                    /* Appeal form */
                    <div style={{ background: 'white', borderRadius: '12px', padding: '2rem' }}>

                        <p style={{ margin: '0 0 4px', fontWeight: '600', fontSize: '18px', color: '#1a1a2e' }}>
                            Submit an Appeal
                        </p>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '13px', color: '#888' }}>
                            If you believe a flag raised on your account is incorrect, explain your case below.
                        </p>

                        {/* Flag selector */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                                Select Flag to Appeal
                            </label>
                            <select
                                value={selectedFlagId}
                                onChange={(e) => setSelectedFlagId(e.target.value)}
                                style={{
                                    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
                                    borderRadius: '6px', fontSize: '14px', background: 'white',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {flags.map(flag => (
                                    <option key={flag.id} value={flag.id}>
                                        {flag.assignmentId} — {new Date(flag.createdAt).toLocaleDateString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selected flag info */}
                        {selectedFlag && (
                            <div style={{
                                background: '#fff8f0', border: '1px solid #fed7aa',
                                borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem'
                            }}>
                                <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '600', color: '#e67e22' }}>
                                    ⚠️ Flag Details
                                </p>
                                <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#666' }}>
                                    Assignment: {selectedFlag.assignmentId}
                                </p>
                                <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#666' }}>
                                    Confidence: {selectedFlag.confidence}%
                                </p>
                                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                                    Flagged: {new Date(selectedFlag.createdAt).toLocaleString()}
                                </p>
                            </div>
                        )}

                        {/* Appeal text */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                                Your Explanation
                            </label>
                            <textarea
                                value={appealText}
                                onChange={(e) => setAppealText(e.target.value)}
                                placeholder="Explain why you believe this flag is incorrect. Be as specific as possible — e.g. 'The paste events were from my own notes saved locally.'"
                                style={{
                                    width: '100%', height: '180px', padding: '10px 12px',
                                    border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px',
                                    lineHeight: '1.6', resize: 'none', boxSizing: 'border-box',
                                    fontFamily: 'inherit', outline: 'none'
                                }}
                            />
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: appealText.length < 20 ? '#e74c3c' : '#27ae60' }}>
                                {appealText.length} characters {appealText.length < 20 ? `(minimum 20)` : '✓'}
                            </p>
                        </div>

                        {error && (
                            <p style={{ color: '#e74c3c', fontSize: '13px', marginBottom: '1rem' }}>{error}</p>
                        )}

                        <button
                            onClick={handleSubmit}
                            style={{
                                width: '100%', padding: '10px', background: '#1a5fa8', color: 'white',
                                border: 'none', borderRadius: '6px', fontSize: '15px',
                                fontWeight: '500', cursor: 'pointer'
                            }}
                        >
                            Submit Appeal
                        </button>

                    </div>
                )}
            </div>
        </div>
    )
}

export default AppealForm
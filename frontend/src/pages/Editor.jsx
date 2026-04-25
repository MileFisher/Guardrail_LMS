import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

function Editor() {
    const [text, setText] = useState('')
    const [status, setStatus] = useState('Session started. You may begin typing.')
    const [submitted, setSubmitted] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // ── Fake session (remove when backend is ready) ───────────────────────────
    const sessionId = 'fake-session-001'
    const hmacKey = 'fake-hmac-key'
    // ─────────────────────────────────────────────────────────────────────────

    const events = useRef([])
    const keyDownTimes = useRef({})
    const lastKeyUpTime = useRef(null)
    const navigate = useNavigate()
    const token = localStorage.getItem('token')

    // Capture keydown
    const handleKeyDown = (e) => {
        if (submitted) return
        if (!keyDownTimes.current[e.key]) {
            keyDownTimes.current[e.key] = Date.now()
        }
    }

    // Capture keyup
    const handleKeyUp = (e) => {
        if (submitted) return
        const downTime = keyDownTimes.current[e.key]
        if (!downTime) return

        const dwellTime = Date.now() - downTime
        const flightTime = lastKeyUpTime.current ? downTime - lastKeyUpTime.current : null

        events.current.push({
            type: 'keystroke',
            key: e.key,
            dwellTime,
            flightTime,
            timestamp: new Date().toISOString()
        })

        lastKeyUpTime.current = Date.now()
        delete keyDownTimes.current[e.key]
    }

    // Capture paste
    const handlePaste = () => {
        if (submitted) return
        events.current.push({ type: 'paste', timestamp: new Date().toISOString() })
    }

    // Capture blur
    useEffect(() => {
        const handleBlur = () => {
            if (submitted) return
            events.current.push({ type: 'blur', timestamp: new Date().toISOString() })
        }
        window.addEventListener('blur', handleBlur)
        return () => window.removeEventListener('blur', handleBlur)
    }, [submitted])

    // Batch telemetry send every 5 seconds
    // ── Skipping real API call (uncomment when backend is ready) ─────────────
    // useEffect(() => {
    //   if (!sessionId || !hmacKey) return
    //   const interval = setInterval(async () => {
    //     if (events.current.length === 0) return
    //     ... HMAC signing + fetch to /api/telemetry/payloads ...
    //   }, 5000)
    //   return () => clearInterval(interval)
    // }, [sessionId, hmacKey])
    // ─────────────────────────────────────────────────────────────────────────

    // Fake telemetry sync status every 5 seconds
    useEffect(() => {
        if (submitted) return
        const interval = setInterval(() => {
            if (events.current.length > 0) {
                events.current = []
                setStatus(`Last sync: ${new Date().toLocaleTimeString()}`)
            }
        }, 5000)
        return () => clearInterval(interval)
    }, [submitted])

    const handleSubmit = () => {
        if (text.trim().length === 0) {
            alert('Please write something before submitting.')
            return
        }
        setShowConfirm(true)
    }

    const handleConfirmSubmit = () => {
        // ── Skip API call (uncomment when backend is ready) ──
        // await fetch('http://localhost:4000/api/submissions', { ... })
        setShowConfirm(false)
        setSubmitted(true)
        setStatus('Assignment submitted. Session locked.')

        navigate('/dashboard')
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a5fa8 0%, #3b8fd4 50%, #7bbfe8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>

            {/* Confirm submit modal */}
            {showConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '2rem',
                        width: '380px', margin: '1rem'
                    }}>
                        <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: '16px' }}>Submit Assignment?</p>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: '#666' }}>
                            Once submitted, you cannot edit your response. Are you sure?
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleConfirmSubmit}
                                style={{
                                    flex: 1, padding: '10px', background: '#1a5fa8', color: 'white',
                                    border: 'none', borderRadius: '6px', fontSize: '14px',
                                    fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                Yes, Submit
                            </button>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    flex: 1, padding: '10px', background: 'white', color: '#666',
                                    border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px',
                                    fontWeight: '500', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ width: '700px', background: 'white', borderRadius: '12px', padding: '2rem' }}>

                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px', height: '36px', background: '#1a5fa8', borderRadius: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>GR</span>
                        </div>
                        <p style={{ margin: 0, fontWeight: '500', fontSize: '15px' }}>Assignment Editor</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {submitted && (
                            <span style={{
                                fontSize: '12px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px',
                                background: '#f0fdf4', color: '#27ae60', border: '1px solid #bbf7d0'
                            }}>
                                ✅ Submitted
                            </span>
                        )}
                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{status}</p>
                    </div>
                </div>

                {/* Submitted banner */}
                {submitted && (
                    <div style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
                        padding: '12px 16px', marginBottom: '1rem', fontSize: '14px', color: '#27ae60'
                    }}>
                        ✅ Your assignment has been submitted successfully. This session is now locked.
                    </div>
                )}

                {/* Text area */}
                <textarea
                    value={text}
                    onChange={(e) => { if (!submitted) setText(e.target.value) }}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    onPaste={handlePaste}
                    placeholder={submitted ? 'Session locked.' : 'Start typing your assignment here...'}
                    disabled={submitted}
                    style={{
                        width: '100%', height: '350px', padding: '1rem',
                        fontSize: '15px', lineHeight: '1.7', border: '1px solid #ddd',
                        borderRadius: '8px', resize: 'none', boxSizing: 'border-box',
                        fontFamily: 'inherit', outline: 'none',
                        background: submitted ? '#f9f9f9' : 'white',
                        color: submitted ? '#999' : '#1a1a2e',
                        cursor: submitted ? 'not-allowed' : 'text'
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            padding: '8px 20px', background: 'white', color: '#1a5fa8',
                            border: '1px solid #1a5fa8', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
                        }}
                    >
                        Back to Dashboard
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitted}
                        style={{
                            padding: '8px 20px',
                            background: submitted ? '#ccc' : '#1a5fa8',
                            color: 'white', border: 'none', borderRadius: '6px',
                            cursor: submitted ? 'not-allowed' : 'pointer', fontSize: '14px'
                        }}
                    >
                        {submitted ? 'Submitted' : 'Submit Assignment'}
                    </button>
                </div>

            </div>
        </div>
    )
}

export default Editor
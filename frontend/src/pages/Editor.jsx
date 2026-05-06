import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Consent from './Consent'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function detectDeviceType() {
    if (window.matchMedia('(pointer: coarse)').matches) {
        return 'tablet'
    }

    return window.innerWidth >= 1400 ? 'desktop' : 'laptop'
}

async function apiPost(path, body, extraHeaders = {}) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
        throw new Error(data.message || `POST ${path} failed`)
    }

    return data
}

function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')
}

function Editor() {
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignmentId')
    const [text, setText] = useState('')
    const [status, setStatus] = useState('Preparing monitored session...')
    const [submitted, setSubmitted] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [session, setSession] = useState(null)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const [showConsent, setShowConsent] = useState(!localStorage.getItem('consentAccepted'))

    const events = useRef([])
    const keyDownTimes = useRef({})
    const lastKeyUpTime = useRef(null)
    const cumulativePasteChars = useRef(0)
    const flushPromise = useRef(null)
    const signingKey = useRef(null)

    const navigate = useNavigate()

    const handleConsentAccepted = async () => {
        try {
            const token = localStorage.getItem('token')
            await fetch(`${API_BASE}/api/consent/accept`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })
        } catch (err) {
            console.error('Failed to log consent:', err)
        }
        localStorage.setItem('consentAccepted', 'true')
        setShowConsent(false)
    }

    const handleConsentDeclined = () => {
        setShowConsent(false)
        navigate('/dashboard')
    }

    const importSigningKey = useCallback(async (secret) => {
        if (signingKey.current?.secret === secret) {
            return signingKey.current.key
        }

        const key = await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )

        signingKey.current = { secret, key }
        return key
    }, [])

    const signTelemetryBody = useCallback(async (secret, rawBody) => {
        const key = await importSigningKey(secret)
        const signature = await window.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
        return toHex(signature)
    }, [importSigningKey])

    const flushEvents = useCallback(async () => {
        if (flushPromise.current) {
            return flushPromise.current
        }

        if (!session?.id || !session.hmacKey || events.current.length === 0) {
            return null
        }

        const pendingEvents = events.current.slice()

        flushPromise.current = (async () => {
            const rawBody = JSON.stringify({
                sessionId: session.id,
                events: pendingEvents,
            })
            const signature = await signTelemetryBody(session.hmacKey, rawBody)

            await apiPost('/api/telemetry/payloads', rawBody, {
                'x-telemetry-signature': signature,
            })

            events.current = events.current.slice(pendingEvents.length)
            setStatus(`Last sync: ${new Date().toLocaleTimeString()}`)
        })()
            .catch((flushError) => {
                setError(flushError.message || 'Failed to sync telemetry.')
                throw flushError
            })
            .finally(() => {
                flushPromise.current = null
            })

        return flushPromise.current
    }, [session, signTelemetryBody])

    useEffect(() => {
        let cancelled = false

        async function openSession() {
            if (!assignmentId) {
                setError('Missing assignmentId in the editor URL.')
                setStatus('Cannot start telemetry session.')
                return
            }

            if (showConsent) {
                return
            }

            try {
                setError('')
                const response = await apiPost('/api/telemetry/sessions', {
                    assignmentId,
                    deviceType: detectDeviceType(),
                    screenResolution: `${window.screen.width}x${window.screen.height}`,
                })

                if (!cancelled) {
                    setSession(response.session)
                    setStatus('Session started. You may begin typing.')
                }
            } catch (sessionError) {
                if (!cancelled) {
                    setError(sessionError.message || 'Failed to create telemetry session.')
                    setStatus('Unable to start telemetry session.')
                }
            }
        }

        openSession()

        return () => {
            cancelled = true
        }
    }, [assignmentId, showConsent])

    useEffect(() => {
        if (!session?.id || submitted) {
            return undefined
        }

        const interval = window.setInterval(() => {
            flushEvents().catch(() => {})
        }, 5000)

        return () => window.clearInterval(interval)
    }, [flushEvents, session, submitted])

    useEffect(() => {
        if (!session?.id || submitted) {
            return undefined
        }

        const handleBlur = () => {
            events.current.push({
                type: 'blur',
                blurCountDelta: 1,
                timestamp: new Date().toISOString(),
            })
        }

        window.addEventListener('blur', handleBlur)
        return () => window.removeEventListener('blur', handleBlur)
    }, [session, submitted])

    const handleKeyDown = (event) => {
        if (submitted || !session?.id) {
            return
        }

        if (!keyDownTimes.current[event.code]) {
            keyDownTimes.current[event.code] = Date.now()
        }
    }

    const handleKeyUp = (event) => {
        if (submitted || !session?.id) {
            return
        }

        const downTime = keyDownTimes.current[event.code]

        if (!downTime) {
            return
        }

        const now = Date.now()
        const dwellTime = now - downTime
        const flightTime = lastKeyUpTime.current ? downTime - lastKeyUpTime.current : null

        events.current.push({
            type: 'keystroke',
            code: event.code,
            dwellTime,
            flightTime,
            timestamp: new Date(now).toISOString(),
        })

        lastKeyUpTime.current = now
        delete keyDownTimes.current[event.code]
    }

    const handlePaste = (event) => {
        if (submitted || !session?.id) {
            return
        }

        const pastedText = event.clipboardData?.getData('text') || ''
        const pasteChars = pastedText.length
        cumulativePasteChars.current += pasteChars

        events.current.push({
            type: 'paste',
            pasteChars,
            cumulativePasteChars: cumulativePasteChars.current,
            timestamp: new Date().toISOString(),
        })
    }

    const handleSubmit = () => {
        if (text.trim().length === 0) {
            setError('Please write something before submitting.')
            return
        }

        setError('')
        setShowConfirm(true)
    }

    const handleConfirmSubmit = async () => {
        if (!session?.id) {
            setError('Telemetry session is not ready yet.')
            return
        }

        try {
            setSubmitting(true)
            setError('')

            // 1. Flush any remaining telemetry events
            await flushEvents()

            // 2. Submit the essay as JSON. The backend currently persists the
            //    text directly and associates it with the telemetry session.
            await apiPost('/api/submissions', {
                assignmentId: session.assignmentId || assignmentId,
                sessionId: session.id,
                contentText: text,
            })

            // 3. Mark telemetry session as complete and lock it
            await apiPost(`/api/telemetry/sessions/${session.id}/complete`, {})

            setShowConfirm(false)
            setSubmitted(true)
            setStatus('Assignment submitted. Session locked.')
            navigate('/dashboard')
        } catch (submitError) {
            setError(submitError.message || 'Failed to submit assignment.')
        } finally {
            setSubmitting(false)
        }
    }

    const isEditorLocked = submitted || submitting || !session?.id

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a5fa8 0%, #3b8fd4 50%, #7bbfe8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
            }}
        >
            {showConsent && (
                <Consent
                    onAccepted={handleConsentAccepted}
                    onDeclined={handleConsentDeclined}
                />
            )}
            {showConfirm && (
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
                            background: 'white',
                            borderRadius: '12px',
                            padding: '2rem',
                            width: '380px',
                            margin: '1rem',
                        }}
                    >
                        <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: '16px' }}>Submit Assignment?</p>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: '#666' }}>
                            Once submitted, you cannot edit your response. Are you sure?
                        </p>
                        {error && (
                            <div style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '10px 12px',
                                marginBottom: '1rem',
                                fontSize: '13px',
                                color: '#b91c1c',
                            }}>
                                {error}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleConfirmSubmit}
                                disabled={submitting}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: submitting ? '#6b9fd4' : '#1a5fa8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {submitting ? 'Submitting...' : error ? 'Try Again' : 'Yes, Submit'}
                            </button>
                            <button
                                onClick={() => { setShowConfirm(false); setError('') }}
                                disabled={submitting}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: 'white',
                                    color: '#666',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ width: '700px', background: 'white', borderRadius: '12px', padding: '2rem' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid #eee',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                        <p style={{ margin: 0, fontWeight: '500', fontSize: '15px' }}>Assignment Editor</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {submitted && (
                            <span
                                style={{
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    background: '#f0fdf4',
                                    color: '#27ae60',
                                    border: '1px solid #bbf7d0',
                                }}
                            >
                                Submitted
                            </span>
                        )}
                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{status}</p>
                    </div>
                </div>

                {error && (
                    <div
                        style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            fontSize: '13px',
                        }}
                    >
                        {error}
                    </div>
                )}

                {submitted && (
                    <div
                        style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '1rem',
                            fontSize: '14px',
                            color: '#27ae60',
                        }}
                    >
                        Your assignment has been submitted successfully. This session is now locked.
                    </div>
                )}

                <textarea
                    value={text}
                    onChange={(event) => {
                        if (!submitted) {
                            setText(event.target.value)
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    onPaste={handlePaste}
                    placeholder={isEditorLocked ? 'Session is preparing...' : 'Start typing your assignment here...'}
                    disabled={isEditorLocked}
                    style={{
                        width: '100%',
                        height: '350px',
                        padding: '1rem',
                        fontSize: '15px',
                        lineHeight: '1.7',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        resize: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        outline: 'none',
                        background: isEditorLocked ? '#f9f9f9' : 'white',
                        color: isEditorLocked ? '#999' : '#1a1a2e',
                        cursor: isEditorLocked ? 'not-allowed' : 'text',
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            padding: '8px 20px',
                            background: 'white',
                            color: '#1a5fa8',
                            border: '1px solid #1a5fa8',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        Back to Dashboard
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isEditorLocked}
                        style={{
                            padding: '8px 20px',
                            background: isEditorLocked ? '#ccc' : '#1a5fa8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isEditorLocked ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        {submitting ? 'Submitting...' : submitted ? 'Submitted' : 'Submit Assignment'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Editor

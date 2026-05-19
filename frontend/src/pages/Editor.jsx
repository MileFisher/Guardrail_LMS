import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Consent from './Consent'
import { SOURCE_OPTIONS } from '../constants/provenance'

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

function SourceChip({ value, selected, onToggle }) {
    const option = SOURCE_OPTIONS.find((item) => item.value === value)

    return (
        <button
            type="button"
            onClick={() => onToggle(value)}
            style={{
                padding: '6px 10px',
                borderRadius: '999px',
                border: `1px solid ${selected ? '#1a5fa8' : '#dbe7f3'}`,
                background: selected ? '#eff6ff' : 'white',
                color: selected ? '#1a5fa8' : '#64748b',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
            }}
        >
            {option?.label || value}
        </button>
    )
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
    const [showDeclarationPrompt, setShowDeclarationPrompt] = useState(false)
    const [declarationSaving, setDeclarationSaving] = useState(false)
    const [declaredSources, setDeclaredSources] = useState([])
    const [declarationSourceType, setDeclarationSourceType] = useState('own_notes')
    const [declarationDetail, setDeclarationDetail] = useState('')
    const [lastDeclaration, setLastDeclaration] = useState(null)
    const [requiresPasteDeclaration, setRequiresPasteDeclaration] = useState(false)
    const [reflectionText, setReflectionText] = useState('')
    const [transformationNotes, setTransformationNotes] = useState('')

    const [showConsent, setShowConsent] = useState(!localStorage.getItem('consentAccepted'))

    const events = useRef([])
    const keyDownTimes = useRef({})
    const lastKeyUpTime = useRef(null)
    const cumulativePasteChars = useRef(0)
    const flushPromise = useRef(null)
    const signingKey = useRef(null)

    const navigate = useNavigate()

    const toggleDeclaredSource = (value) => {
        setDeclaredSources((previous) =>
            previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]
        )
    }

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
                    if (response.session?.pasteThresholdChars === 0) {
                        setRequiresPasteDeclaration(false)
                    }
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
        const previousCumulative = cumulativePasteChars.current
        cumulativePasteChars.current += pasteChars

        events.current.push({
            type: 'paste',
            pasteChars,
            cumulativePasteChars: cumulativePasteChars.current,
            timestamp: new Date().toISOString(),
        })

        const threshold = Number(session?.pasteThresholdChars || 0)
        if (
            threshold > 0 &&
            previousCumulative < threshold &&
            cumulativePasteChars.current >= threshold
        ) {
            setRequiresPasteDeclaration(true)
            setShowDeclarationPrompt(true)
            setStatus('Large paste detected. Please declare the source before submitting.')
        }
    }

    const handleSubmit = () => {
        if (text.trim().length === 0) {
            setError('Please write something before submitting.')
            return
        }

        if (requiresPasteDeclaration) {
            setError('Please declare the source of your pasted material before submitting.')
            setShowDeclarationPrompt(true)
            return
        }

        setError('')
        setShowConfirm(true)
    }

    const handleSaveDeclaration = async () => {
        if (!session?.id) {
            setError('Telemetry session is not ready yet.')
            return
        }

        if (!declarationSourceType) {
            setError('Please choose a source for the pasted material.')
            return
        }

        try {
            setDeclarationSaving(true)
            setError('')

            const result = await apiPost('/api/provenance/declarations', {
                assignmentId: session.assignmentId || assignmentId,
                sessionId: session.id,
                sourceType: declarationSourceType,
                detailText: declarationDetail,
            })

            setLastDeclaration(result.event || null)
            setRequiresPasteDeclaration(false)
            setDeclaredSources((previous) =>
                previous.includes(declarationSourceType) ? previous : [...previous, declarationSourceType]
            )
            setDeclarationDetail('')
            setShowDeclarationPrompt(false)
            setStatus('Source declaration saved.')
        } catch (declarationError) {
            setError(declarationError.message || 'Failed to save source declaration.')
        } finally {
            setDeclarationSaving(false)
        }
    }

    const handleConfirmSubmit = async () => {
        if (!session?.id) {
            setError('Telemetry session is not ready yet.')
            return
        }

        if (declaredSources.length === 0) {
            setError('Please declare at least one source before submitting.')
            return
        }

        if (reflectionText.trim().length < 20) {
            setError('Please add a short submission reflection of at least 20 characters.')
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
                declaredSources,
                reflectionText,
                transformationNotes,
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
                            width: '520px',
                            margin: '1rem',
                        }}
                    >
                        <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: '16px' }}>Submit Assignment?</p>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: '#666' }}>
                            Once submitted, you cannot edit your response. Are you sure?
                        </p>
                        <div style={{ marginBottom: '1rem', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Ethical AI provenance
                            </p>
                            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                                Declare what sources or AI tools informed this submission and explain how you transformed them into your own work.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                {SOURCE_OPTIONS.map((option) => (
                                    <SourceChip
                                        key={option.value}
                                        value={option.value}
                                        selected={declaredSources.includes(option.value)}
                                        onToggle={toggleDeclaredSource}
                                    />
                                ))}
                            </div>
                            <textarea
                                value={reflectionText}
                                onChange={(event) => setReflectionText(event.target.value)}
                                placeholder="Reflection: what sources or AI support did you use, and how did you adapt them into your own submission?"
                                rows={4}
                                style={{ width: '100%', boxSizing: 'border-box', resize: 'none', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', marginBottom: '10px' }}
                            />
                            <textarea
                                value={transformationNotes}
                                onChange={(event) => setTransformationNotes(event.target.value)}
                                placeholder="Optional transformation notes: what changed between the source material and your final answer?"
                                rows={3}
                                style={{ width: '100%', boxSizing: 'border-box', resize: 'none', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit' }}
                            />
                            <p style={{ margin: '8px 0 0', fontSize: '12px', color: reflectionText.trim().length >= 20 ? '#15803d' : '#b45309' }}>
                                Reflection length: {reflectionText.trim().length} characters
                            </p>
                        </div>
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
            {showDeclarationPrompt && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 110,
                    }}
                >
                    <div style={{ background: 'white', borderRadius: '14px', padding: '24px', width: '460px', margin: '1rem' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '700', color: '#1a1a2e' }}>Declare pasted material source</p>
                        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                            A large paste was detected in this monitored session. Before submission, please declare where that material came from.
                        </p>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Source</label>
                            <select
                                value={declarationSourceType}
                                onChange={(event) => setDeclarationSourceType(event.target.value)}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            >
                                {SOURCE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Context</label>
                            <textarea
                                value={declarationDetail}
                                onChange={(event) => setDeclarationDetail(event.target.value)}
                                placeholder="Example: I drafted this paragraph in my own notes app earlier and pasted it here to avoid losing work."
                                rows={4}
                                style={{ width: '100%', boxSizing: 'border-box', resize: 'none', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={handleSaveDeclaration}
                                disabled={declarationSaving}
                                style={{ flex: 1, padding: '10px', background: declarationSaving ? '#93c5fd' : '#1a5fa8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: declarationSaving ? 'not-allowed' : 'pointer' }}
                            >
                                {declarationSaving ? 'Saving...' : 'Save declaration'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDeclarationPrompt(false)}
                                disabled={declarationSaving}
                                style={{ flex: 1, padding: '10px', background: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: declarationSaving ? 'not-allowed' : 'pointer' }}
                            >
                                Close
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

                <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div>
                            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                AI provenance
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                Large paste threshold: {session?.pasteThresholdChars ?? 'N/A'} chars
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowDeclarationPrompt(true)}
                            disabled={!session?.id}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: '600', cursor: !session?.id ? 'not-allowed' : 'pointer' }}
                        >
                            Declare source
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                        {declaredSources.length === 0 ? (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>No sources declared yet.</span>
                        ) : (
                            declaredSources.map((source) => (
                                <SourceChip key={source} value={source} selected={true} onToggle={toggleDeclaredSource} />
                            ))
                        )}
                    </div>
                    {requiresPasteDeclaration && (
                        <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#b45309', fontWeight: '600' }}>
                            Large pasted content has been detected. A source declaration is required before submission.
                        </p>
                    )}
                    {lastDeclaration && !requiresPasteDeclaration && (
                        <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#15803d' }}>
                            Latest declaration saved for this session.
                        </p>
                    )}
                </div>

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

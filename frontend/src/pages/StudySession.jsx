import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function apiGet(path) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `GET ${path} failed`)
    return data
}

async function apiPost(path, body) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `POST ${path} failed`)
    return data
}

// ── Hint level config ─────────────────────────────────────────────────────────
const HINT_LEVELS = {
    1: {
        label: 'L1 · Nudge',
        description: 'Broad conceptual direction',
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe',
        dot: '#3b82f6',
    },
    2: {
        label: 'L2 · Scaffold',
        description: 'Structural sub-steps (no answers)',
        color: '#7c3aed',
        bg: '#faf5ff',
        border: '#ddd6fe',
        dot: '#8b5cf6',
    },
    3: {
        label: 'L3 · Guided',
        description: 'Near-answer — you complete the last step',
        color: '#c2410c',
        bg: '#fff7ed',
        border: '#fed7aa',
        dot: '#f97316',
    },
}

const MIN_WORDS = 30 // client-side preview; server enforces

function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HintLevelBar({ current, max }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[1, 2, 3].map((lvl) => {
                const cfg = HINT_LEVELS[lvl]
                const active = lvl === current
                const unlocked = lvl <= current
                const locked = lvl > (max || 3)
                return (
                    <div
                        key={lvl}
                        title={cfg.description}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: active ? '700' : '500',
                            background: active ? cfg.bg : locked ? '#f5f5f5' : '#fafafa',
                            color: active ? cfg.color : locked ? '#ccc' : '#aaa',
                            border: `1.5px solid ${active ? cfg.border : locked ? '#eee' : '#eee'}`,
                            transition: 'all .2s',
                            cursor: 'default',
                            userSelect: 'none',
                        }}
                    >
                        <span
                            style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: active ? cfg.dot : locked ? '#ddd' : unlocked ? cfg.dot : '#ddd',
                                flexShrink: 0,
                            }}
                        />
                        {cfg.label}
                    </div>
                )
            })}
        </div>
    )
}

function EffortGateBar({ wordCount, minWords }) {
    const pct = Math.min(100, Math.round((wordCount / minWords) * 100))
    const ready = wordCount >= minWords
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: ready ? '#f0fdf4' : '#fffbeb', borderRadius: '8px', border: `1px solid ${ready ? '#bbf7d0' : '#fde68a'}` }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: ready ? '#15803d' : '#92400e' }}>
                        {ready ? '✓ Effort gate passed' : `Effort gate — type at least ${minWords} words first`}
                    </span>
                    <span style={{ fontSize: '11px', color: '#aaa' }}>{wordCount}/{minWords}</span>
                </div>
                <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: ready ? '#22c55e' : '#fbbf24',
                            borderRadius: '4px',
                            transition: 'width .3s',
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

function ChatBubble({ msg }) {
    const isUser = msg.role === 'user'
    const isSystem = msg.role === 'system'

    if (isSystem) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '8px 0',
                }}
            >
                <div
                    style={{
                        padding: '6px 14px',
                        background: msg.variant === 'error' ? '#fef2f2' : msg.variant === 'warn' ? '#fffbeb' : '#f0fdf4',
                        border: `1px solid ${msg.variant === 'error' ? '#fecaca' : msg.variant === 'warn' ? '#fde68a' : '#bbf7d0'}`,
                        color: msg.variant === 'error' ? '#b91c1c' : msg.variant === 'warn' ? '#92400e' : '#15803d',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '500',
                        maxWidth: '400px',
                        textAlign: 'center',
                    }}
                >
                    {msg.content}
                </div>
            </div>
        )
    }

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: '12px',
                gap: '10px',
                alignItems: 'flex-end',
            }}
        >
            {!isUser && (
                <div
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1a5fa8, #3b8fd4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'white',
                    }}
                >
                    GR
                </div>
            )}

            <div
                style={{
                    maxWidth: '68%',
                    padding: '11px 15px',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isUser ? 'linear-gradient(135deg, #1a5fa8, #2563eb)' : 'white',
                    color: isUser ? 'white' : '#1a1a2e',
                    fontSize: '14px',
                    lineHeight: '1.55',
                    boxShadow: isUser ? '0 2px 8px rgba(26,95,168,0.25)' : '0 1px 4px rgba(0,0,0,0.08)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}
            >
                {msg.hintLevel && (
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginBottom: '8px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            background: HINT_LEVELS[msg.hintLevel]?.bg || '#f5f5f5',
                            color: HINT_LEVELS[msg.hintLevel]?.color || '#666',
                            border: `1px solid ${HINT_LEVELS[msg.hintLevel]?.border || '#ddd'}`,
                        }}
                    >
                        <span
                            style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: HINT_LEVELS[msg.hintLevel]?.dot || '#aaa',
                            }}
                        />
                        {HINT_LEVELS[msg.hintLevel]?.label}
                    </div>
                )}
                {msg.content}
                {msg.loading && (
                    <span style={{ display: 'inline-flex', gap: '3px', marginLeft: '6px', verticalAlign: 'middle' }}>
                        {[0, 1, 2].map((i) => (
                            <span
                                key={i}
                                style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: '#1a5fa8',
                                    animation: `bounce 1s ${i * 0.18}s infinite`,
                                }}
                            />
                        ))}
                    </span>
                )}
            </div>
        </div>
    )
}

function MaxHintMessage({ onContact }) {
    return (
        <div
            style={{
                margin: '16px 0',
                padding: '18px 20px',
                background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
                border: '1.5px solid #fcd34d',
                borderRadius: '14px',
                textAlign: 'center',
            }}
        >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎓</div>
            <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '700', color: '#92400e' }}>
                Maximum hint level reached
            </p>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#b45309', lineHeight: 1.5 }}>
                You've received all available hints for this topic. To go further, try working through the last
                step on your own — or consult your teacher or course materials.
            </p>
            <button
                onClick={onContact}
                style={{
                    padding: '7px 18px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                }}
            >
                Contact your teacher
            </button>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────

function StudySession() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const assignmentId = searchParams.get('assignmentId')
    const courseId = searchParams.get('courseId')

    const [user, setUser] = useState(null)
    const [assignment, setAssignment] = useState(null)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [hintLevel, setHintLevel] = useState(1)
    const [wordsSinceLastHint, setWordsSinceLastHint] = useState(0)
    const [minWordsForHint, setMinWordsForHint] = useState(MIN_WORDS)
    const [maxHintReached, setMaxHintReached] = useState(false)
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [error, setError] = useState('')
    const messagesEndRef = useRef(null)
    const textareaRef = useRef(null)

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const raw = localStorage.getItem('user')
        if (raw) setUser(JSON.parse(raw))

        async function load() {
            try {
                if (assignmentId) {
                    const data = await apiGet(`/api/courses/${courseId}/assignments`).catch(() => null)
                    if (data) {
                        const found = data.assignments?.find((a) => String(a.id) === String(assignmentId))
                        if (found) {
                            setAssignment(found)
                            setMinWordsForHint(found.minWordsForHint || MIN_WORDS)
                        }
                    }
                }
            } catch {
                // non-fatal
            } finally {
                setPageLoading(false)
            }
        }
        load()
    }, [assignmentId, courseId])

    // ── Auto-scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // ── Word tracking ─────────────────────────────────────────────────────────
    const currentWords = countWords(input)
    const effortSatisfied = currentWords >= minWordsForHint

    function handleInputChange(e) {
        setInput(e.target.value)
    }

    // ── Send hint request ─────────────────────────────────────────────────────
    async function handleSend() {
        const trimmed = input.trim()
        if (!trimmed || loading || maxHintReached) return

        if (!effortSatisfied) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    role: 'system',
                    variant: 'warn',
                    content: `Please type at least ${minWordsForHint} words before requesting a hint (${currentWords}/${minWordsForHint}).`,
                },
            ])
            return
        }

        const userMsg = { id: Date.now(), role: 'user', content: trimmed }
        const loadingMsg = { id: Date.now() + 1, role: 'assistant', content: '', loading: true }
        setMessages((prev) => [...prev, userMsg, loadingMsg])
        setInput('')
        setWordsSinceLastHint(0)
        setLoading(true)
        setError('')

        try {
            const result = await apiPost('/api/tutor/hint', {
                assignmentId,
                courseId,
                message: trimmed,
                hintLevel,
                wordsTyped: currentWords,
            })

            if (result.jailbreakDetected) {
                // Replace loading bubble with polite refusal — do not show hint content
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === loadingMsg.id
                            ? {
                                  ...m,
                                  content: "That request couldn't be processed. Please ask a genuine study question.",
                                  loading: false,
                                  variant: 'error',
                                  role: 'system',
                              }
                            : m
                    )
                )
            } else {
                // Normal hint — update loading bubble with response
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === loadingMsg.id
                            ? {
                                  ...m,
                                  content: result.response || result.message,
                                  loading: false,
                                  hintLevel: result.hintLevel || hintLevel,
                              }
                            : m
                    )
                )

                const newLevel = result.hintLevel || hintLevel
                setHintLevel(newLevel)

                // Fix: log max hint reached to backend when first hitting the limit
                if (newLevel >= 3 && !maxHintReached) {
                    setMaxHintReached(true)
                    apiPost('/api/tutor/hint-limit-reached', {
                        assignmentId,
                        courseId,
                        hintLevel: newLevel,
                    }).catch(() => {}) // fire-and-forget
                }
            }
        } catch (err) {
            // Remove loading bubble, show error
            setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id))
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    role: 'system',
                    variant: 'error',
                    content: err.message || 'Failed to get a hint. Please try again.',
                },
            ])
        } finally {
            setLoading(false)
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    function handleLogout() {
        localStorage.clear()
        navigate('/login')
    }

    if (pageLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f0f4f8', color: '#666', fontFamily: "'Segoe UI', sans-serif" }}>
                Loading study session...
            </div>
        )
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#f0f4f8',
                fontFamily: "'Segoe UI', sans-serif",
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: .5; }
                    40% { transform: translateY(-5px); opacity: 1; }
                }
                textarea:focus { outline: none; }
                button:hover { opacity: .88; }
            `}</style>

            {/* ── Navbar ─────────────────────────────────────────────────────── */}
            <nav
                style={{
                    height: '56px',
                    background: '#1a5fa8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 2rem',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                        style={{
                            width: '32px',
                            height: '32px',
                            background: 'white',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#1a5fa8' }}>GR</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>Guardrail LMS</span>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginLeft: '4px' }}>/ Study Session</span>
                    {assignment && (
                        <span
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                color: 'rgba(255,255,255,0.9)',
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                marginLeft: '6px',
                            }}
                        >
                            {assignment.title}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            color: 'rgba(255,255,255,0.85)',
                            borderRadius: '6px',
                            padding: '5px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        ← Dashboard
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                        {user?.displayName || 'Student'}
                    </span>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: 'white',
                            borderRadius: '6px',
                            padding: '5px 14px',
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        Logout
                    </button>
                </div>
            </nav>

            {/* ── Main layout ────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', maxWidth: '900px', width: '100%', margin: '0 auto', padding: '1.5rem', gap: '1.5rem', boxSizing: 'border-box', alignItems: 'flex-start' }}>

                {/* ── Left: hint level sidebar ──────────────────────────────── */}
                <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Hint progress card */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                        <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Hint Progress
                        </p>
                        {[1, 2, 3].map((lvl) => {
                            const cfg = HINT_LEVELS[lvl]
                            const active = lvl === hintLevel
                            const past = lvl < hintLevel
                            return (
                                <div
                                    key={lvl}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: '10px 10px',
                                        borderRadius: '8px',
                                        marginBottom: '6px',
                                        background: active ? cfg.bg : 'transparent',
                                        border: `1.5px solid ${active ? cfg.border : 'transparent'}`,
                                        transition: 'all .25s',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            background: past ? '#22c55e' : active ? cfg.dot : '#e5e7eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            color: 'white',
                                            fontSize: '10px',
                                            fontWeight: '700',
                                        }}
                                    >
                                        {past ? '✓' : lvl}
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '12px', fontWeight: active ? '700' : '500', color: active ? cfg.color : past ? '#15803d' : '#aaa' }}>
                                            {cfg.label}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '10px', color: '#bbb', lineHeight: 1.4, marginTop: '1px' }}>
                                            {cfg.description}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Rules card */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            How it works
                        </p>
                        {[
                            'Type your question or show your thinking',
                            `You need ${minWordsForHint}+ words to unlock a hint`,
                            'Hints guide you — they won\'t give direct answers',
                            'Hint level advances as you engage more',
                            'After L3, consult your teacher',
                        ].map((tip, i) => (
                            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '7px', alignItems: 'flex-start' }}>
                                <span style={{ color: '#1a5fa8', fontWeight: '700', fontSize: '12px', flexShrink: 0 }}>{i + 1}.</span>
                                <span style={{ fontSize: '12px', color: '#666', lineHeight: 1.45 }}>{tip}</span>
                            </div>
                        ))}
                    </div>

                    {/* Log note */}
                    <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: '#92400e', lineHeight: 1.4 }}>
                            📋 Your hint interactions are logged and visible to your teacher.
                        </p>
                    </div>
                </div>

                {/* ── Right: chat panel ─────────────────────────────────────── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>

                    {/* Header bar with hint level indicator */}
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>
                                Socratic AI Tutor
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#888', marginTop: '2px' }}>
                                Ask questions — the AI will guide your thinking, not give answers
                            </p>
                        </div>
                        <HintLevelBar current={hintLevel} max={3} />
                    </div>

                    {/* Chat messages */}
                    <div
                        style={{
                            flex: 1,
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                            padding: '20px',
                            minHeight: '340px',
                            maxHeight: '480px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {messages.length === 0 && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc', textAlign: 'center', gap: '10px' }}>
                                <div style={{ fontSize: '36px' }}>💬</div>
                                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#bbb' }}>Start by describing what you're working on</p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#ddd' }}>
                                    Share your attempt or question — show your thinking first
                                </p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <ChatBubble key={msg.id} msg={msg} />
                        ))}

                        {maxHintReached && (
                            <MaxHintMessage onContact={() => window.open('mailto:teacher@school.edu')} />
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Effort gate bar */}
                    <EffortGateBar wordCount={currentWords} minWords={minWordsForHint} />

                    {/* Input area */}
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                            padding: '12px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-end',
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    maxHintReached
                                        ? 'Maximum hint level reached. Consult your teacher or course materials.'
                                        : `Describe what you're working on or where you're stuck… (${currentWords}/${minWordsForHint} words)`
                                }
                                disabled={maxHintReached || loading}
                                rows={3}
                                style={{
                                    width: '100%',
                                    resize: 'none',
                                    border: '1.5px solid #e5e7eb',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    color: '#1a1a2e',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                    background: maxHintReached ? '#f9f9f9' : 'white',
                                    transition: 'border-color .2s',
                                    borderColor: effortSatisfied && !maxHintReached ? '#22c55e' : '#e5e7eb',
                                }}
                            />
                            <p style={{ margin: '4px 0 0 2px', fontSize: '11px', color: '#bbb' }}>
                                Press Enter to send · Shift+Enter for new line · Hint interactions are logged
                            </p>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={loading || maxHintReached || !input.trim()}
                            style={{
                                padding: '12px 20px',
                                background: loading || maxHintReached || !input.trim() ? '#e5e7eb' : 'linear-gradient(135deg, #1a5fa8, #2563eb)',
                                color: loading || maxHintReached || !input.trim() ? '#aaa' : 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: loading || maxHintReached || !input.trim() ? 'not-allowed' : 'pointer',
                                transition: 'all .2s',
                                flexShrink: 0,
                                minWidth: '80px',
                            }}
                        >
                            {loading ? '…' : 'Ask →'}
                        </button>
                    </div>

                    {error && (
                        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '13px' }}>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default StudySession
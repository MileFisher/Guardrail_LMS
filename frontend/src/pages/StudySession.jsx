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
        description: 'Near-answer, you finish the last step',
        color: '#c2410c',
        bg: '#fff7ed',
        border: '#fed7aa',
        dot: '#f97316',
    },
}

function formatSavedTime(value) {
    if (!value) return ''
    return new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function HintLevelBar({ current, max }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                            color: active ? cfg.color : locked ? '#ccc' : '#888',
                            border: `1.5px solid ${active ? cfg.border : locked ? '#eee' : '#eee'}`,
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

function ChatBubble({ msg }) {
    const isUser = msg.role === 'user'
    const isSystem = msg.role === 'system'

    if (isSystem) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                <div
                    style={{
                        padding: '6px 14px',
                        background: msg.variant === 'error' ? '#fef2f2' : msg.variant === 'warn' ? '#fffbeb' : '#f0fdf4',
                        border: `1px solid ${msg.variant === 'error' ? '#fecaca' : msg.variant === 'warn' ? '#fde68a' : '#bbf7d0'}`,
                        color: msg.variant === 'error' ? '#b91c1c' : msg.variant === 'warn' ? '#92400e' : '#15803d',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '500',
                        maxWidth: '420px',
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
                    maxWidth: '78%',
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
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>Tutor limit reached</div>
            <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '700', color: '#92400e' }}>
                Maximum hint level reached
            </p>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#b45309', lineHeight: 1.5 }}>
                You have reached the final hint level for this session. Continue working on your own or contact your teacher.
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

function McqQuestionCard({ index, question, selectedOption, onSelect, onAskAi, disabled }) {
    return (
        <div
            style={{
                background: 'white',
                borderRadius: '14px',
                border: '1px solid #e6ebf2',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                padding: '18px',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                    <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.06em' }}>
                        Question {index + 1}
                    </p>
                    <p style={{ margin: 0, fontSize: '15px', color: '#1a1a2e', lineHeight: 1.6, fontWeight: '600' }}>
                        {question.prompt}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onAskAi(question, selectedOption)}
                    style={{
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Ask AI
                </button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
                {(question.options || []).map((option) => {
                    const checked = selectedOption === option.id
                    return (
                        <label
                            key={option.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '12px',
                                borderRadius: '10px',
                                border: checked ? '1.5px solid #1a5fa8' : '1px solid #dde5ef',
                                background: checked ? '#eff6ff' : '#fafcff',
                                cursor: 'pointer',
                            }}
                        >
                            <input
                                type="radio"
                                name={question.id}
                                checked={checked}
                                disabled={disabled}
                                onChange={() => onSelect(question.id, option.id)}
                                style={{ marginTop: '3px' }}
                            />
                            <div>
                                <p style={{ margin: '0 0 3px', fontSize: '12px', color: '#1a5fa8', fontWeight: '700' }}>
                                    Option {option.id}
                                </p>
                                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                                    {option.text}
                                </p>
                            </div>
                        </label>
                    )
                })}
            </div>
        </div>
    )
}

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
    const [maxHintReached, setMaxHintReached] = useState(false)
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [error, setError] = useState('')
    const [mcqAnswers, setMcqAnswers] = useState({})
    const [mcqSaveState, setMcqSaveState] = useState('idle')
    const [mcqSavedAt, setMcqSavedAt] = useState('')
    const [mcqSubmittedAt, setMcqSubmittedAt] = useState('')
    const messagesEndRef = useRef(null)
    const textareaRef = useRef(null)
    const saveRequestRef = useRef(0)

    const isMcqAssignment = assignment?.assignmentType === 'mcq'
    const mcqQuestions = Array.isArray(assignment?.mcqQuestions) ? assignment.mcqQuestions : []

    useEffect(() => {
        const raw = localStorage.getItem('user')
        if (raw) {
            setUser(JSON.parse(raw))
        }

        async function load() {
            try {
                if (assignmentId && courseId) {
                    const data = await apiGet(`/api/courses/${courseId}/assignments`).catch(() => null)
                    if (data) {
                        const found = data.assignments?.find((item) => String(item.id) === String(assignmentId))
                        if (found) {
                            setAssignment(found)
                            setMcqAnswers(found.studentMcqResponse || {})
                            setMcqSavedAt(found.studentMcqUpdatedAt || '')
                            setMcqSubmittedAt(found.studentMcqSubmittedAt || '')
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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    function handleInputChange(e) {
        setInput(e.target.value)
    }

    async function handleSend() {
        const trimmed = input.trim()
        if (!trimmed || loading || maxHintReached) return

        const userMsg = { id: Date.now(), role: 'user', content: trimmed }
        const loadingMsg = { id: Date.now() + 1, role: 'assistant', content: '', loading: true }
        setMessages((prev) => [...prev, userMsg, loadingMsg])
        setInput('')
        setLoading(true)
        setError('')

        try {
            const result = await apiPost('/api/tutor/hint', {
                assignmentId,
                courseId,
                message: trimmed,
            })

            if (result.jailbreakDetected) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === loadingMsg.id
                            ? {
                                  ...msg,
                                  content: result.response || result.message,
                                  loading: false,
                                  variant: 'error',
                                  role: 'system',
                              }
                            : msg
                    )
                )
            } else {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === loadingMsg.id
                            ? {
                                  ...msg,
                                  content: result.response || result.message,
                                  loading: false,
                                  hintLevel: result.hintLevel || hintLevel,
                              }
                            : msg
                    )
                )

                const newLevel = result.hintLevel || hintLevel
                setHintLevel(newLevel)

                if (result.maxHintReached && !maxHintReached) {
                    setMaxHintReached(true)
                    apiPost('/api/tutor/hint-limit-reached', {
                        assignmentId,
                        courseId,
                        hintLevel: newLevel,
                    }).catch(() => {})
                }
            }
        } catch (err) {
            setMessages((prev) => prev.filter((msg) => msg.id !== loadingMsg.id))
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

    async function persistMcqAnswers(nextAnswers) {
        if (!assignmentId || !courseId || !isMcqAssignment) return

        const requestId = saveRequestRef.current + 1
        saveRequestRef.current = requestId
        setMcqSaveState('saving')

        try {
            const result = await apiPost('/api/tutor/mcq-response', {
                assignmentId,
                courseId,
                answers: nextAnswers,
            })

            if (saveRequestRef.current !== requestId) return

            setMcqAnswers(result.response?.answers || nextAnswers)
            setMcqSavedAt(result.response?.updatedAt || '')
            setMcqSubmittedAt(result.response?.submittedAt || '')
            setMcqSaveState('saved')
        } catch (err) {
            if (saveRequestRef.current !== requestId) return
            setMcqSaveState('error')
            setError(err.message || 'Failed to save MCQ answers.')
        }
    }

    function handleSelectMcqAnswer(questionId, optionId) {
        if (mcqSubmittedAt) return

        const nextAnswers = {
            ...mcqAnswers,
            [questionId]: optionId,
        }

        setMcqAnswers(nextAnswers)
        setError('')
        persistMcqAnswers(nextAnswers)
    }

    function handleClearMcqAnswers() {
        if (mcqSubmittedAt) return
        setMcqAnswers({})
        setError('')
        persistMcqAnswers({})
    }

    async function handleSubmitMcq() {
        if (!assignmentId || !courseId || !isMcqAssignment || mcqSubmittedAt) return
        if (answeredCount !== mcqQuestions.length) {
            setError('Answer all MCQ questions before submitting.')
            return
        }

        setMcqSaveState('saving')
        setError('')

        try {
            const result = await apiPost('/api/tutor/mcq-response', {
                assignmentId,
                courseId,
                answers: mcqAnswers,
                submit: true,
            })

            setMcqAnswers(result.response?.answers || mcqAnswers)
            setMcqSavedAt(result.response?.updatedAt || '')
            setMcqSubmittedAt(result.response?.submittedAt || '')
            setMcqSaveState('submitted')
        } catch (err) {
            setMcqSaveState('error')
            setError(err.message || 'Failed to submit MCQ answers.')
        }
    }

    function handleAskAiAboutQuestion(question, selectedOption) {
        const prompt = selectedOption
            ? `I am working on question "${question.prompt}". I currently chose option ${selectedOption}. Please help me think through whether that choice makes sense without telling me the final answer.`
            : `I am working on question "${question.prompt}". Please help me compare the options and think through it without telling me the final answer.`

        setInput(prompt)
        textareaRef.current?.focus()
    }

    if (pageLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f0f4f8', color: '#666', fontFamily: "'Segoe UI', sans-serif" }}>
                Loading study session...
            </div>
        )
    }

    const answeredCount = mcqQuestions.filter((question) => mcqAnswers[question.id]).length
    const isMcqSubmitted = Boolean(mcqSubmittedAt)

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
                button:hover { opacity: .92; }
                @media (max-width: 980px) {
                    .study-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                        style={{
                            width: '32px',
                            height: '32px',
                            background: 'white',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#1a5fa8' }}>GR</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>Guardrail LMS</span>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>/ Study Session</span>
                    {assignment && (
                        <span
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                color: 'rgba(255,255,255,0.9)',
                                padding: '2px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
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
                        Back
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

            <div style={{ maxWidth: '1320px', width: '100%', margin: '0 auto', padding: '1.5rem', boxSizing: 'border-box' }}>
                <div
                    className="study-grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: isMcqAssignment ? 'minmax(0, 1.1fr) minmax(360px, 0.9fr)' : '260px minmax(0, 1fr)',
                        gap: '1.5rem',
                        alignItems: 'start',
                    }}
                >
                    {isMcqAssignment ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
                            <div
                                style={{
                                    background: 'white',
                                    borderRadius: '14px',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                                    padding: '18px 20px',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    <div>
                                        <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>
                                            MCQ Practice
                                        </p>
                                        <p style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#1a1a2e' }}>
                                            Answer the questions, then use the AI for hints
                                        </p>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                                            {assignment?.prompt || 'Read each question, select an option, and ask the tutor when you want guided help.'}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '700', color: '#1a5fa8' }}>
                                            {answeredCount}/{mcqQuestions.length} answered
                                        </p>
                                        <p style={{ margin: 0, fontSize: '12px', color: mcqSaveState === 'error' ? '#b91c1c' : '#888' }}>
                                            {isMcqSubmitted
                                                ? `Submitted ${formatSavedTime(mcqSubmittedAt)}`
                                                : mcqSaveState === 'saving'
                                                ? 'Saving answers...'
                                                : mcqSaveState === 'saved' && mcqSavedAt
                                                    ? `Saved ${formatSavedTime(mcqSavedAt)}`
                                                    : mcqSaveState === 'error'
                                                        ? 'Save failed'
                                                        : 'Selections save to your draft workspace'}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
                                    <HintLevelBar current={hintLevel} max={3} />
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={handleClearMcqAnswers}
                                            disabled={isMcqSubmitted}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #fecaca',
                                                background: isMcqSubmitted ? '#f8fafc' : '#fff1f2',
                                                color: isMcqSubmitted ? '#94a3b8' : '#be123c',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: isMcqSubmitted ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            Clear selections
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSubmitMcq}
                                            disabled={isMcqSubmitted || mcqSaveState === 'saving' || answeredCount !== mcqQuestions.length}
                                            style={{
                                                padding: '8px 14px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: isMcqSubmitted ? '#dcfce7' : answeredCount === mcqQuestions.length ? '#15803d' : '#cbd5e1',
                                                color: isMcqSubmitted ? '#166534' : answeredCount === mcqQuestions.length ? 'white' : '#64748b',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                cursor: isMcqSubmitted || answeredCount !== mcqQuestions.length ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            {isMcqSubmitted ? 'Submitted' : mcqSaveState === 'saving' ? 'Submitting...' : 'Submit answers'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {mcqQuestions.length === 0 ? (
                                <div
                                    style={{
                                        background: 'white',
                                        borderRadius: '14px',
                                        padding: '24px',
                                        color: '#94a3b8',
                                        textAlign: 'center',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                                    }}
                                >
                                    No MCQ questions are configured for this assignment yet.
                                </div>
                            ) : (
                                mcqQuestions.map((question, index) => (
                                    <McqQuestionCard
                                key={question.id}
                                index={index}
                                        question={question}
                                        selectedOption={mcqAnswers[question.id]}
                                        onSelect={handleSelectMcqAnswer}
                                        onAskAi={handleAskAiAboutQuestion}
                                        disabled={isMcqSubmitted}
                                    />
                                ))
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                                                padding: '10px',
                                                borderRadius: '8px',
                                                marginBottom: '6px',
                                                background: active ? cfg.bg : 'transparent',
                                                border: `1.5px solid ${active ? cfg.border : 'transparent'}`,
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
                                                    color: 'white',
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {past ? 'OK' : lvl}
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '12px', fontWeight: active ? '700' : '500', color: active ? cfg.color : past ? '#15803d' : '#888' }}>
                                                    {cfg.label}
                                                </p>
                                                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#94a3b8', lineHeight: 1.4 }}>
                                                    {cfg.description}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                                <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    How it works
                                </p>
                                {[
                                    'Type your question or show your thinking',
                                    'Hints guide you and do not give direct answers',
                                    'Hint level advances as you engage more',
                                    'After L3, continue on your own or consult your teacher',
                                ].map((tip, index) => (
                                    <div key={tip} style={{ display: 'flex', gap: '8px', marginBottom: '7px', alignItems: 'flex-start' }}>
                                        <span style={{ color: '#1a5fa8', fontWeight: '700', fontSize: '12px', flexShrink: 0 }}>{index + 1}.</span>
                                        <span style={{ fontSize: '12px', color: '#666', lineHeight: 1.45 }}>{tip}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
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
                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#888' }}>
                                    Ask for hints, elimination strategies, or reasoning help without asking for the final answer
                                </p>
                            </div>
                            <HintLevelBar current={hintLevel} max={3} />
                        </div>

                        <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                            <p style={{ margin: 0, fontSize: '11px', color: '#92400e', lineHeight: 1.4 }}>
                                Your hint interactions are logged and visible to your teacher.
                            </p>
                        </div>

                        <div
                            style={{
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                                padding: '20px',
                                minHeight: '360px',
                                maxHeight: isMcqAssignment ? '620px' : '480px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {messages.length === 0 && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', textAlign: 'center', gap: '10px' }}>
                                    <div style={{ fontSize: '36px' }}>Tutor chat</div>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#94a3b8' }}>
                                        {isMcqAssignment ? 'Select an answer, then ask the tutor about your reasoning.' : 'Start by describing what you are working on.'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>
                                        Show your thinking and ask for guidance instead of direct answers.
                                    </p>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <ChatBubble key={msg.id} msg={msg} />
                            ))}

                            {maxHintReached && <MaxHintMessage onContact={() => window.open('mailto:teacher@school.edu')} />}

                            <div ref={messagesEndRef} />
                        </div>

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
                                            ? 'Maximum hint level reached. Continue on your own or consult your teacher.'
                                            : isMcqAssignment
                                                ? 'Ask about a question, an option you selected, or why another option seems weaker...'
                                                : 'Describe what you are working on or where you are stuck...'
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
                                    }}
                                />
                                <p style={{ margin: '4px 0 0 2px', fontSize: '11px', color: '#94a3b8' }}>
                                    Press Enter to send, Shift+Enter for a new line.
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
                                    flexShrink: 0,
                                    minWidth: '80px',
                                }}
                            >
                                {loading ? '...' : 'Ask'}
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
        </div>
    )
}

export default StudySession

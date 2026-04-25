import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Consent from './Consent'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// --------------------------- UI helpers ---------------------------
const statusColors = {
    pending: { bg: '#fff8f0', color: '#c0560a', border: '#fed7aa' },
    dismissed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    escalated: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    notified: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
}

const hintLevelColors = {
    L1: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'L1 Nudge' },
    L2: { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff', label: 'L2 Scaffold' },
    L3: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'L3 Guided' },
}

function WpmTrendChart({ sessions }) {
    if (!sessions.length) {
        return (
            <div style={{ padding: '1rem', fontSize: '13px', color: '#999' }}>
                No typing sessions yet.
            </div>
        )
    }

    const W = 340
    const H = 80
    const PAD = { t: 8, r: 16, b: 24, l: 32 }

    const maxWpm = Math.max(...sessions.map((s) => s.wpm)) + 5
    const minWpm = Math.max(0, Math.min(...sessions.map((s) => s.wpm)) - 5)
    const xStep = sessions.length > 1 ? (W - PAD.l - PAD.r) / (sessions.length - 1) : 0

    const yScale = (wpm) =>
        PAD.t + (1 - (wpm - minWpm) / Math.max(1, maxWpm - minWpm)) * (H - PAD.t - PAD.b)

    const pts = sessions.map((s, i) => ({ x: PAD.l + i * xStep, y: yScale(s.wpm), ...s }))
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    const areaPath = `${linePath} L${pts[pts.length - 1].x},${H - PAD.b} L${pts[0].x},${H - PAD.b} Z`

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
            <defs>
                <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a5fa8" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#1a5fa8" stopOpacity="0" />
                </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((t, i) => {
                const y = PAD.t + t * (H - PAD.t - PAD.b)
                const val = Math.round(maxWpm - t * (maxWpm - minWpm))
                return (
                    <g key={i}>
                        <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#f0f0f0" strokeWidth="1" />
                        <text x={PAD.l - 4} y={y + 4} fontSize="9" fill="#bbb" textAnchor="end">
                            {val}
                        </text>
                    </g>
                )
            })}

            <path d={areaPath} fill="url(#wpmGrad)" />
            <path d={linePath} fill="none" stroke="#1a5fa8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {pts.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#1a5fa8" strokeWidth="2" />
                    <text x={p.x} y={H - 6} fontSize="9" fill="#aaa" textAnchor="middle">
                        {p.date}
                    </text>
                </g>
            ))}
        </svg>
    )
}

function CalibrationBadge({ baseline }) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                background: baseline.isCalibrated ? '#f0fdf4' : '#fffbeb',
                color: baseline.isCalibrated ? '#15803d' : '#92400e',
                border: `1px solid ${baseline.isCalibrated ? '#bbf7d0' : '#fde68a'}`,
            }}
        >
            {baseline.isCalibrated ? '✓ Calibrated' : `Calibrating ${baseline.sessionCount}/3`}
        </span>
    )
}

function AssignmentRow({ assignment, onOpen }) {
    const isSubmitted = assignment.status === 'submitted'
    const isPast = assignment.due ? new Date(assignment.due) < new Date() : false
    const dueLabel = assignment.due
        ? `Due ${new Date(assignment.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'No due date'

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: '1px solid #f5f5f5',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: isSubmitted ? '#15803d' : isPast ? '#dc2626' : '#f59e0b',
                    }}
                />
                <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#1a1a2e' }}>{assignment.title}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: isPast && !isSubmitted ? '#dc2626' : '#888' }}>{dueLabel}</p>
                </div>
            </div>

            <button
                onClick={() => !isSubmitted && onOpen(assignment)}
                style={{
                    padding: '5px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: isSubmitted ? 'default' : 'pointer',
                    border: 'none',
                    background: isSubmitted ? '#f0fdf4' : '#1a5fa8',
                    color: isSubmitted ? '#15803d' : 'white',
                }}
            >
                {isSubmitted ? '✓ Submitted' : 'Open'}
            </button>
        </div>
    )
}

function CourseCard({ course, onOpenAssignment }) {
    const [expanded, setExpanded] = useState(true)
    const submitted = course.assignments.filter((a) => a.status === 'submitted').length

    return (
        <div
            style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                overflow: 'hidden',
                marginBottom: '1rem',
            }}
        >
            <div
                onClick={() => setExpanded((e) => !e)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    cursor: 'pointer',
                    borderBottom: expanded ? '1px solid #f0f0f0' : 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: '#e8f0fb',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '700',
                            color: '#1a5fa8',
                        }}
                    >
                        {course.code}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: '#1a1a2e' }}>{course.title}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                            {course.teacher || 'Teacher'} · {submitted}/{course.assignments.length} submitted
                        </p>
                    </div>
                </div>
                <span style={{ color: '#aaa', fontSize: '16px' }}>{expanded ? '▾' : '▸'}</span>
            </div>

            {expanded &&
                (course.assignments.length ? (
                    course.assignments.map((a) => <AssignmentRow key={a.id} assignment={a} onOpen={onOpenAssignment} />)
                ) : (
                    <p style={{ padding: '1rem 1.25rem', margin: 0, color: '#999', fontSize: '13px' }}>No assignments yet.</p>
                ))}
        </div>
    )
}

function DeleteDataModal({ onClose }) {
    const [sent, setSent] = useState(false)

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
            }}
        >
            <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '420px', margin: '1rem' }}>
                {sent ? (
                    <>
                        <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: '16px', color: '#15803d' }}>✓ Request submitted</p>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: '#555' }}>
                            Your telemetry deletion request has been logged. Consent records are retained per policy.
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#1a5fa8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            Close
                        </button>
                    </>
                ) : (
                    <>
                        <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: '16px', color: '#1a1a2e' }}>Request Data Deletion</p>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
                            This requests deletion of raw telemetry/session metrics after course completion. Consent records are retained as legal records.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setSent(true)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                }}
                            >
                                Submit Request
                            </button>
                            <button
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: 'white',
                                    color: '#666',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// --------------------------- API helpers ---------------------------
async function apiGet(path) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.message || `Request failed: ${res.status}`)
    }
    return data
}

// --------------------------- Main component ---------------------------
function Dashboard() {
    const navigate = useNavigate()
    const user = JSON.parse(localStorage.getItem('user') || 'null')

    const [showConsent, setShowConsent] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedAssignment, setSelectedAssignment] = useState(null)

    const [courses, setCourses] = useState([])
    const [wpmSessions, setWpmSessions] = useState([])
    const [hintHistory, setHintHistory] = useState([])
    const [ownFlags, setOwnFlags] = useState([])
    const [baseline, setBaseline] = useState({ sessionCount: 0, isCalibrated: false })

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let mounted = true

        const loadDashboard = async () => {
            try {
                setLoading(true)
                setError('')

                // 1) courses
                const coursesRes = await apiGet('/api/courses')
                const baseCourses = (coursesRes.courses || []).map((c) => ({
                    ...c,
                    teacher: c.teacherName || c.teacher || '',
                    assignments: [],
                }))

                // 2) assignments by course (supported by your backend)
                const assignmentsPerCourse = await Promise.all(
                    baseCourses.map(async (course) => {
                        try {
                            const asgRes = await apiGet(`/api/courses/${course.id}/assignments`)
                            const assignments = (asgRes.assignments || []).map((a) => ({
                                id: a.id,
                                title: a.title,
                                due: a.dueAt || a.due || null,
                                status: a.submittedAt ? 'submitted' : 'open',
                            }))
                            return { courseId: course.id, assignments }
                        } catch {
                            return { courseId: course.id, assignments: [] }
                        }
                    })
                )

                const assignmentMap = new Map(assignmentsPerCourse.map((x) => [x.courseId, x.assignments]))
                const mergedCourses = baseCourses.map((c) => ({
                    ...c,
                    assignments: assignmentMap.get(c.id) || [],
                }))

                // 3) optional endpoints (safe fallback if not implemented yet)
                let safeWpm = []
                let safeHints = []
                let safeFlags = []

                try {
                    const sessionRes = await apiGet('/api/telemetry/sessions?mine=true')
                    // adapt if API shape differs
                    safeWpm = (sessionRes.sessions || []).map((s, idx) => ({
                        session: idx + 1,
                        wpm: Number(s.wpm || s.wordsPerMinute || 0),
                        date: s.createdAt
                            ? new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            : `S${idx + 1}`,
                    }))
                } catch {
                    safeWpm = []
                }

                // You can wire these once backend endpoints are ready:
                // safeHints = await apiGet('/api/hints/me')
                // safeFlags = await apiGet('/api/flags/me')
                safeHints = []
                safeFlags = []

                if (!mounted) return

                setCourses(mergedCourses)
                setWpmSessions(safeWpm)
                setHintHistory(safeHints)
                setOwnFlags(safeFlags)
                setBaseline({
                    sessionCount: safeWpm.length,
                    isCalibrated: safeWpm.length >= 3,
                })
            } catch (e) {
                if (!mounted) return
                setError(e.message || 'Failed to load dashboard')
            } finally {
                if (mounted) setLoading(false)
            }
        }

        loadDashboard()
        return () => {
            mounted = false
        }
    }, [])

    const allAssignments = useMemo(() => courses.flatMap((c) => c.assignments || []), [courses])
    const activeFlags = useMemo(
        () => ownFlags.filter((f) => f.status === 'pending' || f.status === 'notified'),
        [ownFlags]
    )

    const currentWpm = wpmSessions.length ? wpmSessions[wpmSessions.length - 1].wpm : 0
    const firstWpm = wpmSessions.length ? wpmSessions[0].wpm : 0
    const wpmDelta = currentWpm - firstWpm

    const handleOpenAssignment = (assignment) => {
        setSelectedAssignment(assignment)
        if (!localStorage.getItem('consentAccepted')) {
            setShowConsent(true)
        } else {
            navigate(`/editor?assignmentId=${assignment.id}`)
        }
    }

    const handleConsentAccepted = () => {
        localStorage.setItem('consentAccepted', 'true')
        setShowConsent(false)
        if (selectedAssignment?.id) navigate(`/editor?assignmentId=${selectedAssignment.id}`)
    }

    const handleConsentDeclined = () => {
        setShowConsent(false)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f0f4f8', color: '#666' }}>
                Loading dashboard...
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Segoe UI', sans-serif" }}>
            {showConsent && <Consent onAccepted={handleConsentAccepted} onDeclined={handleConsentDeclined} />}
            {showDeleteModal && <DeleteDataModal onClose={() => setShowDeleteModal(false)} />}

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
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginLeft: '4px' }}>/ Student</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CalibrationBadge baseline={baseline} />
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>{user?.displayName || 'Student'}</span>
                    <button
                        onClick={() => {
                            localStorage.clear()
                            navigate('/login')
                        }}
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

            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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

                {activeFlags.length > 0 && (
                    <div
                        style={{
                            background: '#fff8f0',
                            border: '1px solid #fed7aa',
                            borderRadius: '10px',
                            padding: '14px 18px',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>⚠️</span>
                            <div>
                                <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: '#c0560a' }}>
                                    {activeFlags.length} flag(s) under review
                                </p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#d97706' }}>
                                    Your teacher is reviewing your submission activity.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/appeal')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                background: '#c0560a',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '500',
                            }}
                        >
                            View / Appeal
                        </button>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'Courses', value: courses.length },
                        { label: 'Assignments', value: allAssignments.length },
                        { label: 'Submitted', value: allAssignments.filter((a) => a.status === 'submitted').length },
                        { label: 'Sessions', value: baseline.sessionCount },
                    ].map((s) => (
                        <div
                            key={s.label}
                            style={{
                                flex: 1,
                                background: 'white',
                                borderRadius: '10px',
                                padding: '14px 16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                        >
                            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {s.label}
                            </p>
                            <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a5fa8' }}>{s.value}</p>
                        </div>
                    ))}
                </div>

                <p
                    style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        margin: '0 0 12px',
                    }}
                >
                    My Courses
                </p>

                {courses.length ? (
                    courses.map((course) => <CourseCard key={course.id} course={course} onOpenAssignment={handleOpenAssignment} />)
                ) : (
                    <div style={{ background: 'white', borderRadius: '10px', padding: '1rem', color: '#999', fontSize: '14px' }}>
                        No enrolled courses yet.
                    </div>
                )}

                <p
                    style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        margin: '1.5rem 0 12px',
                    }}
                >
                    My Typing Activity
                </p>

                <div
                    style={{
                        background: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                        padding: '18px 20px',
                        marginBottom: '1rem',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                            <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>
                                Words Per Minute - Trend
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                                Across {wpmSessions.length} sessions - Current: <strong style={{ color: '#1a5fa8' }}>{currentWpm} WPM</strong>
                                <span style={{ marginLeft: '6px', color: wpmDelta >= 0 ? '#15803d' : '#dc2626', fontWeight: '600' }}>
                                    {wpmDelta >= 0 ? '▲' : '▼'} {Math.abs(wpmDelta)} from first session
                                </span>
                            </p>
                        </div>
                        <CalibrationBadge baseline={baseline} />
                    </div>

                    <WpmTrendChart sessions={wpmSessions} />

                    <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#bbb' }}>
                        Typing-speed trend helps build your personal baseline.
                    </p>
                </div>

                <p
                    style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        margin: '1.5rem 0 12px',
                    }}
                >
                    Hint Usage History
                </p>

                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '1rem' }}>
                    {hintHistory.length === 0 ? (
                        <p style={{ padding: '1.5rem', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No hint requests yet.</p>
                    ) : (
                        <>
                            {hintHistory.map((h, i) => {
                                const lc = hintLevelColors[h.hintLevel] || hintLevelColors.L1
                                return (
                                    <div
                                        key={h.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 20px',
                                            borderBottom: i < hintHistory.length - 1 ? '1px solid #f5f5f5' : 'none',
                                        }}
                                    >
                                        <div>
                                            <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '500', color: '#1a1a2e' }}>{h.assignmentTitle}</p>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                                                {h.courseCode} · {new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <span
                                            style={{
                                                padding: '3px 10px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: lc.bg,
                                                color: lc.color,
                                                border: `1px solid ${lc.border}`,
                                            }}
                                        >
                                            {lc.label}
                                        </span>
                                    </div>
                                )
                            })}
                            <div style={{ padding: '10px 20px', background: '#f8f9fc', borderTop: '1px solid #f0f0f0' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#aaa' }}>Hint usage is visible to your teacher as part of study logs.</p>
                            </div>
                        </>
                    )}
                </div>

                <p
                    style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        margin: '1.5rem 0 12px',
                    }}
                >
                    My Flags
                </p>

                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '1rem' }}>
                    {ownFlags.length === 0 ? (
                        <p style={{ padding: '1.5rem', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No flags on your account.</p>
                    ) : (
                        ownFlags.map((flag, i) => {
                            const sc = statusColors[flag.status] || statusColors.pending
                            return (
                                <div
                                    key={flag.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px 20px',
                                        borderBottom: i < ownFlags.length - 1 ? '1px solid #f5f5f5' : 'none',
                                    }}
                                >
                                    <div>
                                        <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '500', color: '#1a1a2e' }}>{flag.assignmentTitle}</p>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                                            {flag.courseCode} · {new Date(flag.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>{flag.confidence}% confidence</span>
                                        <span
                                            style={{
                                                padding: '3px 10px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: sc.bg,
                                                color: sc.color,
                                                border: `1px solid ${sc.border}`,
                                            }}
                                        >
                                            {flag.status.charAt(0).toUpperCase() + flag.status.slice(1)}
                                        </span>
                                        {flag.status === 'notified' && (
                                            <button
                                                onClick={() => navigate('/appeal')}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    background: '#1a5fa8',
                                                    color: 'white',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Appeal
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div
                    style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '500', color: '#1a1a2e' }}>Your data & privacy</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                            Guardrail collects keystroke timing only, never typed content.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        style={{
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            background: 'white',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            marginLeft: '1rem',
                        }}
                    >
                        Request deletion
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
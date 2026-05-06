import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Consent from './Consent'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const statusColors = {
    pending: { bg: '#fff8f0', color: '#c0560a', border: '#fed7aa' },
    dismissed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    escalated: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

const hintLevelColors = {
    L1: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'L1 Nudge' },
    L2: { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff', label: 'L2 Scaffold' },
    L3: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'L3 Guided' },
}

function formatDeviceType(deviceType) {
    if (!deviceType) return 'Unknown device'
    return deviceType.charAt(0).toUpperCase() + deviceType.slice(1)
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
    const H = 110
    const PAD = { t: 10, r: 16, b: 24, l: 32 }

    const maxWpm = Math.max(...sessions.map((s) => s.wpm)) + 5
    const minWpm = Math.max(0, Math.min(...sessions.map((s) => s.wpm)) - 5)
    const xStep = sessions.length > 1 ? (W - PAD.l - PAD.r) / (sessions.length - 1) : 0

    const yScale = (wpm) =>
        PAD.t + (1 - (wpm - minWpm) / Math.max(1, maxWpm - minWpm)) * (H - PAD.t - PAD.b)

    const points = sessions.map((session, index) => ({
        x: PAD.l + index * xStep,
        y: yScale(session.wpm),
        ...session,
    }))

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    const areaPath = `${linePath} L${points[points.length - 1].x},${H - PAD.b} L${points[0].x},${H - PAD.b} Z`

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
            <defs>
                <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a5fa8" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#1a5fa8" stopOpacity="0" />
                </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((tick, index) => {
                const y = PAD.t + tick * (H - PAD.t - PAD.b)
                const value = Math.round(maxWpm - tick * (maxWpm - minWpm))
                return (
                    <g key={index}>
                        <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#f0f0f0" strokeWidth="1" />
                        <text x={PAD.l - 4} y={y + 4} fontSize="9" fill="#bbb" textAnchor="end">
                            {value}
                        </text>
                    </g>
                )
            })}

            <path d={areaPath} fill="url(#wpmGrad)" />
            <path d={linePath} fill="none" stroke="#1a5fa8" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

            {points.map((point, index) => {
                const step = sessions.length > 20 ? 5 : sessions.length > 10 ? 3 : 1
                const showLabel = index % step === 0 || index === points.length - 1
                return (
                    <g key={index}>
                        <circle cx={point.x} cy={point.y} r="2" fill="white" stroke="#1a5fa8" strokeWidth="1.5" />
                        {showLabel && (
                            <text x={point.x} y={H - 6} fontSize="9" fill="#aaa" textAnchor="middle">
                                {point.date}
                            </text>
                        )}
                    </g>
                )
            })}
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
            {baseline.isCalibrated
                ? `${formatDeviceType(baseline.deviceType)} calibrated`
                : `${formatDeviceType(baseline.deviceType)} ${baseline.sessionCount}/3`}
        </span>
    )
}

function AssignmentRow({ assignment, onOpen }) {
    const isEssayAssignment = assignment.assignmentType !== 'qa'
    const isSubmitted = isEssayAssignment && assignment.status === 'submitted'
    const isPast = assignment.due ? new Date(assignment.due) < new Date() : false
    const dueLabel = assignment.due
        ? `Due ${new Date(assignment.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'No due date'
    const assignmentTypeLabel = isEssayAssignment ? 'Essay assignment' : 'Q&A tutor assignment'

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
                    <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{assignmentTypeLabel}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: isPast && !isSubmitted ? '#dc2626' : '#888' }}>{dueLabel}</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                    onClick={() => (!isSubmitted || !isEssayAssignment) && onOpen(assignment)}
                    style={{
                        padding: '5px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: isSubmitted && isEssayAssignment ? 'default' : 'pointer',
                        border: 'none',
                        background: isSubmitted ? '#f0fdf4' : isEssayAssignment ? '#1a5fa8' : '#d97706',
                        color: isSubmitted ? '#15803d' : 'white',
                    }}
                >
                    {isSubmitted ? 'Submitted' : isEssayAssignment ? 'Open Essay' : 'Open Tutor'}
                </button>
            </div>
        </div>
    )
}

function CourseCard({ course, onOpenAssignment }) {
    const [expanded, setExpanded] = useState(true)
    const essayAssignments = course.assignments.filter((a) => a.assignmentType !== 'qa')
    const submitted = essayAssignments.filter((a) => a.status === 'submitted').length
    const subtitle = essayAssignments.length
        ? `${submitted}/${essayAssignments.length} essays submitted`
        : 'Q&A tutor assignments only'

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
                onClick={() => setExpanded((v) => !v)}
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
                            {course.teacher || 'Teacher'} · {subtitle}
                        </p>
                        {course.baselines?.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {course.baselines.map((baseline) => (
                                    <CalibrationBadge key={baseline.id} baseline={baseline} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <span style={{ color: '#aaa', fontSize: '16px' }}>{expanded ? '▼' : '▶'}</span>
            </div>

            {expanded &&
                (course.assignments.length ? (
                    course.assignments.map((assignment) => (
                        <AssignmentRow key={assignment.id} assignment={assignment} onOpen={onOpenAssignment} />
                    ))
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
                        <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: '16px', color: '#15803d' }}>Request submitted</p>
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

async function apiGet(path) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`)
    return data
}

function Dashboard() {
    const navigate = useNavigate()
    const location = useLocation()
    const user = JSON.parse(localStorage.getItem('user') || 'null')

    const [showConsent, setShowConsent] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedAssignment, setSelectedAssignment] = useState(null)
    const [courses, setCourses] = useState([])
    const [wpmSessions, setWpmSessions] = useState([])
    const [hintHistory, setHintHistory] = useState([])
    const [ownFlags, setOwnFlags] = useState([])
    const [totalSessions, setTotalSessions] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const pendingAssignmentId = useRef(null)

    useEffect(() => {
        let mounted = true

        async function loadDashboard() {
            try {
                setLoading(true)
                setError('')

                const [coursesRes, sessionsRes, baselinesRes, flagsRes] = await Promise.all([
                    apiGet('/api/courses'),
                    apiGet('/api/telemetry/sessions?mine=true').catch(() => ({ sessions: [] })),
                    apiGet('/api/telemetry/baselines?mine=true').catch(() => ({ baselines: [] })),
                    apiGet('/api/flags/me').catch(() => ({ flags: [] })),
                ])

                const baseCourses = (coursesRes.courses || []).map((course) => ({
                    ...course,
                    teacher: course.teacherName || course.teacher || '',
                    assignments: [],
                    baselines: [],
                }))

                const assignmentsPerCourse = await Promise.all(
                    baseCourses.map(async (course) => {
                        try {
                            const assignmentRes = await apiGet(`/api/courses/${course.id}/assignments`)
                            const assignments = (assignmentRes.assignments || []).map((assignment) => ({
                                id: assignment.id,
                                courseId: course.id,
                                assignmentType: assignment.assignmentType || 'essay',
                                title: assignment.title,
                                due: assignment.dueAt || assignment.due || null,
                                status: (assignment.assignmentType || 'essay') === 'essay' && assignment.submittedAt ? 'submitted' : 'open',
                            }))
                            return { courseId: course.id, assignments }
                        } catch {
                            return { courseId: course.id, assignments: [] }
                        }
                    })
                )

                const sessions = sessionsRes.sessions || []
                const baselines = baselinesRes.baselines || []
                const flags = (flagsRes.flags || []).map((flag) => ({
                    ...flag,
                    confidence: flag.confidencePct ?? flag.confidence,
                    createdAt: flag.flaggedAt || flag.createdAt,
                }))

                const assignmentsByCourse = new Map(assignmentsPerCourse.map((item) => [item.courseId, item.assignments]))
                const baselinesByCourse = new Map()

                baselines.forEach((baseline) => {
                    const entries = baselinesByCourse.get(baseline.courseId) || []
                    entries.push(baseline)
                    baselinesByCourse.set(baseline.courseId, entries)
                })

                const mergedCourses = baseCourses.map((course) => ({
                    ...course,
                    assignments: assignmentsByCourse.get(course.id) || [],
                    baselines: baselinesByCourse.get(course.id) || [],
                }))

                const safeWpm = sessions
                    .filter((session) => Number.isFinite(Number(session.wpm)))
                    .map((session, index) => ({
                        session: index + 1,
                        wpm: Number(session.wpm),
                        date: session.createdAt
                            ? new Date(session.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            : `S${index + 1}`,
                    }))

                if (!mounted) return

                setCourses(mergedCourses)
                setWpmSessions(safeWpm)
                setHintHistory([])
                setOwnFlags(flags)
                setTotalSessions(
                    sessions.filter((s) => s.status === 'completed' || s.status === 'submitted').length
                )
            } catch (loadError) {
                if (!mounted) return
                setError(loadError.message || 'Failed to load dashboard')
            } finally {
                if (mounted) setLoading(false)
            }
        }

        loadDashboard()
        return () => { mounted = false }
    }, [location.key])

    const allAssignments = useMemo(() => courses.flatMap((course) => course.assignments || []), [courses])
    const activeFlags = useMemo(() => ownFlags.filter((flag) => flag.status !== 'dismissed'), [ownFlags])
    const currentWpm = wpmSessions.length ? wpmSessions[wpmSessions.length - 1].wpm : 0
    const firstWpm = wpmSessions.length ? wpmSessions[0].wpm : 0
    const wpmDelta = currentWpm - firstWpm

    const handleOpenAssignment = (assignment) => {
        setSelectedAssignment(assignment)
        if (assignment.assignmentType === 'qa') {
            navigate(`/study?assignmentId=${assignment.id}&courseId=${assignment.courseId || ''}`)
            return
        }

        if (!localStorage.getItem('consentAccepted')) {
            pendingAssignmentId.current = assignment.id
            setShowConsent(true)
        } else {
            navigate(`/editor?assignmentId=${assignment.id}`)
        }
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
        navigate(`/editor?assignmentId=${pendingAssignmentId.current}`)
    }

    const handleConsentDeclined = () => {
        setShowConsent(false)
        pendingAssignmentId.current = null
        navigate('/dashboard')
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
                            <span>!</span>
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
                        { label: 'Sessions', value: totalSessions },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            style={{
                                flex: 1,
                                background: 'white',
                                borderRadius: '10px',
                                padding: '14px 16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                        >
                            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {stat.label}
                            </p>
                            <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a5fa8' }}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                <p style={{ fontSize: '13px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 12px' }}>
                    My Courses
                </p>

                {courses.length ? (
                    courses.map((course) => (
                        <CourseCard key={course.id} course={course} onOpenAssignment={handleOpenAssignment} />
                    ))
                ) : (
                    <div style={{ background: 'white', borderRadius: '10px', padding: '1rem', color: '#999', fontSize: '14px' }}>
                        No enrolled courses yet.
                    </div>
                )}

                <p style={{ fontSize: '13px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '1.5rem 0 12px' }}>
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
                                Across {wpmSessions.length} sessions - Current:{' '}
                                <strong style={{ color: '#1a5fa8' }}>{currentWpm} WPM</strong>
                                <span style={{ marginLeft: '6px', color: wpmDelta >= 0 ? '#15803d' : '#dc2626', fontWeight: '600' }}>
                                    {wpmDelta >= 0 ? '▲' : '▼'} {Math.abs(wpmDelta)} from first session
                                </span>
                            </p>
                        </div>
                    </div>

                    <WpmTrendChart sessions={wpmSessions} />

                    <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#bbb' }}>
                        Calibration status now appears on each course card by device.
                    </p>
                </div>

                <p style={{ fontSize: '13px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '1.5rem 0 12px' }}>
                    Hint Usage History
                </p>

                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '1rem' }}>
                    {hintHistory.length === 0 ? (
                        <p style={{ padding: '1.5rem', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No hint requests yet.</p>
                    ) : (
                        <>
                            {hintHistory.map((hint, index) => {
                                const hintColor = hintLevelColors[hint.hintLevel] || hintLevelColors.L1
                                return (
                                    <div
                                        key={hint.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 20px',
                                            borderBottom: index < hintHistory.length - 1 ? '1px solid #f5f5f5' : 'none',
                                        }}
                                    >
                                        <div>
                                            <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '500', color: '#1a1a2e' }}>{hint.assignmentTitle}</p>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                                                {hint.courseCode} · {new Date(hint.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <span
                                            style={{
                                                padding: '3px 10px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: hintColor.bg,
                                                color: hintColor.color,
                                                border: `1px solid ${hintColor.border}`,
                                            }}
                                        >
                                            {hintColor.label}
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

                <p style={{ fontSize: '13px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '1.5rem 0 12px' }}>
                    My Flags
                </p>

                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: '1rem' }}>
                    {ownFlags.length === 0 ? (
                        <p style={{ padding: '1.5rem', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No flags on your account.</p>
                    ) : (
                        ownFlags.map((flag, index) => {
                            const statusColor = statusColors[flag.status] || statusColors.pending
                            return (
                                <div
                                    key={flag.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px 20px',
                                        borderBottom: index < ownFlags.length - 1 ? '1px solid #f5f5f5' : 'none',
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
                                                background: statusColor.bg,
                                                color: statusColor.color,
                                                border: `1px solid ${statusColor.border}`,
                                            }}
                                        >
                                            {flag.status.charAt(0).toUpperCase() + flag.status.slice(1)}
                                        </span>
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

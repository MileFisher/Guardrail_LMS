import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

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
        throw new Error(data.message || `GET ${path} failed`)
    }
    return data
}

async function apiPatch(path, body) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.message || `PATCH ${path} failed`)
    }
    return data
}

function formatZValue(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return 'N/A'
    }

    return Number(value).toFixed(2)
}

function StdDetails() {
    const { studentId } = useParams()
    const [searchParams] = useSearchParams()
    const courseId = searchParams.get('courseId')
    const navigate = useNavigate()

    const [student, setStudent] = useState(null)
    const [course, setCourse] = useState(null)
    const [flags, setFlags] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [actionMessage, setActionMessage] = useState('')

    useEffect(() => {
        let mounted = true

        async function loadFlags() {
            if (!courseId) {
                setError('Missing courseId in the student detail URL.')
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError('')
                const response = await apiGet(`/api/flags/student/${studentId}?courseId=${courseId}`)

                if (!mounted) {
                    return
                }

                setStudent(response.student)
                setCourse(response.course)
                setFlags(
                    (response.flags || []).map((flag) => ({
                        ...flag,
                        confidence: flag.confidencePct ?? flag.confidence,
                        createdAt: flag.flaggedAt || flag.createdAt,
                    }))
                )
            } catch (loadError) {
                if (mounted) {
                    setError(loadError.message || 'Failed to load student flags')
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        loadFlags()
        return () => {
            mounted = false
        }
    }, [courseId, studentId])

    const [actionLoading, setActionLoading] = useState(null)

    const handleFlagAction = async (flagId, action) => {
        setActionLoading(flagId + action)
        try {
            await apiPatch(`/api/flags/${flagId}`, { status: action })
            setFlags((previous) =>
                previous.map((flag) => (flag.id === flagId ? { ...flag, status: action } : flag))
            )
            setActionMessage(`Flag ${action} successfully.`)
            window.setTimeout(() => setActionMessage(""), 3000)
        } catch (err) {
            setActionMessage(`Error: ${err.message}`)
            window.setTimeout(() => setActionMessage(""), 4000)
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f6f9', color: '#666' }}>
                Loading student detail...
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f6f9', color: '#b91c1c' }}>
                {error}
            </div>
        )
    }

    if (!student) {
        return <p style={{ padding: '2rem' }}>Student not found.</p>
    }

    const statusColor = { pending: '#e67e22', dismissed: '#27ae60', escalated: '#e74c3c' }
    const statusBg = { pending: '#fff8f0', dismissed: '#f0fdf4', escalated: '#fef2f2' }

    return (
        <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: 'sans-serif' }}>
            <div
                style={{
                    background: '#1a5fa8',
                    padding: '0 2rem',
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1a5fa8' }}>GR</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '500', fontSize: '15px' }}>Guardrail LMS</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginLeft: '4px' }}>/ Student Detail</span>
                </div>
                <button
                    onClick={() => navigate('/teacher/dashboard')}
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
                    Back to Dashboard
                </button>
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
                <div
                    style={{
                        background: 'white',
                        borderRadius: '10px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                    }}
                >
                    <div
                        style={{
                            width: '52px',
                            height: '52px',
                            background: '#e8f0fb',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#1a5fa8',
                            flexShrink: 0,
                        }}
                    >
                        {student.displayName.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: '600', fontSize: '16px', color: '#1a1a2e' }}>{student.displayName}</p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>{student.email}</p>
                        {course && (
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#888' }}>
                                {course.code} · {course.title}
                            </p>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#888' }}>Sessions completed</p>
                        <p style={{ margin: '0 0 4px', fontWeight: '600', fontSize: '15px', color: '#1a1a2e' }}>{student.sessionCount}</p>
                        <span
                            style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                padding: '3px 10px',
                                borderRadius: '20px',
                                background: student.isCalibrated ? '#f0fdf4' : '#fff8f0',
                                color: student.isCalibrated ? '#27ae60' : '#e67e22',
                                border: `1px solid ${student.isCalibrated ? '#bbf7d0' : '#fed7aa'}`,
                            }}
                        >
                            {student.isCalibrated ? 'Calibrated' : `${student.sessionCount}/3 sessions`}
                        </span>
                    </div>
                </div>

                {actionMessage && (
                    <div
                        style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            marginBottom: '1rem',
                            color: '#27ae60',
                            fontSize: '14px',
                        }}
                    >
                        {actionMessage}
                    </div>
                )}

                <p style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a2e', margin: '0 0 1rem' }}>Flags</p>

                {flags.length === 0 && (
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '10px',
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#888',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        }}
                    >
                        No flags for this student.
                    </div>
                )}

                {flags.map((flag) => (
                    <div
                        key={flag.id}
                        style={{
                            background: 'white',
                            borderRadius: '10px',
                            marginBottom: '1rem',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid #f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div>
                                <p style={{ margin: '0 0 2px', fontWeight: '600', fontSize: '14px', color: '#1a1a2e' }}>
                                    {flag.assignmentTitle}
                                </p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                                    Flagged: {new Date(flag.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#e74c3c' }}>{flag.confidence}% confidence</span>
                                <span
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        padding: '3px 10px',
                                        borderRadius: '20px',
                                        background: statusBg[flag.status] || '#f5f5f5',
                                        color: statusColor[flag.status] || '#888',
                                        border: `1px solid ${(statusColor[flag.status] || '#888')}33`,
                                    }}
                                >
                                    {flag.status.charAt(0).toUpperCase() + flag.status.slice(1)}
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1.5rem' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Z-Score Breakdown
                                </p>
                                {[
                                    { label: 'WPM', value: flag.zScores?.wpm, weight: '40%' },
                                    { label: 'Paste', value: flag.zScores?.paste, weight: '35%' },
                                    { label: 'Revision', value: flag.zScores?.revision, weight: '25%' },
                                    { label: 'Composite', value: flag.zScores?.composite, weight: '' },
                                ].map((score) => (
                                    <div
                                        key={score.label}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '5px 0',
                                            borderBottom: '1px solid #f5f5f5',
                                        }}
                                    >
                                        <span style={{ fontSize: '13px', color: '#666' }}>
                                            {score.label} {score.weight && <span style={{ color: '#aaa', fontSize: '11px' }}>({score.weight})</span>}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: Number(score.value) > 3 ? '#e74c3c' : '#1a1a2e',
                                            }}
                                        >
                                            {formatZValue(score.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Paste Timeline
                                </p>
                                {flag.pasteTimeline.length === 0 && (
                                    <p style={{ fontSize: '13px', color: '#aaa' }}>No paste events.</p>
                                )}
                                {flag.pasteTimeline.map((pasteEvent, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '5px 0',
                                            borderBottom: '1px solid #f5f5f5',
                                            fontSize: '13px',
                                        }}
                                    >
                                        <span style={{ color: '#666' }}>{new Date(pasteEvent.timestamp).toLocaleTimeString()}</span>
                                        <span style={{ fontWeight: '600', color: '#e74c3c' }}>{pasteEvent.charCount} chars</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {flag.status === 'pending' && (
                            <div
                                style={{
                                    padding: '1rem 1.5rem',
                                    borderTop: '1px solid #f0f0f0',
                                    display: 'flex',
                                    gap: '10px',
                                }}
                            >
                                <button
                                    onClick={() => handleFlagAction(flag.id, 'dismissed')}
                                    disabled={!!actionLoading}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid #bbf7d0',
                                        background: '#f0fdf4',
                                        color: '#27ae60',
                                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        opacity: actionLoading ? 0.6 : 1,
                                    }}
                                >
                                    {actionLoading === flag.id + 'dismissed' ? 'Saving...' : 'Dismiss'}
                                </button>
                                <button
                                    onClick={() => handleFlagAction(flag.id, 'escalated')}
                                    disabled={!!actionLoading}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid #fecaca',
                                        background: '#fef2f2',
                                        color: '#e74c3c',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                    }}
                                >
                                    {actionLoading === flag.id + 'escalated' ? 'Saving...' : 'Escalate'}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default StdDetails
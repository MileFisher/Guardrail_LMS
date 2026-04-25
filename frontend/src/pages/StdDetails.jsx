import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const fakeStudents = [
    { id: 'stu-001', displayName: 'Alice Johnson', email: 'alice@student.com', sessions: 4 },
    { id: 'stu-002', displayName: 'Bob Smith', email: 'bob@student.com', sessions: 2 },
    { id: 'stu-003', displayName: 'Charlie Brown', email: 'charlie@student.com', sessions: 1 },
]

const fakeFlags = [
    {
        id: 'flag-001', studentId: 'stu-001', assignmentId: 'Essay: Impact of AI in Education',
        status: 'pending', confidence: 87,
        createdAt: '2026-04-10T09:30:00Z',
        zScores: { wpm: 3.8, paste: 4.2, revision: 2.1, composite: 3.6 },
        pasteTimeline: [
            { timestamp: '2026-04-10T09:12:00Z', charCount: 342 },
            { timestamp: '2026-04-10T09:18:00Z', charCount: 210 },
        ],
        appeal: null
    },
    {
        id: 'flag-002', studentId: 'stu-001', assignmentId: 'Report: Cybersecurity Trends',
        status: 'pending', confidence: 72,
        createdAt: '2026-04-15T14:00:00Z',
        zScores: { wpm: 2.9, paste: 3.5, revision: 1.8, composite: 3.1 },
        pasteTimeline: [
            { timestamp: '2026-04-15T13:45:00Z', charCount: 180 },
        ],
        appeal: {
            text: 'I was copying my own notes from a previous document. The paste events were from my personal research notes.',
            submittedAt: '2026-04-16T08:00:00Z'
        }
    },
    {
        id: 'flag-003', studentId: 'stu-002', assignmentId: 'Analysis: Data Privacy Laws',
        status: 'dismissed', confidence: 65,
        createdAt: '2026-04-12T11:00:00Z',
        zScores: { wpm: 2.1, paste: 2.8, revision: 1.5, composite: 2.4 },
        pasteTimeline: [],
        appeal: null
    },
]

function StdDetails() {
    const { studentId } = useParams()
    const navigate = useNavigate()

    const student = fakeStudents.find(s => s.id === studentId)
    const studentFlags = fakeFlags.filter(f => f.studentId === studentId)
    const [flags, setFlags] = useState(studentFlags)
    const [actionMessage, setActionMessage] = useState('')

    const handleFlagAction = (flagId, action) => {
        setFlags(prev => prev.map(f => f.id === flagId ? { ...f, status: action } : f))
        setActionMessage(`Flag ${action} successfully.`)
        setTimeout(() => setActionMessage(''), 3000)
    }

    if (!student) return <p style={{ padding: '2rem' }}>Student not found.</p>

    const statusColor = { pending: '#e67e22', dismissed: '#27ae60', escalated: '#e74c3c', notified: '#1a5fa8' }
    const statusBg = { pending: '#fff8f0', dismissed: '#f0fdf4', escalated: '#fef2f2', notified: '#e8f0fb' }

    return (
        <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: 'sans-serif' }}>

            {/* Navbar */}
            <div style={{
                background: '#1a5fa8', padding: '0 2rem', height: '56px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px', height: '32px', background: 'white', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1a5fa8' }}>GR</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '500', fontSize: '15px' }}>Guardrail LMS</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginLeft: '4px' }}>/ Student Detail</span>
                </div>
                <button
                    onClick={() => navigate('/teacher/dashboard')}
                    style={{
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white', borderRadius: '6px', padding: '5px 14px', fontSize: '13px', cursor: 'pointer'
                    }}
                >
                    ← Back to Dashboard
                </button>
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

                {/* Student info card */}
                <div style={{
                    background: 'white', borderRadius: '10px', padding: '1.5rem',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1.5rem',
                    display: 'flex', alignItems: 'center', gap: '1rem'
                }}>
                    <div style={{
                        width: '52px', height: '52px', background: '#e8f0fb', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', fontWeight: '700', color: '#1a5fa8', flexShrink: 0
                    }}>
                        {student.displayName.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: '600', fontSize: '16px', color: '#1a1a2e' }}>{student.displayName}</p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>{student.email}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#888' }}>Sessions completed</p>
                        <p style={{ margin: '0 0 4px', fontWeight: '600', fontSize: '15px', color: '#1a1a2e' }}>{student.sessions}</p>
                        <span style={{
                            fontSize: '12px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px',
                            background: student.sessions >= 3 ? '#f0fdf4' : '#fff8f0',
                            color: student.sessions >= 3 ? '#27ae60' : '#e67e22',
                            border: `1px solid ${student.sessions >= 3 ? '#bbf7d0' : '#fed7aa'}`
                        }}>
                            {student.sessions >= 3 ? '✅ Calibrated' : `⏳ ${student.sessions}/3 sessions`}
                        </span>
                    </div>
                </div>

                {/* Action message */}
                {actionMessage && (
                    <div style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
                        padding: '10px 16px', marginBottom: '1rem', color: '#27ae60', fontSize: '14px'
                    }}>
                        {actionMessage}
                    </div>
                )}

                {/* Flags */}
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a2e', margin: '0 0 1rem' }}>Flags</p>

                {flags.length === 0 && (
                    <div style={{
                        background: 'white', borderRadius: '10px', padding: '2rem',
                        textAlign: 'center', color: '#888', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                    }}>
                        No flags for this student.
                    </div>
                )}

                {flags.map(flag => (
                    <div key={flag.id} style={{
                        background: 'white', borderRadius: '10px', marginBottom: '1rem',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden'
                    }}>

                        {/* Flag header */}
                        <div style={{
                            padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div>
                                <p style={{ margin: '0 0 2px', fontWeight: '600', fontSize: '14px', color: '#1a1a2e' }}>
                                    {flag.assignmentId}
                                </p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                                    Flagged: {new Date(flag.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                    fontSize: '13px', fontWeight: '600', color: '#e74c3c'
                                }}>
                                    {flag.confidence}% confidence
                                </span>
                                <span style={{
                                    fontSize: '12px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px',
                                    background: statusBg[flag.status] || '#f5f5f5',
                                    color: statusColor[flag.status] || '#888',
                                    border: `1px solid ${statusColor[flag.status]}33`
                                }}>
                                    {flag.status.charAt(0).toUpperCase() + flag.status.slice(1)}
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1.5rem' }}>

                            {/* Z-score breakdown */}
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Z-Score Breakdown
                                </p>
                                {[
                                    { label: 'WPM', value: flag.zScores.wpm, weight: '40%' },
                                    { label: 'Paste', value: flag.zScores.paste, weight: '35%' },
                                    { label: 'Revision', value: flag.zScores.revision, weight: '25%' },
                                    { label: 'Composite', value: flag.zScores.composite, weight: '' },
                                ].map(z => (
                                    <div key={z.label} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '5px 0', borderBottom: '1px solid #f5f5f5'
                                    }}>
                                        <span style={{ fontSize: '13px', color: '#666' }}>
                                            {z.label} {z.weight && <span style={{ color: '#aaa', fontSize: '11px' }}>({z.weight})</span>}
                                        </span>
                                        <span style={{
                                            fontSize: '13px', fontWeight: '600',
                                            color: z.value > 3 ? '#e74c3c' : '#1a1a2e'
                                        }}>
                                            {z.value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Paste timeline */}
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Paste Timeline
                                </p>
                                {flag.pasteTimeline.length === 0 && (
                                    <p style={{ fontSize: '13px', color: '#aaa' }}>No paste events.</p>
                                )}
                                {flag.pasteTimeline.map((p, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        padding: '5px 0', borderBottom: '1px solid #f5f5f5', fontSize: '13px'
                                    }}>
                                        <span style={{ color: '#666' }}>{new Date(p.timestamp).toLocaleTimeString()}</span>
                                        <span style={{ fontWeight: '600', color: '#e74c3c' }}>{p.charCount} chars</span>
                                    </div>
                                ))}
                            </div>

                        </div>

                        {/* Student appeal */}
                        {flag.appeal && (
                            <div style={{
                                margin: '0 1.5rem 1.25rem',
                                background: '#f8f9ff', border: '1px solid #dbe4ff',
                                borderRadius: '8px', padding: '1rem'
                            }}>
                                <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: '600', color: '#1a5fa8' }}>
                                    📋 Student Appeal
                                </p>
                                <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#444', lineHeight: '1.6' }}>
                                    {flag.appeal.text}
                                </p>
                                <p style={{ margin: 0, fontSize: '11px', color: '#999' }}>
                                    Submitted: {new Date(flag.appeal.submittedAt).toLocaleString()}
                                </p>
                            </div>
                        )}

                        {/* Action buttons */}
                        {flag.status === 'pending' && (
                            <div style={{
                                padding: '1rem 1.5rem', borderTop: '1px solid #f0f0f0',
                                display: 'flex', gap: '10px'
                            }}>
                                <button
                                    onClick={() => handleFlagAction(flag.id, 'dismissed')}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', fontSize: '13px',
                                        fontWeight: '500', cursor: 'pointer',
                                        background: '#f0fdf4', color: '#27ae60', border: '1px solid #bbf7d0'
                                    }}
                                >
                                    Dismiss
                                </button>
                                <button
                                    onClick={() => handleFlagAction(flag.id, 'escalated')}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', fontSize: '13px',
                                        fontWeight: '500', cursor: 'pointer',
                                        background: '#fef2f2', color: '#e74c3c', border: '1px solid #fecaca'
                                    }}
                                >
                                    Escalate
                                </button>
                                <button
                                    onClick={() => handleFlagAction(flag.id, 'notified')}
                                    style={{
                                        padding: '7px 16px', borderRadius: '6px', fontSize: '13px',
                                        fontWeight: '500', cursor: 'pointer',
                                        background: '#e8f0fb', color: '#1a5fa8', border: '1px solid #bfdbfe'
                                    }}
                                >
                                    Notify Student
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
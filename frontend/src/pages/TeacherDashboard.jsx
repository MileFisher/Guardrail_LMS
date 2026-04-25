import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const TAB = { OVERVIEW: 'overview', ASSIGNMENTS: 'assignments', STUDENTS: 'students' }

// ---------------- API helpers ----------------
async function apiGet(path) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `GET ${path} failed`)
    return data
}

async function apiPost(path, body) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `POST ${path} failed`)
    return data
}

// ---------------- Reusable modal styles ----------------
const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
}

const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    margin: '1rem',
}

const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
}

const labelStyle = {
    fontSize: '13px',
    color: '#555',
    display: 'block',
    marginBottom: '5px',
    fontWeight: '500',
}

// ---------------- Modals ----------------
function CreateCourseModal({ onClose, onCreate, loading }) {
    const [title, setTitle] = useState('')
    const [code, setCode] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (!title.trim() || !code.trim()) {
            setError('Title and code are required.')
            return
        }
        setError('')
        await onCreate({ title: title.trim(), code: code.trim().toUpperCase() })
        onClose()
    }

    return (
        <div style={overlayStyle}>
            <div style={{ ...cardStyle, width: '420px' }}>
                <p style={{ margin: '0 0 1.25rem', fontWeight: '600', fontSize: '16px', color: '#1a1a2e' }}>
                    Create Course
                </p>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Course title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to AI" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Course code</label>
                    <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CS401" style={inputStyle} />
                </div>

                {error && <p style={{ margin: '0 0 12px', color: '#dc2626', fontSize: '12px' }}>{error}</p>}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#1a5fa8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                    >
                        {loading ? 'Creating...' : 'Create'}
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
            </div>
        </div>
    )
}

function CreateAssignmentModal({ courseId, onClose, onCreate, loading }) {
    const [title, setTitle] = useState('')
    const [due, setDue] = useState('')
    const [prompt, setPrompt] = useState('')
    const [zscoreThreshold, setZscoreThreshold] = useState('2.0')
    const [pasteThreshold, setPasteThreshold] = useState('200')
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Title is required.')
            return
        }
        setError('')

        await onCreate({
            courseId,
            title: title.trim(),
            due,
            prompt: prompt.trim() || 'No prompt provided',
            zscoreThreshold: Number(zscoreThreshold || 2.0),
            pasteThreshold: Number(pasteThreshold || 200),
        })

        onClose()
    }

    return (
        <div style={overlayStyle}>
            <div style={{ ...cardStyle, width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                <p style={{ margin: '0 0 1.25rem', fontWeight: '600', fontSize: '16px', color: '#1a1a2e' }}>
                    Create Assignment
                </p>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Essay: AI in Education" />
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Due date</label>
                    <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle} />
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Prompt</label>
                    <textarea
                        rows={4}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
                        placeholder="Assignment instructions..."
                    />
                </div>

                <div style={{ background: '#f8f9fc', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '600', color: '#666' }}>Detection thresholds</p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Z-score threshold</label>
                            <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="5"
                                value={zscoreThreshold}
                                onChange={(e) => setZscoreThreshold(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Paste threshold (chars)</label>
                            <input
                                type="number"
                                min="0"
                                step="10"
                                value={pasteThreshold}
                                onChange={(e) => setPasteThreshold(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {error && <p style={{ margin: '0 0 12px', color: '#dc2626', fontSize: '12px' }}>{error}</p>}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#1a5fa8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                    >
                        {loading ? 'Creating...' : 'Create'}
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
            </div>
        </div>
    )
}

function AddStudentModal({ courseId, onClose, onAdd, loading }) {
    const [studentId, setStudentId] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (!studentId.trim()) {
            setError('Student ID is required.')
            return
        }
        setError('')
        await onAdd({ courseId, studentId: studentId.trim() })
        onClose()
    }

    return (
        <div style={overlayStyle}>
            <div style={{ ...cardStyle, width: '420px' }}>
                <p style={{ margin: '0 0 8px', fontWeight: '600', fontSize: '16px', color: '#1a1a2e' }}>Enroll Student</p>
                <p style={{ margin: '0 0 1.25rem', fontSize: '12px', color: '#888' }}>
                    Backend enroll endpoint requires student ID (not email).
                </p>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Student ID</label>
                    <input value={studentId} onChange={(e) => setStudentId(e.target.value)} style={inputStyle} placeholder="paste student UUID/id" />
                </div>

                {error && <p style={{ margin: '0 0 12px', color: '#dc2626', fontSize: '12px' }}>{error}</p>}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#1a5fa8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                    >
                        {loading ? 'Adding...' : 'Add Student'}
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
            </div>
        </div>
    )
}

// ---------------- Course panel ----------------
function CoursePanel({ course, navigate, onCreateAssignment, onAddStudent }) {
    const [tab, setTab] = useState(TAB.OVERVIEW)

    const tabStyle = (t) => ({
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        border: 'none',
        borderRadius: '6px',
        background: tab === t ? '#1a5fa8' : 'transparent',
        color: tab === t ? 'white' : '#666',
    })

    const pendingFlags = course.students.reduce((s, st) => s + (st.pendingFlags || 0), 0)
    const calibrated = course.students.filter((s) => s.calibrated).length
    const totalHints = course.students.reduce((s, st) => s + (st.hintsUsed || 0), 0)

    return (
        <div
            style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                overflow: 'hidden',
                marginBottom: '1.5rem',
            }}
        >
            <div
                style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            background: '#e8f0fb',
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
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '15px', color: '#1a1a2e' }}>{course.title}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                            {course.students.length} students · {calibrated} calibrated
                            {pendingFlags > 0 ? (
                                <span style={{ color: '#dc2626', fontWeight: '600' }}> · {pendingFlags} pending flag(s)</span>
                            ) : null}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => onAddStudent(course.id)}
                        style={{
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            background: 'white',
                            color: '#1a5fa8',
                            border: '1px solid #1a5fa8',
                            cursor: 'pointer',
                        }}
                    >
                        + Student
                    </button>
                    <button
                        onClick={() => onCreateAssignment(course.id)}
                        style={{
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            background: '#1a5fa8',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        + Assignment
                    </button>
                </div>
            </div>

            <div style={{ padding: '10px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '4px' }}>
                <button style={tabStyle(TAB.OVERVIEW)} onClick={() => setTab(TAB.OVERVIEW)}>
                    Overview
                </button>
                <button style={tabStyle(TAB.ASSIGNMENTS)} onClick={() => setTab(TAB.ASSIGNMENTS)}>
                    Assignments
                </button>
                <button style={tabStyle(TAB.STUDENTS)} onClick={() => setTab(TAB.STUDENTS)}>
                    Students
                </button>
            </div>

            {tab === TAB.OVERVIEW && (
                <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {[
                            { label: 'Students', value: course.students.length, color: '#1a5fa8' },
                            { label: 'Calibrated', value: calibrated, color: '#15803d' },
                            { label: 'Pending flags', value: pendingFlags, color: pendingFlags > 0 ? '#dc2626' : '#888' },
                            { label: 'Assignments', value: course.assignments.length, color: '#7c3aed' },
                            { label: 'Total hints used', value: totalHints, color: '#d97706' },
                        ].map((s) => (
                            <div key={s.label} style={{ flex: 1, background: '#f8f9fc', borderRadius: '8px', padding: '12px 14px' }}>
                                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{s.label}</p>
                                <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: s.color }}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === TAB.ASSIGNMENTS && (
                <div>
                    {course.assignments.length === 0 ? (
                        <p style={{ padding: '1.5rem', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>
                            No assignments yet. Click + Assignment.
                        </p>
                    ) : (
                        course.assignments.map((a, i) => (
                            <div
                                key={a.id}
                                style={{
                                    padding: '14px 20px',
                                    borderBottom: i < course.assignments.length - 1 ? '1px solid #f5f5f5' : 'none',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '500', color: '#1a1a2e' }}>{a.title}</p>
                                        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#888' }}>
                                            Due{' '}
                                            {a.due
                                                ? new Date(a.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : 'N/A'}{' '}
                                            · {a.submissions}/{a.total} submitted
                                        </p>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <span
                                                style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                    background: '#eff6ff',
                                                    color: '#1d4ed8',
                                                    border: '1px solid #bfdbfe',
                                                }}
                                            >
                                                Z ≥ {a.zscoreThreshold}
                                            </span>
                                            <span
                                                style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                    background: '#faf5ff',
                                                    color: '#7c3aed',
                                                    border: '1px solid #e9d5ff',
                                                }}
                                            >
                                                Paste ≥ {a.pasteThreshold} chars
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#888' }}>{Math.round((a.total ? a.submissions / a.total : 0) * 100)}%</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {tab === TAB.STUDENTS && (
                <div>
                    {course.students.length === 0 ? (
                        <p style={{ padding: '1.5rem', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No students enrolled.</p>
                    ) : (
                        course.students.map((student, i) => (
                            <div
                                key={student.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 20px',
                                    borderBottom: i < course.students.length - 1 ? '1px solid #f5f5f5' : 'none',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            background: '#e8f0fb',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            color: '#1a5fa8',
                                        }}
                                    >
                                        {(student.displayName || 'S').charAt(0)}
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#1a1a2e' }}>
                                            {student.displayName || 'Student'}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{student.email || student.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`/teacher/student/${student.id}`)}
                                    style={{
                                        padding: '5px 14px',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        background: '#1a5fa8',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    View
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

// ---------------- Main ----------------
function TeacherDashboard() {
    const navigate = useNavigate()
    const user = JSON.parse(localStorage.getItem('user') || 'null')

    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [mutating, setMutating] = useState(false)
    const [error, setError] = useState('')

    const [createForCourse, setCreateForCourse] = useState(null)
    const [showCreateCourse, setShowCreateCourse] = useState(false)
    const [addStudentForCourse, setAddStudentForCourse] = useState(null)

    const handleLogout = () => {
        localStorage.clear()
        navigate('/login')
    }

    const loadCourses = async () => {
        setLoading(true)
        setError('')

        try {
            const coursesRes = await apiGet('/api/courses')
            const baseCourses = coursesRes.courses || []

            const hydrated = await Promise.all(
                baseCourses.map(async (c) => {
                    const [assignRes, enrollRes] = await Promise.all([
                        apiGet(`/api/courses/${c.id}/assignments`).catch(() => ({ assignments: [] })),
                        apiGet(`/api/courses/${c.id}/enrollments`).catch(() => ({ enrollments: [] })),
                    ])

                    const enrollments = enrollRes.enrollments || []
                    const assignments = (assignRes.assignments || []).map((a) => ({
                        id: a.id,
                        title: a.title,
                        due: a.dueAt || null,
                        zscoreThreshold: a.zscoreThreshold ?? 2.0,
                        pasteThreshold: a.pasteThresholdChars ?? 200,
                        submissions: 0,
                        total: enrollments.length,
                    }))

                    const students = enrollments.map((e) => ({
                        id: e.student?.id || e.studentId,
                        displayName: e.student?.displayName || 'Student',
                        email: e.student?.email || '',
                        sessions: 0,
                        calibrated: false,
                        pendingFlags: 0,
                        hintsUsed: 0,
                    }))

                    return {
                        ...c,
                        assignments,
                        students,
                    }
                })
            )

            setCourses(hydrated)
        } catch (e) {
            setError(e.message || 'Failed to load teacher dashboard')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCourses()
    }, [])

    const handleCreateCourse = async ({ title, code }) => {
        setMutating(true)
        setError('')
        try {
            await apiPost('/api/courses', { title, code, isActive: true })
            await loadCourses()
        } catch (e) {
            setError(e.message)
        } finally {
            setMutating(false)
        }
    }

    const handleCreateAssignment = async ({ courseId, title, due, prompt, zscoreThreshold, pasteThreshold }) => {
        setMutating(true)
        setError('')
        try {
            await apiPost(`/api/courses/${courseId}/assignments`, {
                title,
                prompt: prompt || 'No prompt provided',
                dueAt: due ? new Date(due).toISOString() : null,
                zscoreThreshold,
                pasteThresholdChars: pasteThreshold,
                maxHintLevel: 3,
                minWordsForHint: 30,
            })
            await loadCourses()
        } catch (e) {
            setError(e.message)
        } finally {
            setMutating(false)
        }
    }

    const handleAddStudent = async ({ courseId, studentId }) => {
        setMutating(true)
        setError('')
        try {
            await apiPost(`/api/courses/${courseId}/enrollments`, { studentIds: [studentId] })
            await loadCourses()
        } catch (e) {
            setError(e.message)
        } finally {
            setMutating(false)
        }
    }

    const totalStudents = useMemo(() => courses.reduce((s, c) => s + c.students.length, 0), [courses])
    const totalFlags = useMemo(
        () => courses.reduce((s, c) => s + c.students.reduce((ss, st) => ss + (st.pendingFlags || 0), 0), 0),
        [courses]
    )
    const totalAssignments = useMemo(() => courses.reduce((s, c) => s + c.assignments.length, 0), [courses])
    const totalHints = useMemo(
        () => courses.reduce((s, c) => s + c.students.reduce((ss, st) => ss + (st.hintsUsed || 0), 0), 0),
        [courses]
    )

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f0f4f8', color: '#666' }}>
                Loading teacher dashboard...
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Segoe UI', sans-serif" }}>
            {showCreateCourse && (
                <CreateCourseModal onClose={() => setShowCreateCourse(false)} onCreate={handleCreateCourse} loading={mutating} />
            )}
            {createForCourse && (
                <CreateAssignmentModal
                    courseId={createForCourse}
                    onClose={() => setCreateForCourse(null)}
                    onCreate={handleCreateAssignment}
                    loading={mutating}
                />
            )}
            {addStudentForCourse && (
                <AddStudentModal
                    courseId={addStudentForCourse}
                    onClose={() => setAddStudentForCourse(null)}
                    onAdd={handleAddStudent}
                    loading={mutating}
                />
            )}

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
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginLeft: '4px' }}>/ Teacher</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>{user?.displayName || 'Teacher'}</span>
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

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[
                        { label: 'My Courses', value: courses.length, color: '#1a5fa8' },
                        { label: 'Total Students', value: totalStudents, color: '#1a5fa8' },
                        { label: 'Assignments', value: totalAssignments, color: '#7c3aed' },
                        { label: 'Pending Flags', value: totalFlags, color: totalFlags > 0 ? '#dc2626' : '#15803d' },
                        { label: 'Hints Used', value: totalHints, color: '#d97706' },
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
                            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{s.label}</p>
                            <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</p>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#888', textTransform: 'uppercase', margin: 0 }}>My Courses</p>
                    <button
                        onClick={() => setShowCreateCourse(true)}
                        style={{
                            padding: '7px 16px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            background: '#1a5fa8',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        + New Course
                    </button>
                </div>

                {courses.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: '10px', padding: '1rem', color: '#999', fontSize: '14px' }}>
                        No courses yet. Create your first course.
                    </div>
                ) : (
                    courses.map((course) => (
                        <CoursePanel
                            key={course.id}
                            course={course}
                            navigate={navigate}
                            onCreateAssignment={(id) => setCreateForCourse(id)}
                            onAddStudent={(id) => setAddStudentForCourse(id)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

export default TeacherDashboard
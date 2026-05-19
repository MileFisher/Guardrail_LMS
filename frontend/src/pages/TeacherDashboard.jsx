import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const TAB = { OVERVIEW: 'overview', LECTURES: 'lectures', ASSIGNMENTS: 'assignments', STUDENTS: 'students' }
const ASSIGNMENT_TYPE = { ESSAY: 'essay', QA: 'qa', MCQ: 'mcq' }
const LECTURE_MEDIA_TYPE = { LINK: 'link', IMAGE: 'image', VIDEO: 'video' }

function isEssayAssignmentType(type) {
    return (type || ASSIGNMENT_TYPE.ESSAY) === ASSIGNMENT_TYPE.ESSAY
}

function getAssignmentTypeLabel(type) {
    if (type === ASSIGNMENT_TYPE.QA) return 'Socratic Q&A tutor'
    if (type === ASSIGNMENT_TYPE.MCQ) return 'MCQ practice + AI tutor'
    return 'Integrity Monitor essay'
}

function formatDate(value) {
    if (!value) return 'N/A'
    return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(value) {
    if (!value) return 'Not available'
    return new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function clipText(value, maxLength = 220) {
    const text = String(value || '').trim()
    if (!text) return 'No written content captured.'
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text
}

function getYoutubeEmbedUrl(url) {
    try {
        const parsed = new URL(url)
        if (parsed.hostname.includes('youtu.be')) {
            const videoId = parsed.pathname.replace('/', '')
            return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
        }

        if (parsed.hostname.includes('youtube.com')) {
            if (parsed.pathname.startsWith('/embed/')) {
                return parsed.toString()
            }

            const videoId = parsed.searchParams.get('v')
            return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
        }
    } catch {
        return ''
    }

    return ''
}

function isDirectVideoUrl(url) {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || '')
}

function renderLectureMedia(lecture) {
    if (!lecture?.mediaUrl) return null

    if (lecture.mediaType === LECTURE_MEDIA_TYPE.IMAGE) {
        return (
            <img
                src={lecture.mediaUrl}
                alt={lecture.title}
                style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: '10px', marginTop: '12px' }}
            />
        )
    }

    if (lecture.mediaType === LECTURE_MEDIA_TYPE.VIDEO) {
        const embedUrl = getYoutubeEmbedUrl(lecture.mediaUrl)

        if (embedUrl) {
            return (
                <div style={{ marginTop: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #dbe7f3' }}>
                    <iframe
                        src={embedUrl}
                        title={lecture.title}
                        style={{ width: '100%', height: '260px', border: 'none', display: 'block' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            )
        }

        if (isDirectVideoUrl(lecture.mediaUrl)) {
            return (
                <video
                    controls
                    src={lecture.mediaUrl}
                    style={{ width: '100%', maxHeight: '260px', borderRadius: '10px', marginTop: '12px', background: '#0f172a' }}
                />
            )
        }
    }

    return (
        <a
            href={lecture.mediaUrl}
            target="_blank"
            rel="noreferrer"
            style={{
                display: 'inline-flex',
                marginTop: '12px',
                color: '#1a5fa8',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
            }}
        >
            Open resource
        </a>
    )
}

function getMcqSelectionDetails(assignment, answers) {
    const questionMap = new Map((assignment?.mcqQuestions || []).map((question) => [question.id, question]))

    return Object.entries(answers || {}).map(([questionId, optionId]) => {
        const question = questionMap.get(questionId)
        const option = question?.options?.find((item) => item.id === optionId)
        return {
            questionId,
            prompt: question?.prompt || questionId,
            optionLabel: option ? `${option.id}. ${option.text}` : optionId,
        }
    })
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
    if (!res.ok) throw new Error(data.message || `PATCH ${path} failed`)
    return data
}

async function apiDelete(path) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `DELETE ${path} failed`)
    return data
}

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
                <p style={{ margin: '0 0 1.25rem', fontWeight: '600', fontSize: '16px', color: '#1a1a2e' }}>Create Course</p>

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
    const [assignmentType, setAssignmentType] = useState(ASSIGNMENT_TYPE.ESSAY)
    const [zscoreThreshold, setZscoreThreshold] = useState('2.0')
    const [pasteThreshold, setPasteThreshold] = useState('200')
    const [error, setError] = useState('')
    const isEssayAssignment = isEssayAssignmentType(assignmentType)
    const isMcqAssignment = assignmentType === ASSIGNMENT_TYPE.MCQ

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Title is required.')
            return
        }

        setError('')
        await onCreate({
            courseId,
            assignmentType,
            title: title.trim(),
            due,
            prompt: prompt.trim() || 'No prompt provided',
            zscoreThreshold: isEssayAssignment ? Number(zscoreThreshold || 2.0) : null,
            pasteThreshold: isEssayAssignment ? Number(pasteThreshold || 200) : null,
        })
        onClose()
    }

    return (
        <div style={overlayStyle}>
            <div style={{ ...cardStyle, width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
                <p style={{ margin: '0 0 1.25rem', fontWeight: '600', fontSize: '16px', color: '#1a1a2e' }}>Create Assignment</p>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Title</label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={inputStyle}
                        placeholder={
                            isEssayAssignment
                                ? 'e.g. Essay: Writing a Formal Email'
                                : isMcqAssignment
                                    ? 'e.g. MCQ: Verb Tenses and Sentence Correction'
                                    : 'e.g. Q&A: Thesis Statement Practice'
                        }
                    />
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Assignment type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                        {[
                            {
                                value: ASSIGNMENT_TYPE.ESSAY,
                                title: 'Essay + Integrity Monitor',
                                description: 'Students write and submit an essay. Telemetry, paste detection, and anomaly thresholds apply.',
                            },
                            {
                                value: ASSIGNMENT_TYPE.QA,
                                title: 'Q&A + Socratic Tutor',
                                description: 'Students open the guided tutor workspace. No essay submission or integrity thresholds are used.',
                            },
                            {
                                value: ASSIGNMENT_TYPE.MCQ,
                                title: 'MCQ + AI Tutor',
                                description: 'Students answer multiple-choice questions and can ask for guided hints without direct answers.',
                            },
                        ].map((option) => {
                            const selected = assignmentType === option.value
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setAssignmentType(option.value)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: selected ? '2px solid #1a5fa8' : '1px solid #d7dfeb',
                                        background: selected ? '#eff6ff' : 'white',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>{option.title}</p>
                                    <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: '#666' }}>{option.description}</p>
                                </button>
                            )
                        })}
                    </div>
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

                {isEssayAssignment ? (
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
                ) : (
                    <div style={{ background: '#fffbeb', borderRadius: '8px', padding: '12px', marginBottom: '14px', border: '1px solid #fde68a' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: '600', color: '#92400e' }}>
                            {isMcqAssignment ? 'MCQ tutor assignment' : 'Socratic tutor assignment'}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: '#7c5a15' }}>
                            Tutor-style assignments do not use essay submission metrics. MCQ work now appears in the teacher dashboard once students save their responses.
                        </p>
                    </div>
                )}

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
                <p style={{ margin: '0 0 1.25rem', fontSize: '12px', color: '#888' }}>Backend enroll endpoint requires student ID.</p>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Student ID</label>
                    <input value={studentId} onChange={(e) => setStudentId(e.target.value)} style={inputStyle} placeholder="Enter student ID" />
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

function LectureModal({ courseId, lecture, onClose, onSave, loading }) {
    const [title, setTitle] = useState(lecture?.title || '')
    const [description, setDescription] = useState(lecture?.description || '')
    const [mediaType, setMediaType] = useState(lecture?.mediaType || LECTURE_MEDIA_TYPE.LINK)
    const [mediaUrl, setMediaUrl] = useState(lecture?.mediaUrl || '')
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Title is required.')
            return
        }

        setError('')
        await onSave({
            courseId,
            lectureId: lecture?.id || null,
            title: title.trim(),
            description: description.trim(),
            mediaType,
            mediaUrl: mediaUrl.trim(),
        })
        onClose()
    }

    return (
        <div style={overlayStyle}>
            <div style={{ ...cardStyle, width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
                <p style={{ margin: '0 0 1.25rem', fontWeight: '600', fontSize: '16px', color: '#1a1a2e' }}>
                    {lecture ? 'Edit Lecture Material' : 'Add Lecture Material'}
                </p>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Week 4 lecture: Essay structure" />
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                        placeholder="Notes, summary, or instructions for students..."
                    />
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Media type</label>
                    <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} style={inputStyle}>
                        <option value={LECTURE_MEDIA_TYPE.LINK}>Resource link</option>
                        <option value={LECTURE_MEDIA_TYPE.IMAGE}>Image URL</option>
                        <option value={LECTURE_MEDIA_TYPE.VIDEO}>Video URL</option>
                    </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Media URL</label>
                    <input
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        style={inputStyle}
                        placeholder="Optional: paste an image, video, YouTube, or document link"
                    />
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #dbe7f3', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>Supported media</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                        Use direct image URLs, direct video files, or YouTube links. If the URL cannot be embedded, students still get an open link.
                    </p>
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
                        {loading ? 'Saving...' : lecture ? 'Update' : 'Create'}
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

function LectureCard({ lecture, onEdit, onDelete }) {
    return (
        <div
            style={{
                background: '#f8fafc',
                border: '1px solid #dbe7f3',
                borderRadius: '12px',
                padding: '16px',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: '#1a1a2e' }}>{lecture.title}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Updated {formatDateTime(lecture.updatedAt || lecture.createdAt)}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={onEdit}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: 'white',
                            color: '#1a5fa8',
                            border: '1px solid #bfdbfe',
                            cursor: 'pointer',
                        }}
                    >
                        Edit
                    </button>
                    <button
                        onClick={onDelete}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: '#fff1f2',
                            color: '#be123c',
                            border: '1px solid #fecdd3',
                            cursor: 'pointer',
                        }}
                    >
                        Delete
                    </button>
                </div>
            </div>

            {lecture.description && (
                <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                    {lecture.description}
                </p>
            )}

            {renderLectureMedia(lecture)}
        </div>
    )
}

function SubmissionList({ assignment }) {
    if (assignment.assignmentType === ASSIGNMENT_TYPE.QA) {
        return (
            <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '12px' }}>
                Q&A tutor activity is tracked in the hint logs rather than as a final submission.
            </div>
        )
    }

    if (!assignment.responses.length) {
        return (
            <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px dashed #dbe7f3', color: '#94a3b8', fontSize: '12px' }}>
                No student submissions yet.
            </div>
        )
    }

    return (
        <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
            {assignment.responses.map((response) => {
                const mcqSelections = getMcqSelectionDetails(assignment, response.answers)
                return (
                    <div
                        key={response.id}
                        style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            background: '#f8fafc',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div>
                                <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>{response.studentName || response.studentEmail || response.studentId}</p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{response.studentEmail || response.studentId}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: '600', color: '#1a5fa8' }}>
                                    {response.responseType === 'mcq'
                                        ? `${response.answeredCount || 0}/${response.totalQuestions || 0} answered`
                                        : 'Essay submission'}
                                </p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{formatDateTime(response.activityAt)}</p>
                            </div>
                        </div>

                        {response.responseType === 'mcq' ? (
                            <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                                {mcqSelections.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>No answers saved yet.</p>
                                ) : (
                                    mcqSelections.map((item) => (
                                        <div key={item.questionId} style={{ background: 'white', borderRadius: '8px', padding: '10px', border: '1px solid #e2e8f0' }}>
                                            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '600', color: '#334155' }}>{item.prompt}</p>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#1a5fa8' }}>Selected: {item.optionLabel}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div style={{ marginTop: '10px', background: 'white', borderRadius: '8px', padding: '10px', border: '1px solid #e2e8f0' }}>
                                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {clipText(response.contentText, 320)}
                                </p>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function CoursePanel({ course, navigate, onCreateAssignment, onAddStudent, onManageLecture, onDeleteLecture }) {
    const [tab, setTab] = useState(TAB.OVERVIEW)
    const pendingFlags = course.students.reduce((sum, student) => sum + (student.pendingFlags || 0), 0)
    const calibrated = course.students.filter((student) => student.calibrated).length
    const totalHints = course.students.reduce((sum, student) => sum + (student.hintsUsed || 0), 0)

    const tabStyle = (target) => ({
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        border: 'none',
        borderRadius: '6px',
        background: tab === target ? '#1a5fa8' : 'transparent',
        color: tab === target ? 'white' : '#666',
    })

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
                    gap: '12px',
                    flexWrap: 'wrap',
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
                            {course.students.length} students | {calibrated} calibrated
                            {pendingFlags > 0 ? <span style={{ color: '#dc2626', fontWeight: '600' }}> | {pendingFlags} pending flag(s)</span> : null}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => onManageLecture(course.id)}
                        style={{
                            padding: '7px 14px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            background: '#fff7ed',
                            color: '#b45309',
                            border: '1px solid #fdba74',
                            cursor: 'pointer',
                        }}
                    >
                        + Lecture
                    </button>
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

            <div style={{ padding: '10px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button style={tabStyle(TAB.OVERVIEW)} onClick={() => setTab(TAB.OVERVIEW)}>Overview</button>
                <button style={tabStyle(TAB.LECTURES)} onClick={() => setTab(TAB.LECTURES)}>Lectures</button>
                <button style={tabStyle(TAB.ASSIGNMENTS)} onClick={() => setTab(TAB.ASSIGNMENTS)}>Assignments</button>
                <button style={tabStyle(TAB.STUDENTS)} onClick={() => setTab(TAB.STUDENTS)}>Students</button>
            </div>

            {tab === TAB.OVERVIEW && (
                <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Students', value: course.students.length, color: '#1a5fa8' },
                            { label: 'Calibrated', value: calibrated, color: '#15803d' },
                            { label: 'Pending flags', value: pendingFlags, color: pendingFlags > 0 ? '#dc2626' : '#888' },
                            { label: 'Assignments', value: course.assignments.length, color: '#7c3aed' },
                            { label: 'Lectures', value: course.lectures.length, color: '#b45309' },
                            { label: 'Total hints used', value: totalHints, color: '#d97706' },
                        ].map((stat) => (
                            <div key={stat.label} style={{ flex: '1 1 140px', background: '#f8f9fc', borderRadius: '8px', padding: '12px 14px' }}>
                                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{stat.label}</p>
                                <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: stat.color }}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === TAB.LECTURES && (
                <div style={{ padding: '16px 20px', display: 'grid', gap: '12px' }}>
                    {course.lectures.length === 0 ? (
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>No lecture materials yet. Click + Lecture to add one.</p>
                    ) : (
                        course.lectures.map((lecture) => (
                            <LectureCard
                                key={lecture.id}
                                lecture={lecture}
                                onEdit={() => onManageLecture(course.id, lecture)}
                                onDelete={() => onDeleteLecture(course.id, lecture.id)}
                            />
                        ))
                    )}
                </div>
            )}

            {tab === TAB.ASSIGNMENTS && (
                <div>
                    {course.assignments.length === 0 ? (
                        <p style={{ padding: '1.5rem', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No assignments yet. Click + Assignment.</p>
                    ) : (
                        course.assignments.map((assignment, index) => {
                            const isEssayAssignment = isEssayAssignmentType(assignment.assignmentType)
                            const progressPercent = Math.round((assignment.total ? assignment.submissions / assignment.total : 0) * 100)

                            return (
                                <div
                                    key={assignment.id}
                                    style={{
                                        padding: '14px 20px',
                                        borderBottom: index < course.assignments.length - 1 ? '1px solid #f5f5f5' : 'none',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '500', color: '#1a1a2e' }}>{assignment.title}</p>
                                            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#888' }}>
                                                Due {formatDate(assignment.due)} | {getAssignmentTypeLabel(assignment.assignmentType)} | {assignment.submissions}/{assignment.total} submitted
                                            </p>
                                            {isEssayAssignment ? (
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                                                        Z &gt;= {assignment.zscoreThreshold}
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
                                                        Paste &gt;= {assignment.pasteThreshold} chars
                                                    </span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span
                                                        style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '20px',
                                                            fontSize: '11px',
                                                            fontWeight: '500',
                                                            background: '#fffbeb',
                                                            color: '#b45309',
                                                            border: '1px solid #fde68a',
                                                        }}
                                                    >
                                                        {getAssignmentTypeLabel(assignment.assignmentType)}
                                                    </span>
                                                    <span
                                                        style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '20px',
                                                            fontSize: '11px',
                                                            fontWeight: '500',
                                                            background: '#f5f3ff',
                                                            color: '#6d28d9',
                                                            border: '1px solid #ddd6fe',
                                                        }}
                                                    >
                                                        Hint ladder L1-L{assignment.maxHintLevel || 3}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', fontWeight: '600' }}>
                                            {assignment.assignmentType === ASSIGNMENT_TYPE.QA ? 'Tutor' : `${progressPercent}%`}
                                        </div>
                                    </div>

                                    <SubmissionList assignment={assignment} />
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {tab === TAB.STUDENTS && (
                <div>
                    {course.students.length === 0 ? (
                        <p style={{ padding: '1.5rem', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No students enrolled.</p>
                    ) : (
                        course.students.map((student, index) => (
                            <div
                                key={student.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    padding: '12px 20px',
                                    borderBottom: index < course.students.length - 1 ? '1px solid #f5f5f5' : 'none',
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
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#1a1a2e' }}>{student.displayName || 'Student'}</p>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{student.email || student.id}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => navigate(`/teacher/student/${student.id}/hints?courseId=${course.id}`)}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            background: '#fffbeb',
                                            color: '#d97706',
                                            border: '1px solid #fde68a',
                                            cursor: 'pointer',
                                        }}
                                        title="View hint interaction log"
                                    >
                                        Hints
                                    </button>
                                    <button
                                        onClick={() => navigate(`/teacher/student/${student.id}?courseId=${course.id}`)}
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
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

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
    const [lectureEditor, setLectureEditor] = useState(null)

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
                baseCourses.map(async (course) => {
                    const [assignRes, enrollRes, submissionRes, lectureRes] = await Promise.all([
                        apiGet(`/api/courses/${course.id}/assignments`).catch(() => ({ assignments: [] })),
                        apiGet(`/api/courses/${course.id}/enrollments`).catch(() => ({ enrollments: [] })),
                        apiGet(`/api/courses/${course.id}/submissions`).catch(() => ({ submissions: [] })),
                        apiGet(`/api/courses/${course.id}/lectures`).catch(() => ({ lectures: [] })),
                    ])

                    const enrollments = enrollRes.enrollments || []
                    const submissions = submissionRes.submissions || []
                    const submissionMap = submissions.reduce((map, item) => {
                        const key = String(item.assignmentId)
                        const current = map.get(key) || []
                        current.push(item)
                        map.set(key, current)
                        return map
                    }, new Map())

                    const assignments = (assignRes.assignments || []).map((assignment) => ({
                        id: assignment.id,
                        assignmentType: assignment.assignmentType || ASSIGNMENT_TYPE.ESSAY,
                        title: assignment.title,
                        due: assignment.dueAt || null,
                        maxHintLevel: assignment.maxHintLevel ?? 3,
                        zscoreThreshold: assignment.zscoreThreshold ?? 2.0,
                        pasteThreshold: assignment.pasteThresholdChars ?? 200,
                        submissions: Number(assignment.submissionCount ?? 0),
                        total: Number(assignment.totalStudents ?? enrollments.length ?? 0),
                        mcqQuestions: Array.isArray(assignment.mcqQuestions) ? assignment.mcqQuestions : [],
                        responses: submissionMap.get(String(assignment.id)) || [],
                    }))

                    const students = enrollments.map((enrollment) => ({
                        id: enrollment.student?.id || enrollment.studentId,
                        displayName: enrollment.student?.displayName || 'Student',
                        email: enrollment.student?.email || '',
                        sessions: enrollment.sessionCount || 0,
                        calibrated: Boolean(enrollment.isCalibrated),
                        pendingFlags: enrollment.pendingFlags || 0,
                        hintsUsed: enrollment.hintsUsed || 0,
                    }))

                    return {
                        ...course,
                        assignments,
                        students,
                        lectures: lectureRes.lectures || [],
                    }
                })
            )

            setCourses(hydrated)
        } catch (loadError) {
            setError(loadError.message || 'Failed to load teacher dashboard')
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
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setMutating(false)
        }
    }

    const handleCreateAssignment = async ({ courseId, assignmentType, title, due, prompt, zscoreThreshold, pasteThreshold }) => {
        setMutating(true)
        setError('')
        try {
            await apiPost(`/api/courses/${courseId}/assignments`, {
                assignmentType,
                title,
                prompt: prompt || 'No prompt provided',
                dueAt: due ? new Date(due).toISOString() : null,
                zscoreThreshold,
                pasteThresholdChars: pasteThreshold,
                maxHintLevel: 3,
            })
            await loadCourses()
        } catch (requestError) {
            setError(requestError.message)
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
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setMutating(false)
        }
    }

    const handleSaveLecture = async ({ courseId, lectureId, title, description, mediaType, mediaUrl }) => {
        setMutating(true)
        setError('')
        try {
            const payload = { title, description, mediaType, mediaUrl }
            if (lectureId) {
                await apiPatch(`/api/courses/${courseId}/lectures/${lectureId}`, payload)
            } else {
                await apiPost(`/api/courses/${courseId}/lectures`, payload)
            }
            await loadCourses()
        } catch (requestError) {
            setError(requestError.message)
            throw requestError
        } finally {
            setMutating(false)
        }
    }

    const handleDeleteLecture = async (courseId, lectureId) => {
        if (!window.confirm('Delete this lecture material?')) return

        setMutating(true)
        setError('')
        try {
            await apiDelete(`/api/courses/${courseId}/lectures/${lectureId}`)
            await loadCourses()
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setMutating(false)
        }
    }

    const totalStudents = useMemo(() => courses.reduce((sum, course) => sum + course.students.length, 0), [courses])
    const totalFlags = useMemo(
        () => courses.reduce((sum, course) => sum + course.students.reduce((studentSum, student) => studentSum + (student.pendingFlags || 0), 0), 0),
        [courses]
    )
    const totalAssignments = useMemo(() => courses.reduce((sum, course) => sum + course.assignments.length, 0), [courses])
    const totalLectures = useMemo(() => courses.reduce((sum, course) => sum + course.lectures.length, 0), [courses])
    const totalHints = useMemo(
        () => courses.reduce((sum, course) => sum + course.students.reduce((studentSum, student) => studentSum + (student.hintsUsed || 0), 0), 0),
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
            {showCreateCourse && <CreateCourseModal onClose={() => setShowCreateCourse(false)} onCreate={handleCreateCourse} loading={mutating} />}
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
            {lectureEditor && (
                <LectureModal
                    courseId={lectureEditor.courseId}
                    lecture={lectureEditor.lecture}
                    onClose={() => setLectureEditor(null)}
                    onSave={handleSaveLecture}
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

            <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 1.5rem' }}>
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

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {[
                        { label: 'My Courses', value: courses.length, color: '#1a5fa8' },
                        { label: 'Total Students', value: totalStudents, color: '#1a5fa8' },
                        { label: 'Assignments', value: totalAssignments, color: '#7c3aed' },
                        { label: 'Lecture Materials', value: totalLectures, color: '#b45309' },
                        { label: 'Pending Flags', value: totalFlags, color: totalFlags > 0 ? '#dc2626' : '#15803d' },
                        { label: 'Hints Used', value: totalHints, color: '#d97706' },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            style={{
                                flex: '1 1 150px',
                                background: 'white',
                                borderRadius: '10px',
                                padding: '14px 16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                        >
                            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{stat.label}</p>
                            <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: stat.color }}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
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
                            onCreateAssignment={(courseId) => setCreateForCourse(courseId)}
                            onAddStudent={(courseId) => setAddStudentForCourse(courseId)}
                            onManageLecture={(courseId, lecture = null) => setLectureEditor({ courseId, lecture })}
                            onDeleteLecture={handleDeleteLecture}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

export default TeacherDashboard

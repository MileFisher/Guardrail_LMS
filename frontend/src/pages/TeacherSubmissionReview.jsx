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
    if (!res.ok) throw new Error(data.message || `GET ${path} failed`)
    return data
}

function TeacherSubmissionReview() {
    const navigate = useNavigate()
    const { submissionId } = useParams()
    const [searchParams] = useSearchParams()
    const courseId = searchParams.get('courseId')

    const [submission, setSubmission] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let mounted = true

        async function loadSubmission() {
            if (!courseId) {
                setError('Missing courseId in the review URL.')
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError('')
                const response = await apiGet(`/api/courses/${courseId}/submissions`)
                const found = (response.submissions || []).find((item) => String(item.id) === String(submissionId))

                if (!mounted) return

                if (!found) {
                    setError('Submission not found.')
                    return
                }

                if (found.responseType !== 'essay') {
                    setError('This review page currently supports essay submissions only.')
                    return
                }

                setSubmission(found)
            } catch (loadError) {
                if (!mounted) return
                setError(loadError.message || 'Failed to load submission.')
            } finally {
                if (mounted) setLoading(false)
            }
        }

        loadSubmission()
        return () => { mounted = false }
    }, [courseId, submissionId])

    const pageShell = (content) => (
        <div style={{ minHeight: '100vh', background: '#f4f6f9', fontFamily: "'Segoe UI', sans-serif" }}>
            <div style={{ background: '#1a5fa8', padding: '0 2rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1a5fa8' }}>GR</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '500', fontSize: '15px' }}>Guardrail LMS</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginLeft: '4px' }}>/ Submission Review</span>
                </div>
                <button
                    onClick={() => navigate('/teacher/dashboard')}
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '6px', padding: '5px 14px', fontSize: '13px', cursor: 'pointer' }}
                >
                    Back to Dashboard
                </button>
            </div>

            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem' }}>
                {content}
            </div>
        </div>
    )

    if (loading) {
        return pageShell(
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', color: '#666' }}>
                Loading submission review...
            </div>
        )
    }

    if (error) {
        return pageShell(
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', color: '#b91c1c' }}>
                {error}
            </div>
        )
    }

    return pageShell(
        <>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                        <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                            Essay Submission
                        </p>
                        <p style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '700', color: '#1a1a2e' }}>
                            {submission.assignmentTitle}
                        </p>
                        <p style={{ margin: '0 0 2px', fontSize: '14px', color: '#334155' }}>
                            {submission.studentName || submission.studentEmail || submission.studentId}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            {submission.studentEmail || submission.studentId}
                        </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                            Submitted
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1a5fa8' }}>
                            {new Date(submission.activityAt).toLocaleString('en-GB')}
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                    Student Writing
                </p>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', background: '#f8fafc' }}>
                    <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.85, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {submission.contentText || 'No essay content was saved for this submission.'}
                    </p>
                </div>
            </div>
        </>
    )
}

export default TeacherSubmissionReview

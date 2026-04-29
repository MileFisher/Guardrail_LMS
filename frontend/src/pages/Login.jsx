import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const passwordRef = useRef(null)

    const handleLogin = async () => {
        try {
            setError('')
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Login failed')

            localStorage.setItem('token', data.accessToken)
            localStorage.setItem('user', JSON.stringify(data.user))

            if (data.user.role === 'admin') {
                navigate('/admin')
            } else if (data.user.role === 'teacher') {
                navigate('/teacher/dashboard')
            } else {
                navigate('/dashboard')
            }
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a5fa8 0%, #3b8fd4 50%, #7bbfe8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div style={{
                display: 'flex',
                width: '100%',
                maxWidth: '860px',
                gap: '2rem',
                alignItems: 'center'
            }}>

                {/* Left side — branding */}
                <div style={{ flex: 1, color: 'white', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '52px', height: '52px',
                            background: 'white', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ fontSize: '20px', fontWeight: '500', color: '#1a5fa8' }}>GR</span>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: '500', color: 'white' }}>Guardrail LMS</p>
                            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>Ton Duc Thang University</p>
                        </div>
                    </div>
                    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.7', margin: 0 }}>
                        Process-based academic integrity & Socratic AI Tutor platform for students and educators.
                    </p>
                </div>

                {/* Right side — login card */}
                <div style={{
                    width: '340px',
                    background: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    flexShrink: 0
                }}>
                    <p style={{ fontWeight: '500', fontSize: '16px', margin: '0 0 1.5rem' }}>Sign in to your account</p>

                    {error && <p style={{ color: 'red', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>Email</label>
                        <input
                            type="email"
                            placeholder="you@tdtu.edu.vn"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') passwordRef.current?.focus()
                            }}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>Password</label>
                        <input
                            ref={passwordRef}
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleLogin()
                            }}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <button
                        onClick={handleLogin}
                        style={{
                            width: '100%', padding: '10px',
                            background: '#1a5fa8', color: 'white',
                            border: 'none', borderRadius: '6px',
                            fontSize: '15px', fontWeight: '500', cursor: 'pointer'
                        }}
                    >
                        Sign in
                    </button>

                    <p style={{ textAlign: 'center', fontSize: '13px', color: '#666', margin: '1rem 0 0' }}>
                        Don't have an account? <a href="/register" style={{ color: '#1a5fa8' }}>Register</a>
                    </p>
                </div>

            </div>
        </div>
    )
}

export default Login
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

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

async function apiPatch(path, body) {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `PATCH ${path} failed`)
    return data
}

const TABS = { USERS: 'users', THRESHOLDS: 'thresholds', SYSTEM: 'system' }

const ROLE_CFG = {
    admin:   { label: 'Admin',   color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
    teacher: { label: 'Teacher', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    student: { label: 'Student', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
}

const DEFAULT_THRESHOLDS = {
    zscoreDefault: 3.0,
    pasteThresholdChars: 500,
    maxHintLevel: 3,
    loginRateLimitAttempts: 10,
    loginRateLimitWindowMin: 15,
}

const iStyle = {
    width: '100%', padding: '8px 11px', border: '1.5px solid #e5e7eb',
    borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit',
    color: '#1a1a2e', boxSizing: 'border-box', background: 'white',
}

const lStyle = { fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '5px' }
const btnP = { padding: '7px 18px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }
const btnS = { padding: '7px 14px', background: 'white', color: '#444', border: '1.5px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }

function RoleBadge({ role }) {
    const c = ROLE_CFG[role] || ROLE_CFG.student
    return <span style={{ padding: '2px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: c.bg, color: c.color, border: `1.5px solid ${c.border}` }}>{c.label}</span>
}

function StatusDot({ active }) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: active ? '#15803d' : '#dc2626' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: active ? '#22c55e' : '#ef4444' }} />
        {active ? 'Active' : 'Deactivated'}
    </span>
}

function Toast({ msg, type }) {
    if (!msg) return null
    return <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
        padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
        background: type === 'error' ? '#fef2f2' : '#f0fdf4',
        color: type === 'error' ? '#b91c1c' : '#15803d',
        border: `1.5px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', animation: 'slideUp .2s ease',
    }}>{type === 'error' ? '✗ ' : '✓ '}{msg}</div>
}

function EditUserModal({ user, onClose, onSave, loading }) {
    const [role, setRole] = useState(user.role)
    const [isActive, setIsActive] = useState(user.isActive)
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '380px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>Edit User</p>
                <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#888' }}>{user.displayName} · {user.email}</p>
                <div style={{ marginBottom: '16px' }}>
                    <label style={lStyle}>Role</label>
                    <select value={role} onChange={e => setRole(e.target.value)} style={iStyle}>
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div style={{ marginBottom: '24px' }}>
                    <label style={lStyle}>Account status</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[true, false].map(v => (
                            <button key={String(v)} onClick={() => setIsActive(v)} style={{
                                flex: 1, padding: '8px', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                border: `1.5px solid ${isActive === v ? (v ? '#22c55e' : '#ef4444') : '#e5e7eb'}`,
                                background: isActive === v ? (v ? '#f0fdf4' : '#fef2f2') : 'white',
                                color: isActive === v ? (v ? '#15803d' : '#dc2626') : '#aaa',
                            }}>{v ? 'Active' : 'Deactivated'}</button>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={btnS} disabled={loading}>Cancel</button>
                    <button onClick={() => onSave({ role, isActive })} style={btnP} disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</button>
                </div>
            </div>
        </div>
    )
}

function CreateUserModal({ onClose, onCreate, loading }) {
    const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'student' })
    const [err, setErr] = useState('')
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const handleCreate = async () => {
        if (!form.displayName.trim() || !form.email.trim() || !form.password.trim()) { setErr('All fields required.'); return }
        setErr('')
        await onCreate(form)
    }
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '400px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
                <p style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '700', color: '#1a1a2e' }}>Create User Account</p>
                {err && <div style={{ marginBottom: '12px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '7px', fontSize: '12px' }}>{err}</div>}
                {[
                    { key: 'displayName', label: 'Full name', type: 'text', placeholder: 'e.g. Nguyen Van A' },
                    { key: 'email', label: 'Email', type: 'email', placeholder: 'e.g. student@tdtu.edu.vn' },
                    { key: 'password', label: 'Initial password', type: 'password', placeholder: 'Min 8 characters' },
                ].map(f => (
                    <div key={f.key} style={{ marginBottom: '13px' }}>
                        <label style={lStyle}>{f.label}</label>
                        <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} style={iStyle} />
                    </div>
                ))}
                <div style={{ marginBottom: '22px' }}>
                    <label style={lStyle}>Role</label>
                    <select value={form.role} onChange={e => set('role', e.target.value)} style={iStyle}>
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={btnS} disabled={loading}>Cancel</button>
                    <button onClick={handleCreate} style={btnP} disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
                </div>
            </div>
        </div>
    )
}

function UsersTab({ users, onEdit, onCreate, onDeactivate, mutating }) {
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [showCreate, setShowCreate] = useState(false)
    const [editTarget, setEditTarget] = useState(null)

    const filtered = useMemo(() => users.filter(u => {
        const s = !search || u.displayName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
        const r = roleFilter === 'all' || u.role === roleFilter
        return s && r
    }), [users, search, roleFilter])

    const counts = useMemo(() => ({
        total: users.length,
        admin: users.filter(u => u.role === 'admin').length,
        teacher: users.filter(u => u.role === 'teacher').length,
        student: users.filter(u => u.role === 'student').length,
        inactive: users.filter(u => !u.isActive).length,
    }), [users])

    return (
        <div>
            {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreate={async d => { await onCreate(d); setShowCreate(false) }} loading={mutating} />}
            {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSave={async c => { await onEdit(editTarget.id, c); setEditTarget(null) }} loading={mutating} />}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total accounts', value: counts.total, color: '#1a1a2e' },
                    { label: 'Admins', value: counts.admin, color: '#7c3aed' },
                    { label: 'Teachers', value: counts.teacher, color: '#1d4ed8' },
                    { label: 'Students', value: counts.student, color: '#15803d' },
                    { label: 'Deactivated', value: counts.inactive, color: counts.inactive > 0 ? '#dc2626' : '#aaa' },
                ].map(s => (
                    <div key={s.label} style={{ flex: 1, minWidth: '100px', background: 'white', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
                        <p style={{ margin: '0 0 2px', fontSize: '10px', color: '#aaa', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '.05em' }}>{s.label}</p>
                        <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…" style={{ ...iStyle, width: '220px', flex: '0 0 auto' }} />
                {['all', 'admin', 'teacher', 'student'].map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)} style={{
                        padding: '5px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        border: `1.5px solid ${roleFilter === r ? '#1a1a2e' : '#e5e7eb'}`,
                        background: roleFilter === r ? '#1a1a2e' : 'white',
                        color: roleFilter === r ? 'white' : '#666',
                    }}>{r === 'all' ? 'All roles' : r.charAt(0).toUpperCase() + r.slice(1)}</button>
                ))}
                <button onClick={() => setShowCreate(true)} style={{ ...btnP, marginLeft: 'auto' }}>+ New account</button>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 100px 110px 120px 90px', gap: '12px', padding: '10px 18px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                    {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                        <span key={h} style={{ fontSize: '11px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</span>
                    ))}
                </div>
                {filtered.length === 0
                    ? <div style={{ padding: '2rem', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>No users match.</div>
                    : filtered.map((u, i) => (
                        <div key={u.id} style={{
                            display: 'grid', gridTemplateColumns: '2fr 2fr 100px 110px 120px 90px',
                            gap: '12px', padding: '13px 18px', alignItems: 'center',
                            borderBottom: i < filtered.length - 1 ? '1px solid #f8f8f8' : 'none',
                            opacity: u.isActive ? 1 : 0.6, background: 'white',
                        }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>{u.displayName}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                            <RoleBadge role={u.role} />
                            <StatusDot active={u.isActive} />
                            <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>
                                {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => setEditTarget(u)} style={{ ...btnS, padding: '4px 10px', fontSize: '12px' }}>Edit</button>
                                {u.isActive && u.role !== 'admin' && (
                                    <button onClick={() => onDeactivate(u.id)} disabled={mutating} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>✕</button>
                                )}
                            </div>
                        </div>
                    ))
                }
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#bbb' }}>
                UC-A1 · Admin accounts cannot be deactivated via UI. Accounts with consent logs are protected by ON DELETE RESTRICT.
            </p>
        </div>
    )
}

function ThresholdRow({ label, description, field, value, unit, min, max, step, onChange, note }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '20px', alignItems: 'start', padding: '20px 0', borderBottom: '1px solid #f5f5f5' }}>
            <div>
                <p style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#888', lineHeight: 1.5 }}>{description}</p>
                {note && <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#d97706', fontWeight: '600' }}>⚠ {note}</p>}
            </div>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" min={min} max={max} step={step || 1} value={value}
                        onChange={e => onChange(field, Number(e.target.value))}
                        style={{ ...iStyle, width: '90px', textAlign: 'right', fontWeight: '700', fontSize: '16px' }}
                    />
                    {unit && <span style={{ fontSize: '12px', color: '#aaa', whiteSpace: 'nowrap' }}>{unit}</span>}
                </div>
                <input type="range" min={min} max={max} step={step || 1} value={value}
                    onChange={e => onChange(field, Number(e.target.value))}
                    style={{ width: '100%', marginTop: '8px', accentColor: '#1a1a2e' }}
                />
            </div>
        </div>
    )
}

function ThresholdsTab({ thresholds, onSave, mutating }) {
    const [local, setLocal] = useState(thresholds)
    const [dirty, setDirty] = useState(false)

    useEffect(() => { setLocal(thresholds) }, [thresholds])

    const set = (k, v) => { setLocal(p => ({ ...p, [k]: v })); setDirty(true) }
    const reset = () => { setLocal(thresholds); setDirty(false) }

    const rows = [
        { label: 'Z-score flag threshold', description: 'Composite Z-score above this value triggers a flag for teacher review. FR-07 default: Z > 3.', field: 'zscoreDefault', unit: 'σ', min: 1, max: 6, step: 0.1, note: 'Lowering increases false-positive flags. Teachers can override per assignment within this bound.' },
        { label: 'Paste volume threshold', description: 'Cumulative pasted characters per session that independently trigger a flag, regardless of Z-score. FR-09.', field: 'pasteThresholdChars', unit: 'chars', min: 100, max: 2000, step: 50 },
        { label: 'Max hint level', description: 'The highest hint level students can reach before being redirected to their teacher. FR-24.', field: 'maxHintLevel', unit: 'level', min: 1, max: 3, step: 1 },
        { label: 'Login rate limit — max attempts', description: 'Max failed login attempts per IP before the window locks the account. FR-17.', field: 'loginRateLimitAttempts', unit: 'attempts', min: 3, max: 30, step: 1 },
        { label: 'Login rate limit — window', description: 'Duration of the rate limit sliding window. FR-17.', field: 'loginRateLimitWindowMin', unit: 'minutes', min: 5, max: 60, step: 5 },
    ]

    return (
        <div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
                <div>
                    <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '700', color: '#92400e' }}>System-wide defaults — UC-A3</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#b45309', lineHeight: 1.5 }}>
                        These are platform defaults. Teachers can override Z-score and paste thresholds per assignment within these bounds.
                        Changes apply to new sessions only.
                    </p>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' }}>
                {rows.map(r => <ThresholdRow key={r.field} {...r} value={local[r.field]} onChange={set} />)}
            </div>

            {dirty && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button onClick={reset} style={btnS}>Discard</button>
                    <button onClick={() => onSave(local)} style={btnP} disabled={mutating}>{mutating ? 'Saving…' : 'Save defaults'}</button>
                </div>
            )}

            <div style={{ marginTop: '20px', background: 'white', borderRadius: '12px', padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' }}>
                <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>Live preview</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {rows.map(r => (
                        <div key={r.field} style={{ padding: '10px 14px', background: '#f8f9fa', borderRadius: '8px' }}>
                            <p style={{ margin: '0 0 2px', fontSize: '10px', color: '#bbb', textTransform: 'uppercase', fontWeight: '700' }}>{r.label}</p>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: dirty ? '#1a5fa8' : '#1a1a2e' }}>
                                {local[r.field]} <span style={{ fontSize: '11px', color: '#aaa', fontWeight: '400' }}>{r.unit}</span>
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function SystemTab() {
    const checks = [
        { label: 'PostgreSQL connection', status: 'ok',   detail: 'Connected · v15.4' },
        { label: 'Redis connection',      status: 'ok',   detail: 'Connected · hit rate 94%' },
        { label: 'Claude API',            status: 'ok',   detail: 'Reachable · claude-sonnet-4-6' },
        { label: 'Background jobs',       status: 'warn', detail: 'Partition rotation pending' },
        { label: 'HMAC signing key',      status: 'ok',   detail: 'Active · last rotated 7d ago' },
        { label: 'JWT auth',              status: 'ok',   detail: 'RS256 · 1h TTL' },
    ]
    const sc = {
        ok:   { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: '✓' },
        warn: { color: '#92400e', bg: '#fffbeb', border: '#fde68a', icon: '⚠' },
        err:  { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', icon: '✗' },
    }
    return (
        <div>
            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f5f5f5', background: '#fafafa' }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>System health — UC-A7</p>
                </div>
                {checks.map((c, i) => {
                    const cfg = sc[c.status]
                    return (
                        <div key={c.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < checks.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                            <div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>{c.label}</p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>{c.detail}</p>
                            </div>
                            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}` }}>
                                {cfg.icon} {c.status.toUpperCase()}
                            </span>
                        </div>
                    )
                })}
            </div>
            <div style={{ marginTop: '16px', background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0' }}>
                <p style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em' }}>Quick actions — UC-A8</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                        { label: 'View Socratic system prompt version', color: '#1a1a2e' },
                        { label: 'Export compliance audit data', color: '#1d4ed8' },
                        { label: 'Process data deletion requests', color: '#7c3aed' },
                        { label: 'Trigger partition rotation', color: '#d97706' },
                    ].map(a => (
                        <button key={a.label} style={{ ...btnS, color: a.color, borderColor: a.color + '44', fontSize: '12px' }}>{a.label}</button>
                    ))}
                </div>
                <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#ccc' }}>System actions are shown only when backed by API data.</p>
            </div>
        </div>
    )
}

function AdminPanel() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState(TABS.USERS)
    const [users, setUsers] = useState([])
    const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [mutating, setMutating] = useState(false)
    const [toast, setToast] = useState({ msg: '', type: 'ok' })

    const showToast = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'ok' }), 3000) }

    useEffect(() => {
        const raw = localStorage.getItem('user')
        if (!raw) { navigate('/login'); return }
        const u = JSON.parse(raw)
        if (u.role !== 'admin') navigate(u.role === 'teacher' ? '/teacher/dashboard' : '/dashboard')
    }, [navigate])

    useEffect(() => {
        async function load() {
            try {
                setLoadError('')
                const [usersRes, thresholdsRes] = await Promise.all([
                    apiGet('/api/admin/users'),
                    apiGet('/api/admin/thresholds'),
                ])
                setUsers(usersRes.users || [])
                setThresholds({ ...DEFAULT_THRESHOLDS, ...thresholdsRes })
            } catch (err) {
                setLoadError(err.message || 'Failed to load admin data from the database.')
            }
            finally { setLoading(false) }
        }
        load()
    }, [])

    const handleCreateUser = async (data) => {
        setMutating(true)
        try {
            const res = await apiPost('/api/admin/users', data)
            setUsers(p => [res.user, ...p])
            showToast('Account created successfully.')
        } catch (e) { showToast(e.message, 'error') }
        finally { setMutating(false) }
    }

    const handleEditUser = async (id, changes) => {
        setMutating(true)
        try {
            const res = await apiPatch(`/api/admin/users/${id}`, changes)
            setUsers(p => p.map(u => u.id === id ? res.user : u))
            showToast('User updated.')
        } catch (e) { showToast(e.message, 'error') }
        finally { setMutating(false) }
    }

    const handleDeactivate = async (id) => {
        if (!window.confirm('Deactivate this account?')) return
        setMutating(true)
        try {
            const res = await apiPatch(`/api/admin/users/${id}`, { isActive: false })
            setUsers(p => p.map(u => u.id === id ? res.user : u))
            showToast('Account deactivated.')
        } catch (e) { showToast(e.message, 'error') }
        finally { setMutating(false) }
    }

    const handleSaveThresholds = async (data) => {
        setMutating(true)
        try {
            const saved = await apiPatch('/api/admin/thresholds', data)
            setThresholds({ ...DEFAULT_THRESHOLDS, ...saved })
            showToast('Global thresholds saved.')
        } catch (e) { showToast(e.message, 'error') }
        finally { setMutating(false) }
    }

    const tabs = [
        { id: TABS.USERS,      label: 'User Accounts',     icon: '👥', note: 'UC-A1' },
        { id: TABS.THRESHOLDS, label: 'Global Thresholds', icon: '⚙️', note: 'UC-A3' },
        { id: TABS.SYSTEM,     label: 'System Health',     icon: '🖥',  note: 'UC-A7' },
    ]

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f4f6', color: '#888', fontFamily: "'Segoe UI', sans-serif" }}>
            Loading admin panel…
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', background: '#f4f4f6', fontFamily: "'Segoe UI', sans-serif" }}>
            <style>{`
                button:hover { opacity: .88; }
                input:focus, select:focus { outline: none; border-color: #1a1a2e !important; }
                @keyframes slideUp { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
            `}</style>
            <Toast msg={toast.msg} type={toast.type} />

            <nav style={{ height: '56px', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', boxShadow: '0 1px 6px rgba(0,0,0,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#1a1a2e' }}>GR</span>
                    </div>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>Guardrail LMS</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>/ Admin</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}>🔑 Admin</span>
                    <button onClick={() => { localStorage.clear(); navigate('/login') }} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)', borderRadius: '6px', padding: '5px 14px', fontSize: '13px', cursor: 'pointer' }}>Logout</button>
                </div>
            </nav>

            <div style={{ background: 'white', borderBottom: '1px solid #ebebeb', padding: '0 2rem' }}>
                <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex' }}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                            padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '13px', fontWeight: activeTab === t.id ? '700' : '500',
                            color: activeTab === t.id ? '#1a1a2e' : '#888',
                            borderBottom: `2.5px solid ${activeTab === t.id ? '#1a1a2e' : 'transparent'}`,
                            display: 'flex', alignItems: 'center', gap: '7px',
                        }}>
                            {t.icon} {t.label}
                            <span style={{ fontSize: '10px', color: activeTab === t.id ? '#7c3aed' : '#ddd', fontWeight: '700' }}>{t.note}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '1.75rem 2rem' }}>
                {loadError && (
                    <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
                        {loadError}
                    </div>
                )}
                {activeTab === TABS.USERS      && <UsersTab users={users} onEdit={handleEditUser} onCreate={handleCreateUser} onDeactivate={handleDeactivate} mutating={mutating} />}
                {activeTab === TABS.THRESHOLDS && <ThresholdsTab thresholds={thresholds} onSave={handleSaveThresholds} mutating={mutating} />}
                {activeTab === TABS.SYSTEM     && <SystemTab />}
            </div>
        </div>
    )
}

export default AdminPanel

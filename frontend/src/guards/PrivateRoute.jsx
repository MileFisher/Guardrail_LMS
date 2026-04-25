import { Navigate } from 'react-router-dom'

function PrivateRoute({ children, allowedRoles }) {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user'))

    // Not logged in → go to login
    if (!token || !user) return <Navigate to="/login" />

    // Wrong role → go to login
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" />
    }

    return children
}

export default PrivateRoute
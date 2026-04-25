import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PrivateRoute from './guards/PrivateRoute'
import Editor from './pages/Editor'
import TeacherDashboard from './pages/TeacherDashboard'
import StdDetails from './pages/StdDetails'
import AppealForm from './pages/AppealForm'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/dashboard" element={
                    <PrivateRoute allowedRoles={['student']}>
                        <Dashboard />
                    </PrivateRoute>
                } />

                <Route path="/editor" element={
                    <PrivateRoute allowedRoles={['student']}>
                        <Editor />
                    </PrivateRoute>
                } />

                <Route path="/teacher/dashboard" element={
                    <PrivateRoute allowedRoles={['teacher', 'admin']}>
                        <TeacherDashboard />
                    </PrivateRoute>
                } />

                <Route path="/teacher/student/:studentId" element={
                    <PrivateRoute allowedRoles={['teacher', 'admin']}>
                        <StdDetails />
                    </PrivateRoute>
                } />

                <Route path="/appeal" element={
                    <PrivateRoute allowedRoles={['student']}>
                        <AppealForm />
                    </PrivateRoute>
                } />

            </Routes>
        </BrowserRouter>
    )
}

export default App
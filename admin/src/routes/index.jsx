import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/Dashboard';
import StudentAnalytics from '../pages/StudentAnalytics';
import StudentList from '../pages/StudentList';
import StudentAdmission from '../pages/StudentAdmission';
import StudentDetails from '../pages/StudentDetails';
import AuthorizationRequests from '../pages/AuthorizationRequests';
import AuthorizationRequestDetail from '../pages/AuthorizationRequestDetail';
import Batches from '../pages/Batches';
import Broadcasts from '../pages/Broadcasts';
import StudyMaterials from '../pages/StudyMaterials';
import QuestionBank from '../pages/QuestionBank';
import CreateAdmin from '../pages/CreateAdmin';
import ImportAdmissions from '../pages/ImportAdmissions';
import Settings from '../pages/Settings';
import AdminProfile from '../pages/AdminProfile';
import AccessRevocation from '../pages/AccessRevocation';
import LoginPage from '../pages/Login';
import NotFound from '../pages/NotFound';
import ErrorPage from '../pages/ErrorPage';
const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/',
        element: <AdminLayout />,
        errorElement: <ErrorPage />,
        children: [
            { index: true, element: <Dashboard /> },
            { path: 'analytics', element: <StudentAnalytics /> },
            { path: 'students', element: <StudentList /> },
            { path: 'students/admit', element: <StudentAdmission /> },
            { path: 'students/import', element: <ImportAdmissions /> },
            { path: 'students/:id', element: <StudentDetails /> },
            { path: 'authorization-requests', element: <AuthorizationRequests /> },
            { path: 'authorization-requests/:id', element: <AuthorizationRequestDetail /> },
            { path: 'batches', element: <Batches /> },
            { path: 'broadcasts', element: <Broadcasts /> },
            { path: 'study-materials', element: <StudyMaterials /> },
            { path: 'question-bank', element: <QuestionBank /> },
            { path: 'admin/create', element: <CreateAdmin /> },
            { path: 'profile', element: <AdminProfile /> },
            { path: 'access-revocation', element: <AccessRevocation /> },
            { path: 'settings', element: <Settings /> },
            { path: 'import-admissions', element: <Navigate to="/students/import" replace /> },
            { path: 'student-analytics', element: <Navigate to="/analytics" replace /> },
        ],
    },
    {
        path: '*',
        element: <NotFound />,
    },
]);
export default router;

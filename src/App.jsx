import { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { RealtimeProvider, useRealtime } from "./context/RealtimeContext";
import PrivateRoute from "./components/PrivateRoute";
import OrganizationRoute from "./components/OrganizationRoute";
import RemovedFromOrgModal from "./components/ui/RemovedFromOrgModal";

// Componente de carga
const PageLoader = () => (
  <div className='min-h-screen flex items-center justify-center bg-gray-50'>
    <div className='flex flex-col items-center gap-3'>
      <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600'></div>
      <span className='text-gray-500 text-sm'>Cargando...</span>
    </div>
  </div>
);

// Pages - Lazy loaded
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Teams = lazy(() => import("./pages/Teams"));
const TeamDetail = lazy(() => import("./pages/TeamDetail"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Organizations = lazy(() => import("./pages/Organizations"));
const OrganizationDetail = lazy(() => import("./pages/OrganizationDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const AcceptTeamInvitation = lazy(() => import("./pages/AcceptTeamInvitation"));
const AcceptOrganizationInvitation = lazy(() =>
  import("./pages/AcceptOrganizationInvitation")
);

// Admin Pages - Lazy loaded
const Users = lazy(() => import("./pages/admin/Users"));
const AdminOrganizations = lazy(() => import("./pages/admin/Organizations"));
const Licenses = lazy(() => import("./pages/admin/Licenses"));
const Logs = lazy(() => import("./pages/admin/Logs"));
const Stats = lazy(() => import("./pages/admin/Stats"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));

// Componente wrapper para renderizar modales globales que necesitan hooks
const GlobalModals = () => {
  const { removedFromOrgModal, closeRemovedFromOrgModal } = useRealtime();

  return (
    <RemovedFromOrgModal
      isOpen={removedFromOrgModal.isOpen}
      organizationName={removedFromOrgModal.organizationName}
      removerName={removedFromOrgModal.removerName}
      onClose={closeRemovedFromOrgModal}
    />
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RealtimeProvider>
          <Router>
            <GlobalModals />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Rutas públicas */}
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
                <Route
                  path='/accept-invitation/:token'
                  element={<AcceptInvitation />}
                />
                <Route
                  path='/accept-team-invitation/:token'
                  element={<AcceptTeamInvitation />}
                />
                <Route
                  path='/accept-organization-invitation/:token'
                  element={<AcceptOrganizationInvitation />}
                />

                {/* Rutas protegidas */}
                <Route
                  path='/dashboard'
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/projects'
                  element={
                    <PrivateRoute>
                      <Projects />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/projects/:id'
                  element={
                    <PrivateRoute>
                      <ProjectDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/tasks'
                  element={
                    <PrivateRoute>
                      <Tasks />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/teams'
                  element={
                    <PrivateRoute>
                      <Teams />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/teams/:id'
                  element={
                    <PrivateRoute>
                      <TeamDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/tickets'
                  element={
                    <OrganizationRoute>
                      <Tickets />
                    </OrganizationRoute>
                  }
                />
                <Route
                  path='/organizations'
                  element={
                    <PrivateRoute>
                      <Organizations />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/organizations/:id'
                  element={
                    <PrivateRoute>
                      <OrganizationDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/admin'
                  element={
                    <PrivateRoute>
                      <Admin />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/admin/users'
                  element={
                    <PrivateRoute>
                      <Users />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/admin/organizations'
                  element={
                    <PrivateRoute>
                      <AdminOrganizations />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/admin/licenses'
                  element={
                    <PrivateRoute>
                      <Licenses />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/admin/logs'
                  element={
                    <PrivateRoute>
                      <Logs />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/admin/stats'
                  element={
                    <PrivateRoute>
                      <Stats />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/admin/settings'
                  element={
                    <PrivateRoute>
                      <AdminSettings />
                    </PrivateRoute>
                  }
                />
                <Route
                  path='/settings'
                  element={
                    <PrivateRoute>
                      <Settings />
                    </PrivateRoute>
                  }
                />

                {/* Ruta por defecto */}
                <Route path='/' element={<Navigate to='/dashboard' />} />
              </Routes>
            </Suspense>
          </Router>
        </RealtimeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

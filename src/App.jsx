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
import AdminRoute from "./components/AdminRoute";
import OrganizationRoute from "./components/OrganizationRoute";
import RemovedFromOrgModal from "./components/ui/RemovedFromOrgModal";
import LoadingScreen from "./components/ui/LoadingScreen";

// Componente de carga (fallback de Suspense entre chunks lazy)
const PageLoader = () => <LoadingScreen />;

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
const Plans = lazy(() => import("./pages/admin/Plans"));
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
                    <OrganizationRoute>
                      <Teams />
                    </OrganizationRoute>
                  }
                />
                <Route
                  path='/teams/:id'
                  element={
                    <OrganizationRoute>
                      <TeamDetail />
                    </OrganizationRoute>
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
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />
                <Route
                  path='/admin/users'
                  element={
                    <AdminRoute>
                      <Users />
                    </AdminRoute>
                  }
                />
                <Route
                  path='/admin/organizations'
                  element={
                    <AdminRoute>
                      <AdminOrganizations />
                    </AdminRoute>
                  }
                />
                <Route
                  path='/admin/licenses'
                  element={
                    <AdminRoute>
                      <Licenses />
                    </AdminRoute>
                  }
                />
                <Route
                  path='/admin/plans'
                  element={
                    <AdminRoute>
                      <Plans />
                    </AdminRoute>
                  }
                />
                <Route
                  path='/admin/logs'
                  element={
                    <AdminRoute>
                      <Logs />
                    </AdminRoute>
                  }
                />
                <Route
                  path='/admin/stats'
                  element={
                    <AdminRoute>
                      <Stats />
                    </AdminRoute>
                  }
                />
                <Route
                  path='/admin/settings'
                  element={
                    <AdminRoute>
                      <AdminSettings />
                    </AdminRoute>
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

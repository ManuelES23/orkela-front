import Layout from "../../components/layout/Layout";
import UsersManagement from "../../components/admin/UsersManagement";

const Users = () => {
  return (
    <Layout
      title='Gestión de Usuarios'
      subtitle='Administra los usuarios de la aplicación'
    >
      <UsersManagement />
    </Layout>
  );
};

export default Users;

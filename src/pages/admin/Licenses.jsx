import Layout from "../../components/layout/Layout";
import LicensesManagement from "../../components/admin/LicensesManagement";

const Licenses = () => {
  return (
    <Layout
      title='Gestión de Licencias'
      subtitle='Control de licencias y suscripciones'
    >
      <LicensesManagement />
    </Layout>
  );
};

export default Licenses;

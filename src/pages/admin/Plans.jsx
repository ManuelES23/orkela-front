import Layout from "../../components/layout/Layout";
import PlansManagement from "../../components/admin/PlansManagement";

const Plans = () => {
  return (
    <Layout
      title='Gestión de Planes'
      subtitle='Catálogo de planes, límites y precios'
    >
      <PlansManagement />
    </Layout>
  );
};

export default Plans;

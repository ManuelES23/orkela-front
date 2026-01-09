import Layout from "../../components/layout/Layout";
import SystemStats from "../../components/admin/SystemStats";

const Stats = () => {
  return (
    <Layout
      title='Estadísticas del Sistema'
      subtitle='Análisis y métricas de rendimiento'
    >
      <SystemStats />
    </Layout>
  );
};

export default Stats;

import Layout from "../../components/layout/Layout";
import SystemLogs from "../../components/admin/SystemLogs";

const Logs = () => {
  return (
    <Layout title='Logs del Sistema' subtitle='Registro de actividad y eventos'>
      <SystemLogs />
    </Layout>
  );
};

export default Logs;

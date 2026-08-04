import DeliveryForm from "../../../components/drivers/entregas/DeliveryForm";
import { useEntrega } from "../../../hooks/useEntrega";
import { useNavigate } from "react-router-dom";

export default function RegistrarEntrega() {
  const navigate = useNavigate();
  const { registrarEntrega } = useEntrega();

  const handleSubmit = async (data) => {
    await registrarEntrega(data);
    navigate("/drivers/entregas/confirmacion");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Registrar Entrega</h2>
      <DeliveryForm onSubmit={handleSubmit} />
    </div>
  );
}

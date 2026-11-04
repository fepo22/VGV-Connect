import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changeOwnPassword } from "../../api/auth.api";
import useAuth from "../../hooks/useAuth";

const MIN_LENGTH = 8;
const emptyForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePasswordPage({ roleHome }) {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const forced = Boolean(user?.mustChangePassword);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.newPassword.length < MIN_LENGTH) return setError(`La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
    if (form.newPassword !== form.confirmPassword) return setError("La confirmación no coincide con la nueva contraseña.");
    setSaving(true);
    try {
      const updatedUser = await changeOwnPassword(form.currentPassword, form.newPassword);
      setForm(emptyForm);
      login(updatedUser);
      if (forced) {
        navigate(roleHome[updatedUser.role] || "/", { replace: true });
        return;
      }
      setSuccess("Contraseña actualizada. Las demás sesiones abiertas fueron cerradas.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="driver-management password-change">
      <div className="panel-heading"><div><p className="eyebrow">Mi cuenta</p><h3>Cambiar contraseña</h3></div></div>
      {forced && <p className="route-error" role="alert">Debes cambiar tu contraseña provisoria antes de continuar.</p>}
      {error && <p className="route-error" role="alert">{error}</p>}
      {success && <p className="password-change-success" role="status">{success}</p>}
      <form className="driver-management-form" onSubmit={handleSubmit}>
        <label>Contraseña actual<input type="password" required autoComplete="current-password" value={form.currentPassword} onChange={update("currentPassword")} /></label>
        <label>Nueva contraseña<input type="password" required minLength={MIN_LENGTH} autoComplete="new-password" value={form.newPassword} onChange={update("newPassword")} /></label>
        <label>Confirmar nueva contraseña<input type="password" required minLength={MIN_LENGTH} autoComplete="new-password" value={form.confirmPassword} onChange={update("confirmPassword")} /></label>
        <p className="password-change-hint">Mínimo {MIN_LENGTH} caracteres. No uses secuencias, claves comunes, tu usuario ni tu nombre.</p>
        <div className="driver-management-actions"><button className="primary-action" disabled={saving} type="submit">{saving ? "Guardando..." : "Cambiar contraseña"}</button></div>
      </form>
    </section>
  );
}

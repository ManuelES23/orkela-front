import { useState, useEffect, useRef } from "react";
import Layout from "../components/layout/Layout";
import { User, Camera, Trash2, Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  StaggerContainer,
  StaggerItem,
} from "../components/animations/MotionComponents";
import { profileAPI } from "../utils/api";
import { getAssetUrl } from "../utils/assetUrl";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const { success, error: showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Estados del perfil
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    job_title: "",
    bio: "",
    avatar: null,
    language: "es",
    timezone: "America/Lima",
    theme: "light",
  });

  // Cargar perfil al montar
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileAPI.get();
      setProfile(data);
    } catch (err) {
      showError("No se pudo cargar el perfil");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const { name, phone, job_title, bio, language, timezone, theme } =
        profile;
      await profileAPI.update({
        name,
        phone,
        job_title,
        bio,
        language,
        timezone,
        theme,
      });
      success("Perfil actualizado correctamente");
      // Refrescar datos del usuario en el contexto
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      showError(err.message || "No se pudo actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      showError("El archivo debe ser una imagen (JPG, PNG, GIF, WebP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showError("La imagen no debe superar los 2MB");
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await profileAPI.uploadAvatar(file);
      setProfile((prev) => ({ ...prev, avatar: response.avatar }));
      success("Avatar actualizado correctamente");
      // Refrescar datos del usuario en el contexto
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      showError(err.message || "No se pudo subir el avatar");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile.avatar) return;

    try {
      setUploadingAvatar(true);
      await profileAPI.deleteAvatar();
      setProfile((prev) => ({ ...prev, avatar: null }));
      success("Avatar eliminado correctamente");
    } catch (err) {
      showError(err.message || "No se pudo eliminar el avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getAvatarUrl = () => {
    if (profile.avatar) {
      return getAssetUrl(profile.avatar);
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile.name || "U"
    )}&background=7c3aed&color=fff&size=80`;
  };

  if (loading) {
    return (
      <Layout
        title='Configuración'
        subtitle='Administra las preferencias de tu cuenta'
      >
        <div className='flex items-center justify-center py-20'>
          <Loader2 className='w-8 h-8 animate-spin text-brand-600' />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title='Configuración'
      subtitle='Administra las preferencias de tu cuenta'
    >
      <div className='max-w-3xl'>
        <StaggerContainer className='space-y-6'>
          {/* Tarjeta de identidad */}
          <StaggerItem>
            <div className='relative overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-lg bg-linear-to-br from-brand-600 to-accent-600'>
              <div className='absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none' />

              <div className='relative flex flex-col sm:flex-row sm:items-center gap-5'>
                <div className='relative shrink-0'>
                  <img
                    src={getAvatarUrl()}
                    alt='Avatar'
                    className='w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/30'
                  />
                  {uploadingAvatar && (
                    <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full'>
                      <Loader2 className='w-6 h-6 text-white animate-spin' />
                    </div>
                  )}
                </div>

                <div className='flex-1 min-w-0'>
                  <h1 className='text-xl sm:text-2xl font-bold truncate'>
                    {profile.name || "Tu perfil"}
                  </h1>
                  <p className='text-white/80 text-sm truncate'>
                    {profile.email}
                  </p>
                </div>

                <div className='flex items-center gap-2 shrink-0'>
                  <input
                    type='file'
                    ref={fileInputRef}
                    onChange={handleAvatarSelect}
                    accept='image/jpeg,image/png,image/gif,image/webp'
                    className='hidden'
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className='flex items-center gap-2 px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-medium rounded-lg transition disabled:opacity-50'
                  >
                    <Camera className='w-3.5 h-3.5' />
                    Cambiar foto
                  </button>
                  {profile.avatar && (
                    <button
                      onClick={handleDeleteAvatar}
                      disabled={uploadingAvatar}
                      className='p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition disabled:opacity-50'
                      title='Eliminar avatar'
                    >
                      <Trash2 className='w-3.5 h-3.5' />
                    </button>
                  )}
                </div>
              </div>
              <p className='relative text-xs text-white/60 mt-3'>
                JPG, PNG, GIF o WebP. Máx. 2MB
              </p>
            </div>
          </StaggerItem>

          {/* Formulario editorial: secciones divididas por línea, sin doble card */}
          <StaggerItem>
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm px-6'>
              {/* Información personal */}
              <div className='py-6 border-b border-gray-100'>
                <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4'>
                  Información personal
                </h3>
                <div className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Nombre completo
                      </label>
                      <input
                        type='text'
                        name='name'
                        value={profile.name}
                        onChange={handleChange}
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Correo Electrónico
                      </label>
                      <input
                        type='email'
                        value={profile.email}
                        disabled
                        className='w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed'
                      />
                      <p className='text-xs text-gray-400 mt-1'>
                        El correo no se puede cambiar
                      </p>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Teléfono
                      </label>
                      <input
                        type='tel'
                        name='phone'
                        value={profile.phone || ""}
                        onChange={handleChange}
                        placeholder='+51 999 999 999'
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Cargo / Puesto
                      </label>
                      <input
                        type='text'
                        name='job_title'
                        value={profile.job_title || ""}
                        onChange={handleChange}
                        placeholder='Ej: Project Manager'
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
                      />
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Biografía
                    </label>
                    <textarea
                      name='bio'
                      value={profile.bio || ""}
                      onChange={handleChange}
                      rows='3'
                      maxLength={500}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none'
                      placeholder='Cuéntanos sobre ti...'
                    />
                    <p className='text-xs text-gray-400 mt-1 text-right'>
                      {(profile.bio || "").length}/500
                    </p>
                  </div>
                </div>
              </div>

              {/* Preferencias */}
              <div className='py-6'>
                <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4'>
                  Preferencias
                </h3>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between gap-4'>
                    <div>
                      <p className='font-medium text-gray-900'>Idioma</p>
                      <p className='text-sm text-gray-500'>
                        Selecciona tu idioma preferido
                      </p>
                    </div>
                    <select
                      name='language'
                      value={profile.language}
                      onChange={handleChange}
                      className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
                    >
                      <option value='es'>Español</option>
                      <option value='en'>English</option>
                      <option value='fr'>Français</option>
                      <option value='pt'>Português</option>
                    </select>
                  </div>

                  <div className='flex items-center justify-between gap-4'>
                    <div>
                      <p className='font-medium text-gray-900'>Zona Horaria</p>
                      <p className='text-sm text-gray-500'>
                        Configura tu zona horaria
                      </p>
                    </div>
                    <select
                      name='timezone'
                      value={profile.timezone}
                      onChange={handleChange}
                      className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none'
                    >
                      <option value='America/Lima'>GMT-5 (Lima)</option>
                      <option value='America/Mexico_City'>
                        GMT-6 (México)
                      </option>
                      <option value='America/Bogota'>GMT-5 (Bogotá)</option>
                      <option value='America/Buenos_Aires'>
                        GMT-3 (Buenos Aires)
                      </option>
                      <option value='Europe/Madrid'>GMT+1 (Madrid)</option>
                      <option value='America/New_York'>
                        GMT-5 (New York)
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* Acción de guardado unificada */}
          <StaggerItem>
            <div className='flex justify-end'>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveProfile}
                disabled={saving}
                className='flex items-center gap-2 px-5 py-2 bg-linear-to-r from-brand-600 to-accent-600 text-white rounded-lg shadow-sm hover:shadow-md hover:shadow-brand-600/20 transition disabled:opacity-50'
              >
                {saving ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Save className='w-4 h-4' />
                )}
                Guardar Cambios
              </motion.button>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </Layout>
  );
};

export default Settings;

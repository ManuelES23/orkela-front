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
    )}&background=6366f1&color=fff&size=80`;
  };

  if (loading) {
    return (
      <Layout
        title='Configuración'
        subtitle='Administra las preferencias de tu cuenta'
      >
        <div className='flex items-center justify-center py-20'>
          <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title='Configuración'
      subtitle='Administra las preferencias de tu cuenta'
    >
      <div className='max-w-4xl'>
        {/* Contenido de configuración */}
        <StaggerContainer className='space-y-6'>
          {/* Información del perfil */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -4 }}
              className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'
            >
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                Información Personal
              </h2>

              <div className='space-y-5'>
                {/* Avatar */}
                <div className='flex items-center gap-4'>
                  <div className='relative'>
                    <img
                      src={getAvatarUrl()}
                      alt='Avatar'
                      className='w-20 h-20 rounded-full object-cover border-2 border-gray-100'
                    />
                    {uploadingAvatar && (
                      <div className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full'>
                        <Loader2 className='w-6 h-6 text-white animate-spin' />
                      </div>
                    )}
                  </div>
                  <div className='space-y-2'>
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
                      className='flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50'
                    >
                      <Camera className='w-4 h-4' />
                      Cambiar Foto
                    </button>
                    {profile.avatar && (
                      <button
                        onClick={handleDeleteAvatar}
                        disabled={uploadingAvatar}
                        className='flex items-center gap-2 px-4 py-2 text-red-600 text-sm hover:bg-red-50 rounded-lg transition disabled:opacity-50'
                      >
                        <Trash2 className='w-4 h-4' />
                        Eliminar
                      </button>
                    )}
                    <p className='text-xs text-gray-500'>
                      JPG, PNG, GIF o WebP. Máx. 2MB
                    </p>
                  </div>
                </div>

                {/* Formulario */}
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
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
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
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
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
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
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
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none'
                    placeholder='Cuéntanos sobre ti...'
                  />
                  <p className='text-xs text-gray-400 mt-1 text-right'>
                    {(profile.bio || "").length}/500
                  </p>
                </div>
              </div>

              <div className='flex gap-3 mt-6 pt-4 border-t border-gray-100'>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className='flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50'
                >
                  {saving ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Save className='w-4 h-4' />
                  )}
                  Guardar Cambios
                </motion.button>
              </div>
            </motion.div>
          </StaggerItem>

          {/* Preferencias */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -4 }}
              className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'
            >
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                Preferencias
              </h2>

              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
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
                    className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
                  >
                    <option value='es'>Español</option>
                    <option value='en'>English</option>
                    <option value='fr'>Français</option>
                    <option value='pt'>Português</option>
                  </select>
                </div>

                <div className='flex items-center justify-between'>
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
                    className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'
                  >
                    <option value='America/Lima'>GMT-5 (Lima)</option>
                    <option value='America/Mexico_City'>GMT-6 (México)</option>
                    <option value='America/Bogota'>GMT-5 (Bogotá)</option>
                    <option value='America/Buenos_Aires'>
                      GMT-3 (Buenos Aires)
                    </option>
                    <option value='Europe/Madrid'>GMT+1 (Madrid)</option>
                    <option value='America/New_York'>GMT-5 (New York)</option>
                  </select>
                </div>
              </div>

              <div className='flex gap-3 mt-6 pt-4 border-t border-gray-100'>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className='flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50'
                >
                  {saving ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Save className='w-4 h-4' />
                  )}
                  Guardar Preferencias
                </motion.button>
              </div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </Layout>
  );
};

export default Settings;

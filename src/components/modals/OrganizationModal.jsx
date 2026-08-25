import { useState, useEffect, useRef } from "react";
import Modal from "../ui/Modal";
import { useNotification } from "../../context/NotificationContext";
import { getAssetUrl } from "../../utils/assetUrl";
import { useAuth } from "../../context/AuthContext";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Users,
  Loader2,
  CreditCard,
  AlertCircle,
  Camera,
  Trash2,
  Upload,
} from "lucide-react";
import { organizationsAPI } from "../../utils/api";

const OrganizationModal = ({
  isOpen,
  onClose,
  organization = null,
  onSuccess,
}) => {
  const { success, error: showError } = useNotification();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const fileInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    industry: "",
    size: "",
    plan: "free",
  });

  const isSystemAdmin = user?.isSystemAdmin;
  const isCreating = !organization;

  useEffect(() => {
    const initializeModal = async () => {
      if (!isOpen) {
        setInitializing(true);
        return;
      }

      try {
        setInitializing(true);

        // Establecer formData
        if (organization) {
          setFormData({
            name: organization.name || "",
            description: organization.description || "",
            website: organization.website || "",
            email: organization.email || "",
            phone: organization.phone || "",
            address: organization.address || "",
            city: organization.city || "",
            country: organization.country || "",
            industry: organization.industry || "",
            size: organization.size || "",
            plan: organization.plan || "free",
          });
          setLogoPreview(organization.logo || null);
        } else {
          setFormData({
            name: "",
            description: "",
            website: "",
            email: "",
            phone: "",
            address: "",
            city: "",
            country: "",
            industry: "",
            size: "",
            plan: "free",
          });
          setLogoPreview(null);
        }

        // TODO LISTO
        setInitializing(false);
      } catch (err) {
        console.error("Error initializing modal:", err);
        setInitializing(false);
      }
    };

    initializeModal();
  }, [isOpen, organization]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar selección de archivo de logo
  const handleLogoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/gif",
      "image/svg+xml",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      showError("Tipo de archivo no válido. Use JPG, PNG, GIF, SVG o WebP");
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showError("El archivo es demasiado grande. Máximo 2MB");
      return;
    }

    // Si estamos editando una organización existente, subir inmediatamente
    if (organization?.id) {
      setUploadingLogo(true);
      try {
        const result = await organizationsAPI.uploadLogo(organization.id, file);
        setLogoPreview(result.logo);
        success("Logo actualizado exitosamente");
      } catch (err) {
        showError(err.message || "Error al subir el logo");
      } finally {
        setUploadingLogo(false);
      }
    } else {
      // Si estamos creando, solo mostrar preview (se subirá después de crear)
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Eliminar logo
  const handleDeleteLogo = async () => {
    if (organization?.id && organization.logo) {
      setUploadingLogo(true);
      try {
        await organizationsAPI.deleteLogo(organization.id);
        setLogoPreview(null);
        success("Logo eliminado exitosamente");
      } catch (err) {
        showError(err.message || "Error al eliminar el logo");
      } finally {
        setUploadingLogo(false);
      }
    } else {
      setLogoPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (organization) {
        await organizationsAPI.update(organization.id, formData);
        success("Organización actualizada exitosamente");
      } else {
        // Crear organización
        const newOrg = await organizationsAPI.create(formData);
        success("Organización creada exitosamente");

        // Si hay un logo en preview (base64), subirlo después de crear
        if (logoPreview && logoPreview.startsWith("data:") && newOrg.id) {
          try {
            // Convertir base64 a File
            const response = await fetch(logoPreview);
            const blob = await response.blob();
            const file = new File([blob], "logo.png", { type: blob.type });
            await organizationsAPI.uploadLogo(newOrg.id, file);
          } catch (logoErr) {
            console.error("Error al subir logo:", logoErr);
            // No mostrar error, la organización ya se creó
          }
        }
      }
      onSuccess?.();
    } catch (err) {
      showError(err.message || "Error al guardar la organización");
    } finally {
      setLoading(false);
    }
  };

  const industries = [
    "Tecnología",
    "Finanzas",
    "Salud",
    "Educación",
    "Retail",
    "Manufactura",
    "Servicios Profesionales",
    "Marketing & Publicidad",
    "Construcción",
    "Transporte & Logística",
    "Otro",
  ];

  const sizes = [
    { value: "1-10", label: "1-10 empleados" },
    { value: "11-50", label: "11-50 empleados" },
    { value: "51-200", label: "51-200 empleados" },
    { value: "201-500", label: "201-500 empleados" },
    { value: "500+", label: "Más de 500 empleados" },
  ];

  const plans = [
    { value: "free", label: "Gratis (5 miembros)" },
    { value: "starter", label: "Starter (15 miembros)" },
    { value: "professional", label: "Professional (50 miembros)" },
    { value: "enterprise", label: "Enterprise (Ilimitado)" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={organization ? "Editar Organización" : "Nueva Organización"}
      size='md'
    >
      {initializing ? (
        <div className='flex flex-col items-center justify-center py-12'>
          <Loader2 className='w-10 h-10 text-brand-600 animate-spin mb-4' />
          <p className='text-gray-600 font-medium'>Cargando datos...</p>
          <p className='text-gray-400 text-sm mt-1'>Preparando el formulario</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='space-y-5'>
          {/* Aviso para SystemAdmins al crear */}
          {isSystemAdmin && isCreating && (
            <div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
              <div className='flex items-start gap-3'>
                <AlertCircle className='w-5 h-5 text-blue-600 mt-0.5' />
                <div>
                  <p className='text-sm font-medium text-blue-800'>
                    La organización se creará sin propietario
                  </p>
                  <p className='mt-1 text-xs text-blue-600'>
                    Después de crear la organización, podrás asignar un usuario
                    como administrador desde el listado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Plan - Solo para SystemAdmins */}
          {isSystemAdmin && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <CreditCard className='inline w-4 h-4 mr-1' />
                Plan
              </label>
              <select
                name='plan'
                value={formData.plan}
                onChange={handleChange}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white'
              >
                {plans.map((plan) => (
                  <option key={plan.value} value={plan.value}>
                    {plan.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Logo */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Logo de la organización
            </label>
            <div className='flex items-center gap-4'>
              {/* Preview del logo */}
              <div className='relative'>
                <div className='w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50'>
                  {uploadingLogo ? (
                    <Loader2 className='w-8 h-8 text-gray-400 animate-spin' />
                  ) : logoPreview ? (
                    <img
                      src={getAssetUrl(logoPreview)}
                      alt='Logo preview'
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <Building2 className='w-8 h-8 text-gray-400' />
                  )}
                </div>
                {logoPreview && !uploadingLogo && (
                  <button
                    type='button'
                    onClick={handleDeleteLogo}
                    className='absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors'
                    title='Eliminar logo'
                  >
                    <Trash2 className='w-3 h-3' />
                  </button>
                )}
              </div>

              {/* Botones de acción */}
              <div className='flex-1'>
                <input
                  type='file'
                  ref={fileInputRef}
                  onChange={handleLogoSelect}
                  accept='image/jpeg,image/png,image/jpg,image/gif,image/svg+xml,image/webp'
                  className='hidden'
                />
                <button
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      Subiendo...
                    </>
                  ) : logoPreview ? (
                    <>
                      <Camera className='w-4 h-4' />
                      Cambiar logo
                    </>
                  ) : (
                    <>
                      <Upload className='w-4 h-4' />
                      Subir logo
                    </>
                  )}
                </button>
                <p className='mt-1 text-xs text-gray-500'>
                  JPG, PNG, GIF, SVG o WebP. Máximo 2MB.
                </p>
                {!organization && logoPreview && (
                  <p className='mt-1 text-xs text-amber-600'>
                    El logo se guardará después de crear la organización.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Nombre de la organización *
            </label>
            <div className='relative'>
              <Building2 className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                name='name'
                value={formData.name}
                onChange={handleChange}
                required
                className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all'
                placeholder='Ej: Mi Empresa S.A.'
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Descripción
            </label>
            <textarea
              name='description'
              value={formData.description}
              onChange={handleChange}
              rows='3'
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none'
              placeholder='Describe brevemente tu organización...'
            />
          </div>

          {/* Website y Email */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Sitio web
              </label>
              <div className='relative'>
                <Globe className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='url'
                  name='website'
                  value={formData.website}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
                  placeholder='https://...'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Email de contacto
              </label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
                  placeholder='contacto@empresa.com'
                />
              </div>
            </div>
          </div>

          {/* Teléfono y Dirección */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Teléfono
              </label>
              <div className='relative'>
                <Phone className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='tel'
                  name='phone'
                  value={formData.phone}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
                  placeholder='+34 612 345 678'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Dirección
              </label>
              <div className='relative'>
                <MapPin className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <input
                  type='text'
                  name='address'
                  value={formData.address}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
                  placeholder='Calle Principal 123'
                />
              </div>
            </div>
          </div>

          {/* Ciudad y País */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Ciudad
              </label>
              <input
                type='text'
                name='city'
                value={formData.city}
                onChange={handleChange}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
                placeholder='Madrid'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                País
              </label>
              <input
                type='text'
                name='country'
                value={formData.country}
                onChange={handleChange}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none'
                placeholder='España'
              />
            </div>
          </div>

          {/* Industria y Tamaño */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Industria
              </label>
              <div className='relative'>
                <Briefcase className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <select
                  name='industry'
                  value={formData.industry}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none bg-white'
                >
                  <option value=''>Seleccionar...</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Tamaño
              </label>
              <div className='relative'>
                <Users className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                <select
                  name='size'
                  value={formData.size}
                  onChange={handleChange}
                  className='w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none bg-white'
                >
                  <option value=''>Seleccionar...</option>
                  {sizes.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className='flex gap-3 pt-4'>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              {loading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  Guardando...
                </>
              ) : organization ? (
                "Guardar Cambios"
              ) : (
                "Crear Organización"
              )}
            </button>
            <button
              type='button'
              onClick={onClose}
              disabled={loading}
              className='px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50'
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default OrganizationModal;

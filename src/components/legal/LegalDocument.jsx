import { Link } from "react-router-dom";

// Correo al que se dirigen las solicitudes sobre datos personales y los
// términos. Es el mismo que figura como contacto en la pantalla de
// consentimiento de Google.
export const LEGAL_CONTACT_EMAIL = "j.mansolesc.223@gmail.com";
export const LEGAL_UPDATED_AT = "17 de septiembre de 2026";

const OTHER_DOCUMENT = {
  "/privacidad": { to: "/terminos", label: "Términos del servicio" },
  "/terminos": { to: "/privacidad", label: "Política de privacidad" },
};

/**
 * Layout de las páginas legales públicas. Son documentos para leer, así que
 * van sin animaciones: cabecera con el isotipo, título, fecha de vigencia y
 * secciones con ancho de lectura cómodo.
 */
const LegalDocument = ({ path, title, intro, sections }) => {
  const other = OTHER_DOCUMENT[path];

  return (
    <div className='min-h-screen w-full bg-[#f7f5fb] dark:bg-night-950 px-4 sm:px-6 py-10 sm:py-14'>
      <div className='mx-auto max-w-3xl'>
        <Link to='/login' className='inline-flex items-center gap-2.5 mb-10'>
          <img src='/img/isotipo_orkela.png' alt='' className='w-9 h-9 object-contain' />
          <span className='font-extrabold text-xl text-brand-700 dark:text-brand-300'>Orkela</span>
        </Link>

        <article className='bg-white dark:bg-night-900 rounded-2xl border border-gray-100 dark:border-night-700 shadow-sm px-6 py-8 sm:px-10 sm:py-10'>
          <header className='mb-8 pb-6 border-b border-gray-100 dark:border-night-700'>
            <h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-night-50 text-balance'>
              {title}
            </h1>
            <p className='mt-2 text-sm text-gray-500 dark:text-night-400'>
              Última actualización: {LEGAL_UPDATED_AT}
            </p>
            {intro && (
              <p className='mt-5 text-base leading-relaxed text-gray-700 dark:text-night-300'>{intro}</p>
            )}
          </header>

          <div className='space-y-8'>
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className='text-lg font-bold text-gray-900 dark:text-night-50 mb-3'>{section.title}</h2>
                <div className='space-y-3 text-[15px] leading-relaxed text-gray-700 dark:text-night-300'>
                  {section.paragraphs?.map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                  {section.items && (
                    <ul className='list-disc pl-5 space-y-1.5 marker:text-brand-500'>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <p className='mt-10 pt-6 border-t border-gray-100 dark:border-night-700 text-sm text-gray-600 dark:text-night-400'>
            ¿Dudas? Escríbenos a{" "}
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className='font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
            .
          </p>
        </article>

        <nav className='mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm'>
          {other && (
            <Link
              to={other.to}
              className='font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300'
            >
              {other.label}
            </Link>
          )}
          <Link to='/login' className='text-gray-500 hover:text-gray-700 dark:text-night-400 dark:hover:text-night-200'>
            Volver a Orkela
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default LegalDocument;

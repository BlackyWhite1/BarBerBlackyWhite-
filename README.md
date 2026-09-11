# BARBER BLACKYWHITE 💈🖤🤍

## Versión comercial V2

Sistema web de reservas online para Barber Blackywhite, Puerto de La Libertad, El Salvador.

### Incluye
- Página pública responsive y mobile-first.
- Servicios y precios cargados desde Supabase.
- Selección de barbero, fecha y horarios minuto a minuto.
- Bloqueo de horarios ocupados por barbero.
- Reserva online mediante RPC segura.
- Registro/reutilización de clientes por teléfono.
- Mensaje de WhatsApp preparado automáticamente, **sin envío automático**.
- Panel administrativo protegido con Supabase Auth.
- Control de permisos mediante `admin_users`.
- Dashboard con citas del día, pendientes, confirmadas e ingresos.
- Agenda de próximas citas.
- Filtros por fecha, barbero y estado.
- Búsqueda de citas y clientes.
- Historial de citas por cliente.
- Contacto directo con clientes mediante WhatsApp.
- Estadísticas por barbero y servicio.
- Alta y edición de barberos.
- Alta y edición de servicios, precios, duración y estado.
- Gestión de estados de citas.
- Galería preparada para fotografías reales.
- Diseño administrativo responsive para computadora, tablet y teléfono.

## Archivos principales

- `index.html` → página pública.
- `admin.html` → panel administrativo.
- `js/app.js` → reservas públicas.
- `js/admin.js` → panel administrativo.
- `js/supabase.js` → conexión de Supabase.
- `css/styles.css` → diseño público.
- `css/admin.css` → diseño del panel.
- `SUPABASE-PASO-7.sql` → funciones de reservas y disponibilidad.
- `SUPABASE-PASO-8-ADMIN.sql` → configuración administrativa anterior.
- `SUPABASE-PASO-9-SEGURIDAD-Y-CRUD.sql` → seguridad del panel y edición de barberos/servicios.

## Configuración Supabase

### Si ya tienes funcionando el PASO 7 y el panel anterior
No borres las tablas ni ejecutes SQL de instalación desde cero.

1. Abre Supabase → Authentication → Users.
2. Verifica que exista el usuario administrador.
3. Abre `SUPABASE-PASO-9-SEGURIDAD-Y-CRUD.sql`.
4. Reemplaza `TU_CORREO_ADMIN` por el correo exacto del usuario administrador.
5. Ejecuta el SQL completo.
6. Abre `admin.html` con Live Server.
7. Inicia sesión.

### Importante
El PASO 9 restringe el panel a usuarios registrados en `admin_users`. Si un usuario de Supabase no está en esa tabla, no podrá entrar al panel.

La página pública mantiene el acceso de lectura únicamente a barberos y servicios activos, mientras que las citas y clientes permanecen protegidos.

## WhatsApp

La reserva guarda primero la cita en Supabase. Después abre WhatsApp con un mensaje preparado para el número de la barbería.

**WhatsApp NO se envía automáticamente.** La persona debe presionar el botón de enviar en WhatsApp.

## Uso local

1. Descomprime el ZIP.
2. Abre la carpeta en Visual Studio Code.
3. Instala/usa Live Server.
4. Abre `index.html` con Live Server.
5. Para administración abre `admin.html`.

## Pendiente para una versión 100% personalizada

- Fotografías reales del local, cortes y barberos.
- Nombres/fotos definitivos de los 4 barberos si cambian los datos actuales.
- Enlaces exactos de Facebook, Instagram y TikTok.
- Dirección exacta para el mapa.
- Horarios reales de atención si cambian de 09:00–12:00 y 13:00–18:00.
- Eventual almacenamiento de galería en Supabase Storage.
- Opcional: cuentas individuales para cada barbero con permisos separados.

## Recomendación

Antes de modificar las funciones de reserva del PASO 7, realiza una copia de seguridad del proyecto. Esa lógica ya fue probada para evitar cruces de horarios entre barberos.


## Estado de entrega

Esta versión incluye el calendario administrativo completo con navegación mensual,
selección de día, conteo de citas, indicadores por estado y listado de las citas
del día, con diseño responsive para móvil y computadora.

Los botones de Instagram, TikTok y Facebook de la página pública están configurados
con los enlaces proporcionados para Barber Blackywhite.

El proyecto queda listo para la etapa de pruebas finales y entrega, quedando como
personalizaciones opcionales las fotografías reales, dirección exacta y cualquier
cambio futuro de horarios o datos del negocio.

## Inicio de sesión administrativo

El login ahora muestra claramente los errores de autenticación de Supabase,
incluyendo credenciales incorrectas, correo no confirmado y ausencia de sesión.
No se debe ejecutar SQL adicional para probar el login.


### Corrección importante del login
El formulario de administración ahora queda conectado antes de inicializar Bootstrap
o cargar la sesión existente. Así, si Bootstrap o alguna dependencia externa falla,
el botón de inicio de sesión no provoca una recarga silenciosa de la página.
Los errores de Supabase se muestran directamente debajo del formulario.

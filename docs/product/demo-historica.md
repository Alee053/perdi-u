# Especificación histórica de la demo frontend

Referencia histórica extraída de las páginas 16-23 del informe. No es una instrucción de implementación actual: la restricción «solo frontend» corresponde a aquella demo. Para el producto persistido, seguir los contratos, código e issues vigentes.

Se conservaron el objetivo, las condiciones visuales y las historias repetidas de ese apartado, sin las reflexiones ni notas de autoría que lo precedían. Esta segunda versión usa «estado» para Perdido/Encontrado y termina en US-17; se mantiene como documento histórico sin corregirla en silencio. El modelo actual separa `type` y `state`; el informe principal contiene US-01 a US-18.

> ## OBJETIVO
>
> Desarrolla una demo frontend completa, clara y adaptable a celular y computadora. La aplicación debe abrir directamente en el dashboard, no en una pantalla de bienvenida, onboarding o registro. El menú principal debe ser una barra lateral que permita entrar a apartados distintos. Cada apartado debe mostrar su propia vista, no una página larga con todo el contenido.
>
> ## ESTRUCTURA DE NAVEGACIÓN
>
> Incluye los apartados Resumen, Explorar reportes, Mapa, Publicar reporte, Mis reportes, Guardados y Seguridad y privacidad.
>
> Mantén la barra lateral visible en escritorio y conviértela en un menú desplegable en móvil. Debe tener desplazamiento vertical cuando sus opciones no entren en la pantalla. No agregues un selector de “Espacio de trabajo”.
>
> ## DISEÑO Y USABILIDAD
>
> La interfaz debe estar en español, con contexto y ciudades de Bolivia. Usa un estilo cálido, moderno y confiable, apropiado para reportes de objetos y mascotas. Mantén una jerarquía visual clara, buen contraste, botones reconocibles, estados vacíos y mensajes útiles. La tipografía debe ser grande y legible. Diseña primero para móvil y adapta el layout a escritorio.
>
> Cuida la accesibilidad básica con etiquetas, foco visible y nombres accesibles para botones y controles. Evita formularios largos y filtros confusos. Prioriza que publicar y buscar sean rápidos. Distingue visualmente los reportes “Perdido”, “Encontrado” y “Resuelto”. “Resuelto” representa el cierre del caso; no lo confundas con “Encontrado”.
>
> ## ARQUITECTURA FRONTEND
>
> Mantén App.tsx como composición general y lugar para el estado compartido. Crea una página independiente para cada apartado. Separa componentes reutilizables de navegación, encabezado, tarjetas, buscador, filtros, mapa, detalle, formularios y estados vacíos. Mantén los tipos, datos de demostración y utilidades en módulos independientes. Usa componentes y tipos reutilizables; evita duplicar elementos como tarjetas, filtros o encabezados. Conserva la separación del monorepo para poder conectar un backend después.
>
> ## ALCANCE DE ESTA ETAPA
>
> Esta entrega es solo frontend. No implementes servidores, base de datos, pagos, recompensas, verificación formal de identidad ni verificación automática de propiedad. No conectes credenciales reales de Google ni expongas números reales.
>
> Para presentar los flujos, usa datos ficticios y simulaciones en memoria o almacenamiento local. Deja las integraciones futuras detrás de interfaces o servicios fáciles de reemplazar por llamadas al backend. Indica claramente qué partes son demostrativas.
>
> Puedes simular inicio de sesión, perfil y rol de administrador para que las historias se puedan recorrer en la demo. No presentes una simulación como autenticación real. El contacto puede abrir WhatsApp con un mensaje precargado usando números ficticios.
>
> ## FUNCIONALIDADES
>
> Implementa las historias de usuario completas que aparecen al final. Incluye registro e inicio de sesión de demostración; publicaciones de mascotas, objetos y documentos como perdido o encontrado; formulario de reporte con validación, fotografía y vista previa; catálogo con búsqueda por texto y filtros por ciudad, categoría y estado; mapa ilustrativo con marcadores que respeten los filtros; vista de detalle con una URL que se pueda abrir directamente; guardar reportes; gestionar los propios y marcarlos como resueltos con confirmación; contacto seguro por WhatsApp sujeto al estado de sesión de demostración; y vistas de administración y moderación simuladas.
>
> Usa datos de ejemplo coherentes con Bolivia. Ordena las publicaciones de más recientes a más antiguas. El catálogo no debe mostrar reportes resueltos, pero estos deben seguir accesibles para su autor en “Mis reportes”.
>
> ## PUNTOS PENDIENTES DE DEFINICIÓN
>
> La duración de una publicación activa, la política final para cerrar casos encontrados y la visibilidad del contacto siguen siendo decisiones de producto. No conviertas esas decisiones en reglas permanentes sin señalarlo. Para la demo, usa valores configurables y explica qué valor provisional elegiste.
>
> ## ENTREGA
>
> Implementa el flujo frontend, mantén el proyecto ejecutable con pnpm y documenta cómo iniciar la demo. Comprueba que la aplicación compile. Al terminar, resume qué quedó funcional, qué es simulado y qué requiere backend o decisiones de producto.
>
> Las historias de usuario siguientes son la fuente de aceptación. No las resumas ni omitas criterios.
>
> ## HISTORIAS DE USUARIO DEL ENTREGABLE 1
>
> ## REGISTRARSE
>
> ### US-01: Registrarse con Google
>
> Como visitante nuevo, quiero crear mi cuenta con mi cuenta de Google, sin llenar formularios largos.
>
> Dado que no tengo cuenta, cuando presiono “Continuar con Google” y autorizo el acceso, entonces se crea mi cuenta con mi nombre, correo y foto de Google.
>
> Dado que cancelo la autorización, cuando vuelvo a la plataforma, entonces veo un mensaje claro y no se crea ninguna cuenta.
>
> La cuenta queda asociada a un único correo (sin duplicados).
>
> ### US-02: Iniciar sesión con Google
>
> Como usuario registrado, quiero iniciar sesión con Google, para acceder a mis reportes de forma rápida y segura.
>
> Dado que ya tengo cuenta, cuando inicio sesión con Google, entonces entro a la plataforma y veo mi nombre en la barra superior.
>
> Dado que mi sesión está activa, cuando recargo la página, entonces sigo autenticado.
>
> Si Google no responde, se muestra un error con opción a reintentar.
>
> ### US-03: Cerrar sesión
>
> Como usuario autenticado, quiero cerrar sesión, para proteger mi cuenta en dispositivos compartidos.
>
> Cuando presiono “Cerrar sesión”, entonces mi sesión se invalida y vuelvo a la pantalla de inicio.
>
> Dado que cerré sesión, cuando uso el botón “atrás” del navegador, entonces no puedo ver pantallas privadas.
>
> ### US-04: Ver mi perfil
>
> Como usuario autenticado, quiero ver mi perfil, para confirmar mis datos y revisar mis reportes publicados.
>
> Cuando entro a “Mi perfil”, entonces veo mi nombre, foto, correo y la lista de mis reportes con su estado (activo / resuelto).
>
> Solo yo puedo ver mi correo; otros usuarios no lo ven.
>
> ## PUBLICAR REPORTE
>
> ### US-05: Publicar mascota perdida
>
> Como dueño de una mascota extraviada, quiero publicar un reporte con sus datos, para que otras personas me ayuden a encontrarla.
>
> Dado que estoy autenticado, cuando completo especie, nombre, descripción, fecha de pérdida y zona, entonces el reporte se publica con estado “Perdido”.
>
> Los campos obligatorios están marcados y muestran error si faltan.
>
> Cuando se publica, entonces aparece de inmediato en las búsquedas y en el mapa.
>
> ### US-06: Publicar objeto perdido
>
> Como persona que perdió un objeto de valor, quiero publicar un reporte describiéndolo, para que quien lo encuentre pueda contactarme.
>
> Cuando completo tipo de objeto, descripción, fecha y zona, entonces el reporte se publica con estado “Perdido” y categoría “Objeto”.
>
> La descripción tiene un mínimo de 20 caracteres.
>
> El formulario advierte no publicar datos sensibles (números de documento o de cuenta).
>
> ### US-07: Publicar un hallazgo
>
> Como persona que encontró una mascota u objeto, quiero publicar un hallazgo, para que su dueño pueda reclamarlo.
>
> Cuando selecciono “Encontré algo” y completo categoría, descripción, fecha y zona, entonces el reporte se publica con estado “Encontrado”.
>
> Puedo elegir entre mascota y objeto en el mismo formulario.
>
> ### US-08: Subir foto al reporte
>
> Como usuario que publica un reporte, quiero adjuntar fotos, para que sea más fácil reconocer la mascota u objeto.
>
> Acepto hasta 3 imágenes en JPG o PNG, de máximo 5 MB cada una.
>
> Dado que subo un archivo no válido o muy pesado, cuando intento adjuntarlo, entonces veo un mensaje que explica el motivo.
>
> Cuando subo las fotos, entonces veo una vista previa y puedo quitarlas antes de publicar.
>
> ### US-09: Marcar ubicación en el mapa
>
> Como usuario que publica un reporte, quiero marcar en un mapa dónde se perdió o encontró, para que la búsqueda sea geolocalizada.
>
> Cuando toco un punto del mapa, entonces se guarda la coordenada y se muestra la zona o dirección aproximada.
>
> Dado que doy permiso de ubicación, cuando abro el mapa, entonces este se centra en mi posición actual.
>
> No se puede publicar un reporte sin ubicación.
>
> ## BUSCAR REPORTES
>
> ### US-10: Buscar por nombre o descripción
>
> Como visitante o usuario, quiero buscar por palabras clave, para encontrar rápido reportes relacionados con mi caso.
>
> Cuando escribo un término y busco, entonces veo los reportes cuyo título o descripción lo contienen, del más reciente al más antiguo.
>
> Si no hay resultados, veo un mensaje con sugerencia de publicar un reporte.
>
> La búsqueda no distingue mayúsculas ni tildes.
>
> ### US-11: Filtrar por tipo (perdido / encontrado)
>
> Como usuario, quiero filtrar entre perdidos y encontrados, para ver solo lo que me interesa.
>
> Cuando elijo “Perdidos”, “Encontrados” o “Todos”, entonces la lista se actualiza sin recargar la página.
>
> El filtro se combina con la búsqueda por texto.
>
> ### US-12: Filtrar por categoría (mascota / objeto)
>
> Como usuario, quiero filtrar por mascota u objeto, para reducir los resultados a mi caso.
>
> Cuando selecciono una categoría, entonces solo veo reportes de esa categoría.
>
> Puedo combinar este filtro con el de tipo y con el texto.
>
> Hay un botón “Limpiar filtros” que restaura la lista completa.
>
> ### US-13: Ver reportes en un mapa
>
> Como usuario, quiero ver los reportes como puntos en un mapa, para identificar los que ocurrieron cerca de mí.
>
> Cada punto distingue visualmente perdido y encontrado.
>
> Cuando toco un punto, entonces veo una tarjeta con foto, título y enlace al reporte.
>
> El mapa respeta los filtros activos.
>
> ## VER REPORTE
>
> ### US-14: Ver vista básica de un reporte
>
> Como usuario, quiero abrir un reporte y ver su información esencial, para decidir si coincide con lo que busco.
>
> Veo foto principal, título, tipo (perdido / encontrado), categoría, zona, fecha y estado.
>
> Si no tiene foto, aparece una imagen genérica según su categoría.
>
> El reporte tiene una URL propia que se puede abrir directamente.
>
> ## CONTACTAR Y COORDINAR
>
> ### US-15: Contactar al publicante por WhatsApp
>
> Como usuario que vio un reporte, quiero contactar a quien lo publicó por WhatsApp, para coordinar la devolución.
>
> Dado que estoy autenticado, cuando presiono “Contactar por WhatsApp”, entonces se abre un chat con mensaje precargado que menciona el reporte.
>
> Dado que no he iniciado sesión, cuando presiono el botón, entonces se me pide iniciar sesión antes de ver el contacto.
>
> El número solo se muestra a usuarios autenticados, para reducir el spam.
>
> ## CERRAR CASO
>
> ### US-16: Marcar un reporte como resuelto
>
> Como autor de un reporte, quiero marcarlo como resuelto, para que nadie siga buscando algo que ya apareció.
>
> Solo el autor puede ver el botón “Marcar como resuelto”.
>
> Cuando lo confirmo, entonces el estado cambia a “Resuelto”, sale de las búsquedas y del mapa, y sigue visible en mi perfil.
>
> Pide confirmación antes de aplicar el cambio.
>
> ## MODERAR PLATAFORMA
>
> ### US-17: Iniciar sesión como administrador
>
> Como administrador, quiero acceder con un rol privilegiado, para moderar el contenido de la plataforma. Dado que mi cuenta tiene rol “admin”, cuando inicio sesión, entonces veo una opción de administración

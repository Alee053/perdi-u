# Informe de producto de PerdiU

Transcripción estructurada de las páginas 2-15 del informe original, con la tabla anónima de la página 27. Se conservaron el contenido de las 18 historias y todos sus criterios; se normalizaron saltos de línea, encabezados y listas.

Es una referencia del planteamiento inicial. El alcance vigente de cada entrega está en sus issues de GitHub; este informe no implica que todas las funciones estén implementadas ni pertenezcan al Sprint 1. Véase el [índice y las diferencias conocidas](README.md).

Se omitieron la portada, las imágenes de pruebas de usuario y las notas sobre herramientas de autoría. El apartado «Alcance principal» aparece sin desarrollo en el original y se conserva así. La especificación histórica de la demo se encuentra [por separado](demo-historica.md).

## ¿Por qué estamos aquí?

Actualmente, cuando una persona pierde o encuentra una mascota, objeto o documento en Bolivia, normalmente recurre a publicaciones en Facebook, grupos de WhatsApp u otras redes sociales.

El problema es que estas publicaciones se encuentran dispersas, pueden perderse rápidamente entre otro contenido y no existe una forma sencilla de filtrar la información según lo que una persona está buscando.

PerdiU nace con la intención de centralizar estos reportes en una sola plataforma, donde las personas puedan publicar algo perdido o encontrado, buscar publicaciones de manera organizada y ponerse en contacto con quien realizó el reporte.

Con este proyecto buscamos comprobar si una plataforma especializada puede facilitar el proceso de búsqueda y devolución de mascotas, objetos y documentos perdidos en Bolivia.

## Elevator Pitch

Para: Personas en Bolivia que han perdido o encontrado una mascota, objeto o documento.

Que: Necesitan un medio rápido, sencillo y centralizado para publicar, buscar y coordinar la devolución de algo perdido o encontrado.

El: PerdiU.

Es una: Plataforma digital de objetos perdidos y encontrados.

Que: Permite reportar pérdidas y hallazgos mediante fotografías, descripciones, categorías y ubicación, además de buscar publicaciones y contactar directamente con quien realizó el reporte.

A diferencia de: Las publicaciones dispersas en redes sociales, grupos de WhatsApp o plataformas enfocadas solamente en un tipo de pérdida.

Nuestro producto: Centraliza en una sola plataforma la búsqueda de mascotas, objetos y documentos perdidos o encontrados, de una manera organizada y adaptada al contexto boliviano.

## Caja de producto

Nombre del producto: PerdiU

Frase principal / Slogan: “Encuentra lo que perdiste. Ayuda a devolver lo que encontraste.”

### ¿Qué es el producto?

PerdiU es una plataforma digital de objetos perdidos y encontrados que permite publicar, buscar y consultar reportes de mascotas, objetos y documentos en Bolivia.

La plataforma busca reunir en un solo lugar información que normalmente se encuentra dispersa en redes sociales, grupos de WhatsApp y otros medios.

### Público objetivo

Personas en Bolivia que hayan perdido o encontrado una mascota, objeto o documento y necesiten una forma sencilla de publicar información, buscar posibles coincidencias o ponerse en contacto con otra persona.

### Problema que busca resolver

Actualmente, muchas personas utilizan Facebook, WhatsApp u otras redes sociales para publicar objetos o mascotas perdidas y encontradas.

El problema es que estas publicaciones se encuentran dispersas, se mezclan con otro contenido y pueden perder visibilidad rápidamente.

PerdiU busca centralizar estos reportes en una sola plataforma y organizarlos para facilitar su búsqueda.

### Funcionalidades principales

- Publicar reportes de objetos, documentos o mascotas perdidas o encontradas.
- Adjuntar fotografías y una descripción al reporte.
- Clasificar las publicaciones por categoría.
- Indicar la ciudad o zona donde ocurrió la pérdida o el hallazgo.
- Visualizar un catálogo de publicaciones.
- Buscar publicaciones relacionadas.
- Filtrar los reportes por ciudad, categoría y tipo.
- Consultar la información detallada de una publicación.
- Contactar al publicante mediante WhatsApp.
- Marcar una publicación como resuelta cuando el caso haya terminado.

### Ventajas del producto

- Información centralizada

- Búsqueda organizada

- Publicación sencilla

- Contacto directo

- Diferentes tipos de reportes

### Diferenciador

A diferencia de las publicaciones realizadas en redes sociales o grupos de WhatsApp, PerdiU está diseñada específicamente para organizar reportes de objetos perdidos y encontrados.

Las publicaciones pueden clasificarse por categoría, ubicación y tipo de reporte, facilitando que los usuarios encuentren información relacionada con su búsqueda.

### Mensaje final

“¿Perdiste algo? Publícalo. ¿Encontraste algo? Ayuda a devolverlo.”

## IN / OUT

### IN

Funcionalidades que sí estarán en la primera versión de PerdiU:

- Registro e inicio de sesión.
- Publicar reportes de algo perdido o encontrado.
- Categorías: Mascotas, Objetos y Documentos.
- Agregar fotografía, descripción, fecha y ubicación.
- Ver un catálogo de publicaciones.
- Buscar publicaciones.
- Filtrar por ciudad, categoría y tipo de reporte.
- Ver el detalle de una publicación.
- Contactar al publicante mediante WhatsApp.
- Ver las publicaciones propias.
- Marcar un reporte como resuelto.
- Moderación básica por parte de un administrador.

### OUT

Funcionalidades que no estarán en esta primera versión:

- Verificación de identidad mediante CI o KYC.
- Verificación de propiedad del objeto.
- Pagos dentro de la plataforma.
- Sistema de recompensas.
- Chat interno.
- Sistema de reputación.
- Matching automático con inteligencia artificial.
- Aplicación móvil nativa.

### Alcance principal

La primera versión de PerdiU se enfocará en permitir que una persona pueda:

### Unresolved (Puntos clave a definir antes de programar):

Tiempo de expiración de publicaciones: ¿Cuánto dura un anuncio activo?

Manejo de estado "Encontrado".

Visibilidad de datos de contacto: ¿Mostrar el teléfono públicamente o protegerlo mediante un formulario intermedio para evitar llamadas spam?

## Comunidad

La comunidad de PerdiU está formada por las personas y servicios que participan o se relacionan con la plataforma.

**Visitantes**. Personas que ingresan a PerdiU para buscar y visualizar publicaciones sin necesidad de tener una cuenta.

**Usuarios registrados**. Personas que pueden publicar reportes, buscar publicaciones, contactar a otros usuarios y gestionar sus propios reportes.

**Personas que perdieron algo**. Usuarios que buscan recuperar una mascota, objeto o documento perdido.

**Personas que encontraron algo**. Usuarios publican un hallazgo para ayudar a encontrar a su dueño.

**Administradores**. Encargados de moderar la plataforma y retirar publicaciones inapropiadas.

**Servicios externos**. PerdiU utiliza servicios externos como Google para el inicio de sesión, servicios de mapas para las ubicaciones y WhatsApp para facilitar el contacto entre usuarios.

## Razones de riesgo

**Interfaz complicada**. Si publicar o buscar algo requiere demasiados pasos, los usuarios podrían preferir seguir utilizando Facebook o WhatsApp.

**Competencia con redes sociales**. Facebook y WhatsApp ya son medios conocidos para publicar objetos perdidos, por lo que PerdiU debe ofrecer una forma más organizada y sencilla de encontrar información.

**Publicaciones desactualizadas**. Los usuarios podrían recuperar lo perdido y olvidar marcar su publicación como resuelta, dejando información que ya no es útil.

**Pocos usuarios al inicio**. Si existen pocas publicaciones, puede ser difícil encontrar coincidencias y los usuarios podrían considerar que la plataforma no es útil.

**Publicaciones falsas o inapropiadas**. Algunos usuarios podrían publicar información incorrecta o contenido que no corresponde, por lo que se necesita una moderación básica.

Estos dos apartados corresponden a los elementos de comunidad y riesgos solicitados dentro del Agile Inception.

## Infraestructura técnica

**Aplicación web**. PerdiU funcionará como una aplicación web adaptable a computadora y celular.

**Frontend**. Se encargará de mostrar la interfaz, formularios, publicaciones, filtros, perfil y demás pantallas con las que interactúa el usuario.

**Backend / lógica de la aplicación**. Se encargará de procesar las publicaciones, usuarios, estados de los reportes y permisos de acceso.

**Base de datos**. Permitirá almacenar la información de los usuarios y de los reportes, como descripción, categoría, fecha, ubicación y estado.

**Almacenamiento de imágenes**. Se utilizará para guardar las fotografías agregadas a los reportes.

**Autenticación con Google**. Se utilizará Google para facilitar el registro e inicio de sesión de los usuarios.

**Servicio de mapas**. Permitirá seleccionar y visualizar la ubicación aproximada donde se perdió o encontró algo.

**WhatsApp**. Se utilizará como medio externo de contacto entre los usuarios, evitando desarrollar un chat interno en esta primera versión.

**GitHub**. Se utilizará para almacenar y gestionar el código fuente del proyecto.

**Vercel**. Se utilizará para desplegar la aplicación y permitir que el prototipo pueda ser utilizado desde Internet.

## Historias de Usuario

## Registrarse e iniciar sesión

### US-01: Registrarse con Google

Como visitante nuevo, quiero crear mi cuenta utilizando mi cuenta de Google, para registrarme de forma rápida sin completar formularios largos.

**Criterios de aceptación**

- Dado que no existe una cuenta asociada a mi correo de Google, cuando selecciono "Continuar con Google" y autorizo el acceso, entonces se crea una cuenta utilizando mi nombre, correo electrónico y foto de perfil de Google.
- Dado que cancelo o rechazo la autorización de Google, cuando regreso a PerdiU, entonces se muestra un mensaje indicando que el registro no pudo completarse y no se crea ninguna cuenta.
- Dado que ya existe una cuenta asociada al mismo correo electrónico, cuando intento registrarme nuevamente con Google, entonces no se crea una cuenta duplicada y se utiliza la cuenta existente.

### US-02: Iniciar sesión con Google

Como usuario registrado, quiero iniciar sesión utilizando Google, para acceder de manera rápida y segura a mi cuenta y mis reportes.

**Criterios de aceptación**

- Dado que tengo una cuenta registrada, cuando inicio sesión correctamente con Google, entonces ingreso a la plataforma y veo mi nombre y foto de perfil en la barra superior.
- Dado que tengo una sesión válida, cuando recargo la página o vuelvo a ingresar a PerdiU, entonces permanezco autenticado.
- Dado que Google no responde o se produce un error durante la autenticación, cuando intento iniciar sesión, entonces se muestra un mensaje de error en español y una opción para reintentar.

### US-03: Cerrar sesión

Como usuario autenticado, quiero cerrar mi sesión, para proteger mi cuenta cuando utilizo un dispositivo compartido.

**Criterios de aceptación**

- Dado que tengo una sesión activa, cuando selecciono "Cerrar sesión", entonces mi sesión se invalida y soy redirigido a la pantalla de inicio.
- Dado que ya cerré sesión, cuando intento acceder nuevamente a una pantalla privada, incluso utilizando el botón "Atrás" del navegador, entonces el sistema solicita que vuelva a iniciar sesión.

### US-04: Ver mi perfil

Como usuario autenticado, quiero consultar mi perfil, para revisar mis datos personales y los reportes que he publicado.

**Criterios de aceptación**

- Dado que estoy autenticado, cuando ingreso a "Mi perfil", entonces veo mi nombre, foto, correo electrónico y mis reportes publicados.
- Dado que tengo reportes publicados, cuando consulto mi perfil, entonces cada reporte muestra al menos su título, tipo y estado Activo o Resuelto.
- Dado que mi correo electrónico es información privada, cuando otro usuario consulta información relacionada conmigo, entonces mi correo no se muestra públicamente.

## Publicar reportes

### US-05: Publicar una mascota perdida

Como dueño de una mascota extraviada, quiero publicar un reporte con información sobre ella, para que otras personas puedan ayudarme a encontrarla.

**Criterios de aceptación**

- Dado que estoy autenticado, cuando completo los datos obligatorios de la mascota, incluyendo nombre, especie, descripción, fecha de pérdida y ubicación, entonces puedo publicar el reporte.
- Dado que el reporte corresponde a una mascota perdida, cuando se publica correctamente, entonces queda registrado con tipo = Perdido, categoría = Mascota y estado = Activo.
- Dado que falta algún campo obligatorio, cuando intento publicar, entonces el sistema identifica el campo faltante y muestra un mensaje de validación.

- Dado que el reporte fue publicado correctamente, cuando finaliza el registro, entonces aparece en los resultados de búsqueda y en el mapa.

### US-06: Publicar un objeto perdido

Como persona que perdió un objeto, quiero publicar un reporte describiéndolo, para que una persona que lo encuentre pueda identificarlo y contactarme.

**Criterios de aceptación**

- Dado que estoy autenticado, cuando completo el tipo o nombre del objeto, descripción, fecha de pérdida y ubicación, entonces puedo publicar el reporte.
- Dado que el reporte corresponde a un objeto perdido, cuando se publica correctamente, entonces queda registrado con tipo = Perdido, categoría = Objeto y estado = Activo.
- Dado que escribo una descripción menor a 20 caracteres, cuando intento publicar, entonces el sistema impide la publicación y muestra la longitud mínima requerida.
- Cuando completo el formulario, entonces se muestra una advertencia indicando que no debo publicar datos sensibles como números de documento, cuentas bancarias o contraseñas.

### US-07: Publicar un hallazgo

Como persona que encontró una mascota u objeto, quiero publicar un reporte del hallazgo, para facilitar que su propietario pueda encontrarlo.

**Criterios de aceptación**

- Dado que estoy autenticado, cuando selecciono "Encontré algo", elijo la categoría y completo descripción, fecha y ubicación, entonces puedo publicar el reporte.
- Dado que estoy registrando un hallazgo, cuando se publica correctamente, entonces queda registrado con tipo = Encontrado y estado = Activo.
- Dado que selecciono la categoría del reporte, cuando utilizo el formulario, entonces puedo elegir entre Mascota y Objeto.

### US-08: Subir fotos al reporte

Como usuario que publica un reporte, quiero adjuntar fotografías, para facilitar la identificación de la mascota u objeto.

**Criterios de aceptación**

- Dado que estoy creando un reporte, cuando adjunto imágenes, entonces puedo subir hasta 3 archivos en formato JPG o PNG con un tamaño máximo de 5 MB por archivo.
- Dado que intento subir un archivo con formato no permitido, superior a 5 MB o excediendo el límite de imágenes, cuando lo selecciono, entonces el sistema rechaza el archivo e indica el motivo.
- Dado que seleccioné imágenes válidas, cuando todavía no he publicado el reporte, entonces puedo ver una vista previa y eliminar cualquiera de ellas.

### US-09: Marcar ubicación en el mapa

Como usuario que publica un reporte, quiero indicar en el mapa dónde ocurrió la pérdida o el hallazgo, para facilitar una búsqueda geolocalizada.

**Criterios de aceptación**

- Dado que estoy creando un reporte, cuando selecciono un punto del mapa, entonces el sistema registra sus coordenadas y muestra la zona o dirección aproximada correspondiente.
- Dado que autorizo el acceso a mi ubicación, cuando abro el mapa, entonces este se centra inicialmente en mi posición actual.
- Dado que no he seleccionado una ubicación, cuando intento publicar el reporte, entonces el sistema impide la publicación e indica que la ubicación es obligatoria.

## Buscar reportes

### US-10: Buscar por nombre o descripción

Como visitante o usuario registrado, quiero buscar reportes mediante palabras clave, para encontrar rápidamente publicaciones relacionadas con mi caso.

**Criterios de aceptación**

- Dado que existen reportes activos, cuando introduzco una palabra o frase en el buscador, entonces se muestran los reportes cuyo título, nombre o descripción contienen el término buscado.
- Dado que existen varios resultados, cuando se muestran, entonces aparecen ordenados del más reciente al más antiguo.
- Dado que no existen coincidencias, cuando realizo la búsqueda, entonces se muestra un mensaje indicando que no existen resultados y se ofrece la opción de publicar un reporte.
- Cuando realizo una búsqueda, entonces las diferencias entre mayúsculas, minúsculas y tildes no afectan los resultados.

### US-11: Filtrar por tipo

Como visitante o usuario registrado, quiero filtrar los reportes por Perdido o Encontrado, para consultar solamente el tipo de publicaciones que me interesa.

**Criterios de aceptación**

- Dado que estoy consultando los reportes, cuando selecciono Perdidos, Encontrados o Todos, entonces los resultados se actualizan sin recargar completamente la página.
- Dado que existe una búsqueda por texto activa, cuando selecciono un filtro de tipo, entonces ambos criterios se aplican de manera conjunta.

### US-12: Filtrar por categoría

Como visitante o usuario registrado, quiero filtrar los reportes por Mascota u Objeto, para reducir los resultados a la categoría que necesito.

**Criterios de aceptación**

- Dado que selecciono la categoría Mascota u Objeto, cuando se aplica el filtro, entonces solamente se muestran reportes pertenecientes a esa categoría.
- Dado que existen otros filtros o una búsqueda por texto, cuando selecciono una categoría, entonces todos los criterios se combinan.
- Dado que existen filtros activos, cuando selecciono "Limpiar filtros", entonces se eliminan los filtros y vuelve a mostrarse la lista completa de reportes activos.

### US-13: Ver reportes en un mapa

Como visitante o usuario registrado, quiero visualizar los reportes mediante puntos en un mapa, para identificar pérdidas o hallazgos ocurridos cerca de una zona determinada.

**Criterios de aceptación**

- Dado que existen reportes activos con ubicación, cuando abro el mapa, entonces cada reporte se representa mediante un marcador.
- Dado que los reportes pueden ser Perdidos o Encontrados, cuando aparecen en el mapa, entonces ambos tipos se diferencian visualmente.
- Dado que selecciono un marcador, cuando se abre su información, entonces veo una tarjeta con imagen, título y acceso al detalle del reporte.
- Dado que existen filtros activos, cuando consulto el mapa, entonces solamente aparecen los marcadores que cumplen esos filtros.

## Ver reporte

### US-14: Ver información de un reporte

Como visitante o usuario registrado, quiero abrir un reporte y consultar su información principal, para determinar si corresponde a la mascota u objeto que estoy buscando.

**Criterios de aceptación**

- Dado que abro un reporte válido, cuando se carga su detalle, entonces veo la fotografía principal, título, tipo, categoría, zona, fecha y estado.
- Dado que el reporte no tiene fotografías, cuando se muestra su información, entonces aparece una imagen genérica correspondiente a la categoría Mascota u Objeto.
- Dado que cada reporte posee un identificador único, cuando accedo mediante su URL, entonces puedo abrir directamente el detalle del reporte.

## Contactar y coordinar

### US-15: Contactar al publicante por WhatsApp

Como usuario que encontró un reporte relacionado con mi caso, quiero contactar al publicante mediante WhatsApp, para coordinar la devolución o recuperación de la mascota u objeto.

**Criterios de aceptación**

- Dado que estoy autenticado y el publicante tiene un número de WhatsApp registrado, cuando selecciono "Contactar por WhatsApp", entonces se abre una conversación con un mensaje precargado que hace referencia al reporte.
- Dado que no he iniciado sesión, cuando selecciono "Contactar por WhatsApp", entonces el sistema solicita que inicie sesión antes de permitirme acceder al contacto.
- Dado que el número del publicante es información privada, cuando un visitante no autenticado consulta el reporte, entonces el número no se muestra.

## Cerrar caso

### US-16: Marcar un reporte como resuelto

Como autor de un reporte, quiero marcarlo como resuelto, para indicar que la mascota u objeto ya fue recuperado y evitar que otras personas continúen buscándolo.

**Criterios de aceptación**

- Dado que soy el autor del reporte, cuando consulto su detalle, entonces puedo ver la opción "Marcar como resuelto".
- Dado que no soy el autor, cuando consulto el mismo reporte, entonces no tengo acceso a esa opción.
- Dado que selecciono "Marcar como resuelto", cuando confirmo la acción, entonces el estado del reporte cambia de Activo a Resuelto.
- Dado que el reporte está resuelto, entonces deja de aparecer en los resultados de búsqueda y en el mapa, pero continúa disponible dentro del perfil de su autor.

## Administración

### US-17: Iniciar sesión como administrador

Como administrador, quiero acceder a funciones de administración, para moderar el contenido publicado en PerdiU.

**Criterios de aceptación**

- Dado que mi cuenta posee el rol admin, cuando inicio sesión, entonces puedo visualizar y acceder a la opción de administración.
- Dado que soy un usuario sin rol de administrador, cuando utilizo la plataforma, entonces no veo las opciones administrativas.
- Dado que un usuario común intenta acceder directamente a una URL administrativa, cuando el sistema verifica sus permisos, entonces rechaza la solicitud y muestra "Acceso denegado".

### US-18: Eliminar publicaciones inapropiadas

Como administrador, quiero retirar reportes que incumplen las reglas de la plataforma, para mantener PerdiU segura y confiable.

**Criterios de aceptación**

- Dado que soy administrador, cuando intento retirar un reporte, entonces debo indicar obligatoriamente el motivo de la acción.
- Dado que confirmo la eliminación, cuando la operación finaliza correctamente, entonces el reporte deja de aparecer en búsquedas, mapa y acceso público mediante su URL.
- Dado que un reporte fue retirado, cuando se registra la acción, entonces se almacena el motivo, la fecha y el administrador responsable.
- Dado que el reporte fue retirado, cuando el autor ingresa a la plataforma, entonces recibe una notificación indicando que su publicación fue retirada y el motivo correspondiente.

## Pruebas de usuario: respuestas obtenidas

Transcripción de la tabla de la página 27. Se conservan los identificadores anónimos Usuario 1-6; las imágenes de las páginas 24-26 no se incorporan.

| Pregunta | Usuario 1 | Usuario 2 | Usuario 3 | Usuario 4 | Usuario 5 | Usuario 6 |
| --- | --- | --- | --- | --- | --- | --- |
| 1. ¿Entendió qué hacer? | Sí, entendió rápido. | Sí, casi sin ayuda. | Dudó al inicio. | Sí, fue directo a buscar. | Sí, entendió la idea. | Sí, luego de explorar. |
| 2. ¿Encontró rápido la funcionalidad? | Sí, encontró publicar. | Costó ver los filtros. | Sí, encontró la búsqueda. | Sí, encontró el mapa. | Costó encontrar su perfil. | Sí, fue rápido. |
| 3. ¿Interpretó bien los conceptos? | Sí, perdido/encontrado claro. | Dudó con «resuelto». | Sí, categorías claras. | Sí, entendió los reportes. | Confundió objeto y documento. | Sí, casi todo claro. |
| 4. ¿Qué información esperaba? | Ubicación del reporte. | Fotos y descripción. | Fecha de pérdida. | Datos para contactar. | Estado del reporte. | Zona donde ocurrió. |
| 5. ¿Qué funcionalidad pidió? | Compartir publicaciones. | Más filtros. | Notificaciones. | Buscar por ciudad. | Favoritos. | Reportar publicaciones. |
| 6. ¿Qué función pareció innecesaria? | Ninguna. | Vista de mapa. | Ninguna. | Algunos filtros. | Seguridad y Privacidad muy complejo. | Ninguna. |

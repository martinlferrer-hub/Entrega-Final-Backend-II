# EventHub API — Entrega Final

API REST backend para una plataforma de eventos e inscripciones. Esta entrega final es la evolución integrada de las pre-entregas del curso y reúne autenticación, autorización por roles, gestión de eventos, inscripciones/tickets, control de cupos, notificaciones por email y arquitectura profesional por capas.

## 1. Temática

La API permite:

- registrar y autenticar usuarios;
- trabajar con roles `user`, `organizer` y `admin`;
- crear, consultar, modificar y cambiar el estado de eventos;
- filtrar, paginar y ordenar eventos;
- registrar inscripciones con control de cupos;
- consultar y cancelar tickets sin eliminarlos físicamente;
- enviar un email de confirmación mediante Nodemailer;
- proteger las respuestas mediante DTOs para no exponer contraseñas.

## 2. Tecnologías

- Node.js
- Express
- MongoDB
- Mongoose
- Passport.js
- JWT
- Cookies `httpOnly`
- bcrypt
- Nodemailer
- JavaScript ES Modules
- Node Test Runner

## 3. Arquitectura

```text
HTTP Request
    ↓
Routes
    ↓
Passport / Auth / Authorization
    ↓
Controllers
    ↓
Services  ← reglas de negocio
    ↓
Repositories  ← operaciones orientadas al dominio
    ↓
DAO  ← acceso a Mongoose
    ↓
Models / MongoDB

Services
    ↓
DTOs
    ↓
HTTP Response
```

### Regla de dependencias

- `routes`: define endpoints y middlewares.
- `controllers`: coordina request/response; no contiene lógica de negocio.
- `services`: concentra validaciones, reglas de negocio, permisos, cupos y notificaciones; consume repositories.
- `repositories`: expone operaciones orientadas al dominio y consume DAOs.
- `dao`: único lugar de la aplicación que importa los modelos de Mongoose.
- `models`: define esquemas y restricciones de persistencia.
- `dto`: define la representación segura de las respuestas.
- `middlewares`: autenticación, autorización y manejo centralizado de errores.
- `config`: entorno, MongoDB, Passport y Nodemailer.
- `utils`: hashing, JWT y utilidades independientes de la persistencia.

## 4. Estructura

```text
src/
├── app.js
├── server.js
├── config/
│   ├── database.js
│   ├── env.js
│   ├── mailer.js
│   └── passport.config.js
├── models/
│   ├── User.js
│   ├── Event.js
│   └── Ticket.js
├── dao/
│   ├── users.dao.js
│   ├── events.dao.js
│   └── tickets.dao.js
├── repositories/
│   ├── users.repository.js
│   ├── events.repository.js
│   └── tickets.repository.js
├── services/
│   ├── sessions.service.js
│   ├── users.service.js
│   ├── events.service.js
│   └── tickets.service.js
├── dto/
│   ├── user.dto.js
│   ├── event.dto.js
│   └── ticket.dto.js
├── controllers/
├── routes/
├── middlewares/
└── utils/
    ├── hash.js
    ├── ids.js
    └── jwt.js
```

## 5. Usuarios y autenticación

### User

Campos principales:

- `first_name`
- `last_name`
- `email`
- `password` — almacenada únicamente hasheada con bcrypt
- `role`

El modelo utiliza `select: false` para `password`. Los DAOs solo solicitan la contraseña explícitamente cuando es necesaria para autenticar.

### Endpoints

| Método | Endpoint | Acceso |
|---|---|---|
| POST | `/api/sessions/register` | Público |
| POST | `/api/sessions/login` | Público |
| GET | `/api/sessions/current` | Autenticado |
| POST | `/api/sessions/logout` | Público |

El registro público ignora cualquier `role` enviado en el body y siempre crea usuarios con rol `user`.

El login genera un JWT y lo almacena en la cookie `currentUser` con `httpOnly`.

### Passport

Se utilizan tres estrategias:

- `register`
- `login`
- `jwt`

La estrategia JWT extrae el token exclusivamente desde la cookie `currentUser`.

## 6. Roles y autorización

| Acción | user | organizer | admin |
|---|:---:|:---:|:---:|
| Consultar eventos publicados | ✅ | ✅ | ✅ |
| Crear eventos | ❌ | ✅ | ✅ |
| Modificar evento propio | ❌ | ✅ | ✅ |
| Modificar evento ajeno | ❌ | ❌ | ✅ |
| Inscribirse | ✅ | ✅ | ✅ |
| Ver mis tickets | ✅ | ✅ | ✅ |
| Ver tickets de evento propio | ❌ | ✅ | ✅ |
| Cancelar ticket propio | ✅ | ✅ | ✅ |
| Cancelar ticket ajeno | ❌ | ❌ | ✅ |
| Listar usuarios | ❌ | ❌ | ✅ |

La ausencia de autenticación devuelve `401`. Un usuario autenticado sin permisos devuelve `403`.

## 7. Eventos

### Modelo

- `title`
- `description`
- `category`
- `date`
- `location`
- `capacity`
- `price`
- `status`: `draft`, `published`, `cancelled`, `finished`
- `organizer`: referencia a `User`

### Endpoints

| Método | Endpoint | Acceso |
|---|---|---|
| GET | `/api/events` | Público |
| GET | `/api/events/:id` | Público |
| POST | `/api/events` | organizer/admin |
| PUT | `/api/events/:id` | dueño/admin |
| PATCH | `/api/events/:id/status` | dueño/admin |

### Validaciones

- fecha futura;
- `capacity > 0`;
- `price >= 0`;
- estados válidos;
- un evento cancelado no puede modificarse;
- solo el dueño o `admin` puede modificar/cancelar;
- un `organizer` no puede modificar eventos de otro organizer.

### Filtros, paginación y ordenamiento

Ejemplo:

```http
GET /api/events?status=published&category=tech&location=Playa&page=2&limit=5&sort=-date
```

Respuesta:

```json
{
  "status": "success",
  "data": [],
  "page": 2,
  "limit": 5,
  "total": 27,
  "totalPages": 6
}
```

Filtros disponibles:

- `status`
- `category`
- `location`
- `dateFrom`
- `dateTo`
- `page`
- `limit`
- `sort`

## 8. Tickets / inscripciones

### Modelo

Los tickets utilizan referencias a `User` y `Event`, no objetos embebidos.

Campos:

- `user`
- `event`
- `status`
- `quantity`
- `reservationCode`
- `createdAt`
- `cancelledAt`

### Endpoints

| Método | Endpoint | Acceso |
|---|---|---|
| POST | `/api/events/:eid/tickets` | Autenticado |
| GET | `/api/tickets/my-tickets` | Autenticado |
| GET | `/api/events/:eid/tickets` | dueño/admin |
| PATCH | `/api/tickets/:tid/cancel` | dueño/admin |

Al crear una inscripción se valida:

1. evento existente;
2. evento publicado;
3. evento no finalizado;
4. cantidad entera mayor que cero;
5. ausencia de inscripción activa duplicada;
6. cupo disponible.

Los tickets cancelados no cuentan como cupo ocupado y no se eliminan físicamente.

El índice parcial único de `user + event` evita duplicados activos a nivel de MongoDB.

## 9. Notificaciones

Nodemailer envía un email después de confirmar una inscripción.

Las credenciales se leen exclusivamente desde variables de entorno.

Si el envío del email falla después de crear el ticket, la inscripción no se revierte: la persistencia de la reserva y la notificación son responsabilidades separadas.

## 10. DTO y seguridad de datos

Las respuestas de usuario, evento y ticket pasan por DTO.

`password` nunca se devuelve, incluso cuando existe un usuario relacionado mediante `populate`.

Los tickets poblados exponen únicamente datos básicos del usuario y del evento.

Ejemplo de ticket:

```json
{
  "status": "success",
  "payload": {
    "id": "6690...",
    "event": "6690...",
    "user": "665f...",
    "quantity": 1,
    "status": "confirmed",
    "reservationCode": "EVT-7QK2"
  }
}
```

## 11. Manejo de errores

El middleware centralizado utiliza:

| Código | Situación |
|---:|---|
| 400 | Datos o parámetros inválidos |
| 401 | No autenticado / credenciales inválidas |
| 403 | Sin permisos |
| 404 | Recurso inexistente |
| 409 | Conflicto, duplicado o cupo insuficiente |
| 500 | Error interno inesperado |

Formato:

```json
{
  "status": "error",
  "message": "Ya tenés una inscripción activa para este evento"
}
```

## 12. Variables de entorno

Crear `.env` a partir de `.env.example`.

```env
PORT=8080
MONGO_URL=mongodb://localhost:27017/eventhub
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=1h
NODE_ENV=development
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_email@example.com
MAIL_PASS=your_email_password
MAIL_FROM="EventHub <your_email@example.com>"
```

Nunca subir `.env`, credenciales ni `node_modules`.

## 13. Instalación

Requisitos:

- Node.js
- MongoDB local o MongoDB Atlas
- una cuenta SMTP válida para probar el email de confirmación

Instalación:

```bash
npm install
```

Crear `.env`:

```bash
copy .env.example .env
```

En Linux/macOS:

```bash
cp .env.example .env
```

Completar las variables con valores reales.

## 14. Comandos

Desarrollo:

```bash
npm run dev
```

Producción:

```bash
npm start
```

Tests:

```bash
npm test
```

Health check:

```http
GET /api/health
```

## 15. Usuarios de prueba

El registro público siempre crea `user`.

```http
POST /api/sessions/register
Content-Type: application/json

{
  "first_name": "Martín",
  "last_name": "Ferrer",
  "email": "martin@example.com",
  "password": "12345678",
  "role": "admin"
}
```

Aunque el body incluya `role: admin`, el usuario creado tendrá `role: user`.

Para probar `organizer` y `admin`, crear primero usuarios mediante el registro público y luego asignar el rol desde una herramienta administrativa de MongoDB o mediante el mecanismo que utilice el entorno de evaluación. No se incluye un endpoint público para elevar privilegios.

## 16. Flujo completo de verificación

Antes de publicar la entrega se debe verificar:

1. Registro exitoso.
2. Registro con `role` enviado: el usuario sigue siendo `user`.
3. Login exitoso y cookie JWT `httpOnly`.
4. `/current` devuelve identidad segura sin password.
5. Logout elimina la cookie.
6. `/current` después del logout devuelve `401`.
7. `user` intenta crear evento → `403`.
8. `organizer` crea evento.
9. `user` se inscribe a evento publicado → `201`.
10. Se recibe email de confirmación.
11. El cupo disponible disminuye según `quantity`.
12. Segunda inscripción activa del mismo usuario → `409`.
13. Inscripción sin cupo suficiente → `409`.
14. Usuario cancela su ticket → ticket queda `cancelled`.
15. El cupo liberado permite una nueva inscripción.
16. Organizer intenta modificar evento ajeno → `403`.
17. Admin modifica evento de otro organizer → éxito.
18. Tickets poblados no exponen password.
19. Eventos paginados devuelven `data`, `page`, `limit`, `total`, `totalPages`.
20. Errores de negocio no terminan como `500`.

## 17. Evidencia recomendada

Para la presentación final se recomienda adjuntar:

- enlace al repositorio público;
- colección de Postman con el flujo completo;
- capturas de los casos principales de autenticación, autorización, inscripción, cancelación, cupos y paginación;
- evidencia del email enviado por Nodemailer, si la cursada lo solicita.

## 18. Checklist de entrega

- [x] Autenticación JWT + cookie `httpOnly`
- [x] Passport register/login/jwt
- [x] Roles user/organizer/admin
- [x] Autorización 401/403
- [x] CRUD y estados de eventos
- [x] Filtros, paginación y ordenamiento
- [x] Tickets con referencias
- [x] Control de duplicados y cupos
- [x] Cancelación sin eliminación física
- [x] Nodemailer
- [x] DAO
- [x] Repository
- [x] Services
- [x] Controllers
- [x] DTOs
- [x] Middleware centralizado de errores
- [x] `.env.example`
- [x] `.gitignore`
- [x] README completo
- [x] Tests unitarios

## 19. Qué no subir a GitHub

```text
.env
node_modules/
credenciales SMTP
JWT secrets reales
archivos temporales
```

El repositorio debe ser público, instalable y reproducible mediante `.env.example`.

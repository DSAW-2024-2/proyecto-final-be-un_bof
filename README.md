Nombres: Andrés Mauricio Ricaurte y David Santiago Medina  
Link al backend: https://proyecto-final-be-un-bof.vercel.app

# Proyecto de Creación y Gestión de Viajes de Wheels (backend)

## Descripción

Esta parte del proyecto consiste en la creación del backend para una aplicación web de Wheels que le permita a los usuarios gestionar sus viajes. Estos pueden registrarse, iniciar sesión, crear viajes, listar viajes, actualizar y eliminar viajes, así como reservar cupos para viajes creados y consultar la información de sus reservas. La aplicación está construida utilizando Node.js y Express, y utiliza CORS para permitir solicitudes desde diferentes orígenes. Asimismo, se hace uso de la base de datos de Realtime Database para el almacenamiento de la información de usuarios y viajes.

## Funciones

A continuación se describen las funciones principales utilizadas en el proyecto:

### Middleware

- **CORS**: Se utiliza para permitir solicitudes desde orígenes específicos (`http://localhost:3000` y `https://drive2u.vercel.app` en nuestro caso) y gestionar métodos HTTP y encabezados permitidos.

### Rutas de Usuarios

- **/register**: Ruta para **registrar** nuevos usuarios. Esta contiene la ruta /me para **actualizar** y **eliminar** los datos del usuario en la base de datos.
- **/login**: Ruta para **iniciar sesión** con las credenciales de usuario.
- **/**: Ruta para **cargar** información del usuario autenticado.

### Rutas de Viajes

- **/trip/create**: Ruta para **crear** un nuevo viaje.
- **/trips**: 
  - Ruta para **listar** todos los viajes para los pasajeros.
  - Ruta para **actualizar** y **eliminar** un viaje existente (/trips/ID_del_viaje).
  - Ruta para **obtener** el viaje del conductor (/trips/mytrip).
  - Ruta para **reservar** un viaje como pasajero (/trips/ID_del_viaje/reserve).
  - Ruta para **cancelar** una reserva para un viaje como pasajero (/trips/ID_de_la_reserva/cancel).
- **/reservations**: Ruta para **obtener** todas las reservas realizadas por el usuario.

### Manejo de Errores

- **404 Not Found**: Se incluye un manejo de rutas no encontradas que devuelve un mensaje de error en formato JSON.

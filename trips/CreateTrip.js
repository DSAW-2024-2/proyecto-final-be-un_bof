// trips/CreateTrip.js

const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware'); // Importamos el middleware de rol

const createTripRoute = express.Router();

// Expresión regular para validar el formato de hora HH:MM (24 horas)
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Middleware para manejar errores de validación (opcional)
const handleValidationErrors = (req, res, next) => {
  // Puedes implementar validaciones adicionales aquí si lo deseas
  next();
};

// Aplicamos los middlewares de autenticación y autorización
createTripRoute.post(
  '/',
  authMiddleware,
  roleMiddleware('driver'),
  handleValidationErrors,
  async (req, res) => {
    const { startLocation, endTrip, timeTrip, availablePlaces, priceTrip, route } = req.body;

    try {
      // Verificar si el conductor ya tiene un viaje activo
      const tripsSnapshot = await db.ref('trips').orderByChild('driverId').equalTo(req.user.id).once('value');
      if (tripsSnapshot.exists()) {
        return res.status(400).json({ message: 'Ya tienes un viaje creado. Debes eliminarlo antes de crear uno nuevo.' });
      }

      // Validaciones de campos obligatorios
      if (!startLocation) {
        return res.status(400).json({ message: 'startLocation es obligatorio' });
      }
      if (!endTrip) {
        return res.status(400).json({ message: 'endTrip es obligatorio' });
      }
      if (!timeTrip) {
        return res.status(400).json({ message: 'timeTrip es obligatorio' });
      }
      if (availablePlaces === undefined || availablePlaces === null) {
        return res.status(400).json({ message: 'availablePlaces es obligatorio' });
      }
      if (priceTrip === undefined || priceTrip === null) {
        return res.status(400).json({ message: 'priceTrip es obligatorio' });
      }

      // Validación del formato de timeTrip
      if (!timeFormatRegex.test(timeTrip)) {
        return res.status(400).json({ message: 'timeTrip debe estar en formato HH:MM' });
      }

      // Validación de que availablePlaces sea un número entero positivo
      const availablePlacesNumber = parseInt(availablePlaces, 10);
      if (isNaN(availablePlacesNumber) || availablePlacesNumber <= 0) {
        return res.status(400).json({ message: 'availablePlaces debe ser un número entero positivo' });
      }

      // Validación de que priceTrip sea un número positivo
      const priceTripNumber = parseFloat(priceTrip);
      if (isNaN(priceTripNumber) || priceTripNumber <= 0) {
        return res.status(400).json({ message: 'priceTrip debe ser un número positivo' });
      }

      // Obtener la información del conductor para verificar la capacidad del vehículo
      const userRef = db.ref(`users/${req.user.id}`);
      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();

      // Agregar logs para depuración
      console.log('Datos del usuario:', userData);

      if (!userData) {
        return res.status(400).json({ message: 'Usuario no encontrado' });
      }
      if (!userData.driverInfo) {
        return res.status(400).json({ message: 'driverInfo no encontrada en el perfil del conductor' });
      }

      // Parsear capacity a número si no lo es
      let vehicleCapacity = userData.driverInfo.capacity;
      if (typeof vehicleCapacity === 'string') {
        vehicleCapacity = parseInt(vehicleCapacity, 10);
        if (isNaN(vehicleCapacity)) {
          return res.status(400).json({ message: 'La capacidad del vehículo no es válida' });
        }
      } else if (typeof vehicleCapacity !== 'number') {
        return res.status(400).json({ message: 'El campo capacity no está definido o no es un número' });
      }

      // Validar que availablePlaces no supere la capacidad del vehículo
      if (availablePlacesNumber > vehicleCapacity) {
        return res.status(400).json({ message: `availablePlaces no puede superar la capacidad del vehículo (${vehicleCapacity})` });
      }

      // Crear una nueva referencia para el viaje
      const tripRef = db.ref('trips').push();
      const tripId = tripRef.key; // Obtener el ID generado por Firebase

      const newTrip = {
        id: tripId, // Agregar el ID al objeto del viaje
        driverId: req.user.id, // Asociamos el viaje con el conductor que lo creó
        startLocation,
        endTrip,
        timeTrip,
        availablePlaces: availablePlacesNumber,
        priceTrip: priceTripNumber,
        route: route || null, // Asignar null si no se proporciona
        createdAt: Date.now(),
      };

      await tripRef.set(newTrip); // Guardar el viaje con el ID incluido
      res.status(201).json({ message: 'Viaje creado exitosamente', tripId });
    } catch (error) {
      console.error('Error al crear el viaje:', error);
      res.status(500).json({ message: 'Error al crear el viaje', error: error.message });
    }
  }
);

module.exports = createTripRoute;
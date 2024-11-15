// trips/CreateTrip.js

const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware'); // Importamos el middleware de rol

const createTripRoute = express.Router();

// Aplicamos los middlewares de autenticación y autorización
createTripRoute.post('/', authMiddleware, roleMiddleware('driver'), async (req, res) => {
  const { startLocation, endTrip, timeTrip, availablePlaces, priceTrip, route } = req.body;

  try {
    // Validar que startLocation no sea undefined o vacío
    if (!startLocation) {
      return res.status(400).json({ message: 'startLocation es obligatorio' });
    }

    const newTrip = {
      driverId: req.user.id, // Asociamos el viaje con el conductor que lo creó
      startLocation,
      endTrip,
      timeTrip,
      availablePlaces,
      priceTrip,
      route
    };

    const tripRef = await db.ref('trips').push(newTrip);
    res.status(201).json({ message: 'Viaje creado exitosamente', tripId: tripRef.key });
  } catch (error) {
    console.error('Error al crear el viaje:', error);
    res.status(500).json({ message: 'Error al crear el viaje', error });
  }
});

module.exports = createTripRoute;
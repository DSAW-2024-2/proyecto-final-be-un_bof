// trips/CreateTrip.js
const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');

const createTripRoute = express.Router();

createTripRoute.post('/', authMiddleware, async (req, res) => {
  const { startLocation, endTrip, timeTrip, availablePlaces, priceTrip, route } = req.body; // Renombrado de startTrip a startLocation

  try {
    // Validar que startLocation no sea undefined o vacío
    if (!startLocation) {
      return res.status(400).json({ message: 'startLocation es obligatorio' });
    }

    const newTrip = {
      startLocation, // Renombrado de startTrip a startLocation
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
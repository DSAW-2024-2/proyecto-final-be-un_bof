const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { startLocation, endLocation, date, time, seatsAvailable, price } = req.body;

  try {
    const newTrip = {
      startLocation,
      endLocation,
      date,
      time,
      seatsAvailable,
      price,
      createdBy: req.user.id,
    };

    const tripRef = await db.ref('trips').push(newTrip);
    res.status(201).json({ message: 'Viaje creado exitosamente', tripId: tripRef.key });
  } catch (error) {
    console.error('Error al crear el viaje:', error);
    res.status(500).json({ message: 'Error al crear el viaje', error });
  }
});

module.exports = router;

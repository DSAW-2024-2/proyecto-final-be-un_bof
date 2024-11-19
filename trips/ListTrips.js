// trips/ListTrips.js

const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const tripsSnapshot = await db.ref('trips').once('value');
    const tripsData = tripsSnapshot.val();

    if (!tripsData) {
      return res.status(404).json({ message: 'No hay viajes disponibles' });
    }

    // Convertir el objeto de viajes en un array incluyendo el id
    const trips = Object.keys(tripsData).map((key) => ({
      id: key,
      ...tripsData[key],
    }));

    res.status(200).json(trips);
  } catch (error) {
    console.error('Error al obtener los viajes:', error);
    res.status(500).json({ message: 'Error al obtener los viajes', error });
  }
});

module.exports = router;
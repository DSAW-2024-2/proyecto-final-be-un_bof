const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const tripsSnapshot = await db.ref('trips').once('value');
    const trips = tripsSnapshot.val();

    if (!trips) {
      return res.status(404).json({ message: 'No hay viajes disponibles' });
    }

    res.status(200).json(trips);
  } catch (error) {
    console.error('Error al obtener los viajes:', error);
    res.status(500).json({ message: 'Error al obtener los viajes', error });
  }
});

module.exports = router;

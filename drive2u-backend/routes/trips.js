// routes/trips.js
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { db } = require('../firebase');

const router = express.Router();

// Crear un viaje (solo para conductores)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Verificar que el usuario es conductor
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData.role !== 'driver') {
      return res.status(403).json({ message: 'Solo los conductores pueden crear viajes' });
    }

    const { startPoint, endPoint, route, departureTime, availableSeats, fare } = req.body;

    const newTrip = {
      driverId: userId,
      startPoint,
      endPoint,
      route,
      departureTime: new Date(departureTime),
      availableSeats: parseInt(availableSeats),
      fare: parseFloat(fare),
      createdAt: new Date(),
      isFull: false,
    };

    const tripRef = await db.collection('trips').add(newTrip);

    res.status(201).json({ message: 'Viaje creado exitosamente', tripId: tripRef.id });
  } catch (error) {
    console.error('Error al crear el viaje:', error);
    res.status(500).json({ message: 'Error al crear el viaje' });
  }
});

// Listar viajes disponibles (para pasajeros)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { availableSeats, startPoint } = req.query;

    let query = db.collection('trips').where('isFull', '==', false);

    if (availableSeats) {
      query = query.where('availableSeats', '>=', parseInt(availableSeats));
    }

    if (startPoint) {
      query = query.where('startPoint', '==', startPoint);
    }

    const snapshot = await query.get();
    const trips = [];
    snapshot.forEach(doc => {
      trips.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(trips);
  } catch (error) {
    console.error('Error al listar los viajes:', error);
    res.status(500).json({ message: 'Error al listar los viajes' });
  }
});

// Seleccionar un viaje (reservar cupos)
router.post('/:tripId/select', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { tripId } = req.params;
    const { seatsRequested, pickupPoint } = req.body;

    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }

    const tripData = tripDoc.data();

    if (tripData.isFull) {
      return res.status(400).json({ message: 'Este viaje ya está lleno' });
    }

    if (tripData.availableSeats < seatsRequested) {
      return res.status(400).json({ message: 'No hay suficientes asientos disponibles' });
    }

    // Actualizar los asientos disponibles
    const newAvailableSeats = tripData.availableSeats - seatsRequested;
    const isFull = newAvailableSeats === 0;

    await tripRef.update({
      availableSeats: newAvailableSeats,
      isFull,
    });

    // Crear una reserva
    await db.collection('reservations').add({
      tripId,
      passengerId: userId,
      seats: seatsRequested,
      pickupPoint,
      reservedAt: new Date(),
    });

    res.status(200).json({ message: 'Reserva realizada exitosamente' });
  } catch (error) {
    console.error('Error al seleccionar el viaje:', error);
    res.status(500).json({ message: 'Error al seleccionar el viaje' });
  }
});

// Actualizar un viaje (PUT)
router.put('/:tripId', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { tripId } = req.params;
    const updates = req.body;

    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }

    const tripData = tripDoc.data();

    if (tripData.driverId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para actualizar este viaje' });
    }

    await tripRef.update(updates);

    res.status(200).json({ message: 'Viaje actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar el viaje:', error);
    res.status(500).json({ message: 'Error al actualizar el viaje' });
  }
});

// Eliminar un viaje (DELETE)
router.delete('/:tripId', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { tripId } = req.params;

    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }

    const tripData = tripDoc.data();

    if (tripData.driverId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este viaje' });
    }

    await tripRef.delete();

    res.status(200).json({ message: 'Viaje eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar el viaje:', error);
    res.status(500).json({ message: 'Error al eliminar el viaje' });
  }
});

module.exports = router;

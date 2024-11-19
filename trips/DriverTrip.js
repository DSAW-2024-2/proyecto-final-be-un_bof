// trips/DriverTrip.js

const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const driverTripRoute = express.Router();

// Endpoint GET para obtener los detalles del viaje del conductor junto con las reservas
driverTripRoute.get(
    '/mytrip',
    authMiddleware,
    roleMiddleware('driver'),
    async (req, res) => {
        try {
            const driverId = req.user.id;

            // Consultar los viajes donde driverId coincide con el ID del usuario autenticado
            const tripsSnapshot = await db.ref('trips').orderByChild('driverId').equalTo(driverId).once('value');
            const tripsData = tripsSnapshot.val();

            if (!tripsData) {
                return res.status(404).json({ message: 'No tienes ningún viaje creado.' });
            }

            // Suponiendo que cada conductor puede tener solo un viaje activo,
            // obtenemos el primer (y único) viaje encontrado.
            const tripId = Object.keys(tripsData)[0];
            const trip = tripsData[tripId];

            // Consultar las reservas asociadas a este viaje
            const reservationsSnapshot = await db.ref('reservations')
                .orderByChild('tripId')
                .equalTo(tripId)
                .once('value');
            const reservationsData = reservationsSnapshot.val();

            // Transformar las reservas en un array
            const reservations = reservationsData
                ? Object.keys(reservationsData).map(reservationId => ({
                    reservationId,
                    ...reservationsData[reservationId],
                }))
                : [];

            res.status(200).json({
                tripId,
                ...trip,
                reservations, // Agregar las reservas al objeto de respuesta
            });
        } catch (error) {
            console.error('Error al obtener el viaje del conductor:', error);
            res.status(500).json({ message: 'Error al obtener los detalles del viaje.', error: error.message });
        }
    }
);

module.exports = driverTripRoute;

// trips/SelectTrip.js

const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const selectTripRoute = express.Router();

// Middleware para manejar errores de validación (opcional)
const handleValidationErrors = (req, res, next) => {
    // Puedes implementar validaciones adicionales aquí si lo deseas
    next();
};

// Endpoint para reservar un viaje
selectTripRoute.post(
    '/:tripId/reserve',
    authMiddleware,
    //roleMiddleware('passenger'),
    handleValidationErrors,
    async (req, res) => {
        const { tripId } = req.params;
        const { requestedPlaces, pickup_dropPoint } = req.body;

        try {
            // Validaciones de campos obligatorios
            if (!requestedPlaces || !pickup_dropPoint) {
                return res.status(400).json({ message: 'Todos los campos son obligatorios' });
            }

            // Validación de que requestedPlaces sea un número entero positivo
            const requestedPlacesNumber = parseInt(requestedPlaces, 10);
            if (isNaN(requestedPlacesNumber) || requestedPlacesNumber <= 0) {
                return res.status(400).json({ message: 'requestedPlaces debe ser un número entero positivo' });
            }

            // Validación de que pickup_dropPoint sea un array con la longitud exacta de requestedPlaces
            if (!Array.isArray(pickup_dropPoint) || pickup_dropPoint.length !== requestedPlacesNumber) {
                return res.status(400).json({ message: 'La cantidad de puntos de origen/destino no corresponde con la cantidad de cupos solicitados' });
            }

            // Obtener el viaje desde la base de datos
            const tripRef = db.ref(`trips/${tripId}`);
            const tripSnapshot = await tripRef.once('value');
            const tripData = tripSnapshot.val();

            if (!tripData) {
                return res.status(404).json({ message: 'Viaje no encontrado' });
            }

            // Verificar que hay suficientes cupos disponibles para el viaje
            const availablePlaces = tripData.availablePlaces;
            if (requestedPlacesNumber > availablePlaces) {
                return res.status(400).json({ message: 'No hay suficientes cupos disponibles para el viaje' });
            }

            // Actualizar la información del viaje restando los cupos reservados
            const updatedAvailablePlaces = availablePlaces - requestedPlacesNumber;
            await tripRef.update({ availablePlaces: updatedAvailablePlaces });

            // Registrar la reserva del pasajero
            const reservationRef = db.ref('reservations').push();
            const reservationId = reservationRef.key;

            const newReservation = {
                reservationId,
                tripId,
                passengerId: req.user.id,
                requestedPlaces: requestedPlacesNumber,
                pickup_dropPoint,
                reservedAt: Date.now(),
            };

            await reservationRef.set(newReservation);

            res.status(201).json({ message: 'Reserva realizada exitosamente', reservationId });
        } catch (error) {
            console.error('Error al reservar el viaje:', error);
            res.status(500).json({ message: 'Error al reservar el viaje', error: error.message });
        }
    }
);

// Endpoint para cancelar una reserva
selectTripRoute.delete(
    '/:reservationId/cancel',
    authMiddleware,
    //roleMiddleware('passenger'),
    async (req, res) => {
        const { reservationId } = req.params;

        try {
            // Obtener la reserva desde la base de datos
            const reservationRef = db.ref(`reservations/${reservationId}`);
            const reservationSnapshot = await reservationRef.once('value');
            const reservationData = reservationSnapshot.val();

            if (!reservationData) {
                return res.status(404).json({ message: 'Reserva no encontrada' });
            }

            // Verificar que la reserva pertenece al usuario autenticado
            if (reservationData.passengerId !== req.user.id) {
                return res.status(403).json({ message: 'No tienes permiso para cancelar esta reserva' });
            }

            // Obtener el viaje asociado a la reserva
            const tripRef = db.ref(`trips/${reservationData.tripId}`);
            const tripSnapshot = await tripRef.once('value');
            const tripData = tripSnapshot.val();

            if (!tripData) {
                return res.status(404).json({ message: 'Viaje no encontrado para la reserva' });
            }

            // Actualizar la información del viaje sumando los cupos cancelados
            const updatedAvailablePlaces = tripData.availablePlaces + reservationData.requestedPlaces;
            await tripRef.update({ availablePlaces: updatedAvailablePlaces });

            // Eliminar la reserva de la base de datos
            await reservationRef.remove();

            res.status(200).json({ message: 'Reserva cancelada exitosamente' });
        } catch (error) {
            console.error('Error al cancelar la reserva:', error);
            res.status(500).json({ message: 'Error al cancelar la reserva', error: error.message });
        }
    }
);

module.exports = selectTripRoute;
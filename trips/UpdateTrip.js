// trips/UpdateTrip.js

const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const updateTripRoute = express.Router();

// Expresión regular para validar el formato de hora HH:MM (24 horas)
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Middleware para manejar errores de validación (opcional)
const handleValidationErrors = (req, res, next) => {
  // Puedes implementar validaciones adicionales aquí si lo deseas
    next();
};

updateTripRoute.put(
    '/:tripId',
    authMiddleware,
    roleMiddleware('driver'),
    handleValidationErrors,
    async (req, res) => {
        const { tripId } = req.params;
        const { startLocation, endTrip, timeTrip, availablePlaces, priceTrip, route } = req.body;

        try {
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

            // Obtener el viaje para verificar que pertenece al conductor
            const tripRef = db.ref(`trips/${tripId}`);
            const tripSnapshot = await tripRef.once('value');
            const tripData = tripSnapshot.val();

            if (!tripData) {
                return res.status(404).json({ message: 'Viaje no encontrado' });
            }

            if (tripData.driverId !== req.user.id) {
                return res.status(403).json({ message: 'No tienes permiso para editar este viaje' });
            }

            // Obtener la información del conductor para verificar la capacidad del vehículo
            const userRef = db.ref(`users/${req.user.id}`);
            const userSnapshot = await userRef.once('value');
            const userData = userSnapshot.val();

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

            const updatedTrip = {
                startLocation,
                endTrip,
                timeTrip,
                availablePlaces: availablePlacesNumber,
                priceTrip: priceTripNumber,
                route: route || null,
                updatedAt: Date.now(),
            };

            await tripRef.update(updatedTrip);
            res.status(200).json({ message: 'Viaje actualizado exitosamente' });
        } catch (error) {
            console.error('Error al actualizar el viaje:', error);
            res.status(500).json({ message: 'Error al actualizar el viaje', error: error.message });
        }
    }
);

module.exports = updateTripRoute;
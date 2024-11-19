// trips/DeleteTrip.js

const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const deleteTripRoute = express.Router();

deleteTripRoute.delete(
    '/:tripId',
    authMiddleware,
    roleMiddleware('driver'),
    async (req, res) => {
        const { tripId } = req.params;

        try {
            const tripRef = db.ref(`trips/${tripId}`);
            const tripSnapshot = await tripRef.once('value');
            const tripData = tripSnapshot.val();

            if (!tripData) {
                return res.status(404).json({ message: 'Viaje no encontrado' });
            }

            if (tripData.driverId !== req.user.id) {
                return res.status(403).json({ message: 'No tienes permiso para eliminar este viaje' });
            }

            await tripRef.remove();
            res.status(200).json({ message: 'Viaje eliminado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar el viaje:', error);
            res.status(500).json({ message: 'Error al eliminar el viaje', error: error.message });
        }
    }
);

module.exports = deleteTripRoute;
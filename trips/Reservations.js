// trips/Reservations.js

const express = require('express');
const { db } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Endpoint para obtener todas las reservas de un usuario específico usando su ID
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Obtener el ID del usuario autenticado desde req.user
        const userId = req.user.id;

        // Referencia a la colección de reservas y buscar todas las reservas con el passengerId igual al userId autenticado
        const reservationsRef = db.ref('reservations');
        const reservationsSnapshot = await reservationsRef.orderByChild('passengerId').equalTo(userId).once('value');
        const reservationsData = reservationsSnapshot.val();

        // Verificar si existen reservas para el usuario
        if (!reservationsData) {
            return res.status(404).json({ message: 'No se encontraron reservas para este usuario' });
        }

        // Convertir el objeto de reservas en un array incluyendo el ID de cada reserva
        const reservations = Object.keys(reservationsData).map((key) => ({
            id: key,
            ...reservationsData[key],
        }));

        res.status(200).json(reservations);
    } catch (error) {
        console.error('Error al obtener las reservas del usuario:', error);
        res.status(500).json({ message: 'Error al obtener las reservas del usuario', error: error.message });
    }
});

module.exports = router;
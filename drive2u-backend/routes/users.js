// routes/users.js
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { db, bucket } = require('../firebase');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configuración de Multer para subir imágenes
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Obtener perfil del usuario
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const userData = userDoc.data();
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    res.status(500).json({ message: 'Error al obtener el perfil' });
  }
});

// Actualizar perfil del usuario
router.put('/profile', authMiddleware, upload.fields([
  { name: 'vehiclePhoto', maxCount: 1 },
  { name: 'soatPhoto', maxCount: 1 },
  { name: 'userPhoto', maxCount: 1 },
]), async (req, res) => {
  try {
    const userId = req.session.userId;
    const userDoc = db.collection('users').doc(userId);

    const updates = { ...req.body };

    // Manejar las imágenes subidas
    if (req.files) {
      const uploadPromises = [];

      if (req.files.vehiclePhoto) {
        const vehiclePhoto = req.files.vehiclePhoto[0];
        const vehiclePhotoPath = `vehicles/${userId}/${Date.now()}_${vehiclePhoto.originalname}`;
        const file = bucket.file(vehiclePhotoPath);
        uploadPromises.push(
          file.save(vehiclePhoto.buffer, { contentType: vehiclePhoto.mimetype })
            .then(() => {
              updates.vehiclePhotoURL = `https://storage.googleapis.com/${bucket.name}/${vehiclePhotoPath}`;
            })
        );
      }

      if (req.files.soatPhoto) {
        const soatPhoto = req.files.soatPhoto[0];
        const soatPhotoPath = `soat/${userId}/${Date.now()}_${soatPhoto.originalname}`;
        const file = bucket.file(soatPhotoPath);
        uploadPromises.push(
          file.save(soatPhoto.buffer, { contentType: soatPhoto.mimetype })
            .then(() => {
              updates.soatPhotoURL = `https://storage.googleapis.com/${bucket.name}/${soatPhotoPath}`;
            })
        );
      }

      if (req.files.userPhoto) {
        const userPhoto = req.files.userPhoto[0];
        const userPhotoPath = `users/${userId}/${Date.now()}_${userPhoto.originalname}`;
        const file = bucket.file(userPhotoPath);
        uploadPromises.push(
          file.save(userPhoto.buffer, { contentType: userPhoto.mimetype })
            .then(() => {
              updates.userPhotoURL = `https://storage.googleapis.com/${bucket.name}/${userPhotoPath}`;
            })
        );
      }

      await Promise.all(uploadPromises);
    }

    await userDoc.update(updates);

    res.status(200).json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    res.status(500).json({ message: 'Error al actualizar el perfil' });
  }
});

module.exports = router;

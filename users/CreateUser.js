const express = require('express');
const { db, storage } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Función para subir archivos a Firebase Storage
const uploadFile = async (file, path) => {
  return new Promise((resolve, reject) => {
    const blob = storage.file(path);
    const blobStream = blob.createWriteStream({
      metadata: { contentType: file.mimetype },
    });

    blobStream.on('error', (error) => {
      reject(error);
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${storage.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
};

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userRef = db.ref(`users/${req.user.id}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const userData = snapshot.val();
    delete userData.password;

    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los datos del usuario', error });
  }
});

// Actualizar datos del usuario
router.put(
  '/me',
  authMiddleware,
  upload.fields([
    { name: 'userPhoto', maxCount: 1 },
    { name: 'vehiclePhoto', maxCount: 1 },
    { name: 'soatPhoto', maxCount: 1 },
  ]),
  [
    // Validaciones comunes
    body('userType')
      .optional()
      .isIn(['passenger', 'driver'])
      .withMessage('Tipo de usuario inválido'),
    body('email').optional().isEmail().withMessage('Formato de email inválido'),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('surName').optional().notEmpty().withMessage('El apellido no puede estar vacío'),
    body('universityID').optional().notEmpty().withMessage('El ID universitario no puede estar vacío'),
    body('phoneNumber')
      .optional()
      .isNumeric()
      .withMessage('El número de teléfono debe ser numérico'),

    // Validaciones adicionales para conductores
    body('licensePlate')
      .optional()
      .notEmpty()
      .withMessage('La placa del vehículo no puede estar vacía'),
    body('capacity')
      .optional()
      .notEmpty()
      .withMessage('La capacidad no puede estar vacía')
      .isNumeric()
      .withMessage('La capacidad debe ser numérica'),
    body('brand')
      .optional()
      .notEmpty()
      .withMessage('La marca no puede estar vacía'),
    body('model')
      .optional()
      .notEmpty()
      .withMessage('El modelo no puede estar vacío'),
  ],
  handleValidationErrors,
  async (req, res) => {
    const {
      userType,
      name,
      surName,
      universityID,
      email,
      phoneNumber,
      password,
      licensePlate,
      capacity,
      brand,
      model,
    } = req.body;

    try {
      const updatedData = {};
      const userRef = db.ref(`users/${req.user.id}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();

      // Actualizar campos comunes
      if (userType) updatedData.userType = userType;
      if (name) updatedData.name = name;
      if (surName) updatedData.surName = surName;
      if (universityID) updatedData.universityID = universityID;
      if (email) updatedData.email = email;
      if (phoneNumber) updatedData.phoneNumber = phoneNumber;

      if (password) {
        updatedData.password = await bcrypt.hash(password, 10);
      }

      // Manejo de archivos subidos
      if (req.files) {
        // Actualizar foto de usuario
        if (req.files['userPhoto']) {
          if (userData.userPhotoURL) {
            const oldFileName = userData.userPhotoURL.split('/').pop();
            const oldFile = storage.file(`users/${oldFileName}`);
            await oldFile.delete().catch((error) => {
              console.error(`Error al eliminar la foto anterior: ${error}`);
            });
          }

          const file = req.files['userPhoto'][0];
          const userPhotoURL = await uploadFile(
            file,
            `users/${userData.universityID}-${Date.now()}`
          );
          updatedData.userPhotoURL = userPhotoURL;
        }

        // Si el usuario es conductor, manejar fotos adicionales
        if (userData.userType === 'driver' || userType === 'driver') {
          if (!updatedData.driverInfo) updatedData.driverInfo = {};

          // Actualizar foto del vehículo
          if (req.files['vehiclePhoto']) {
            if (userData.driverInfo && userData.driverInfo.vehiclePhotoURL) {
              const oldFileName = userData.driverInfo.vehiclePhotoURL.split('/').pop();
              const oldFile = storage.file(`vehicles/${oldFileName}`);
              await oldFile.delete().catch((error) => {
                console.error(`Error al eliminar la foto del vehículo anterior: ${error}`);
              });
            }

            const file = req.files['vehiclePhoto'][0];
            const vehiclePhotoURL = await uploadFile(
              file,
              `vehicles/${userData.universityID}-${Date.now()}`
            );
            updatedData.driverInfo.vehiclePhotoURL = vehiclePhotoURL;
          }

          // Actualizar foto del SOAT
          if (req.files['soatPhoto']) {
            if (userData.driverInfo && userData.driverInfo.soatPhotoURL) {
              const oldFileName = userData.driverInfo.soatPhotoURL.split('/').pop();
              const oldFile = storage.file(`soat/${oldFileName}`);
              await oldFile.delete().catch((error) => {
                console.error(`Error al eliminar la foto del SOAT anterior: ${error}`);
              });
            }

            const file = req.files['soatPhoto'][0];
            const soatPhotoURL = await uploadFile(
              file,
              `soat/${userData.universityID}-${Date.now()}`
            );
            updatedData.driverInfo.soatPhotoURL = soatPhotoURL;
          }
        }
      }

      // Actualizar campos específicos de conductores
      if ((userData.userType === 'driver' || userType === 'driver') && (licensePlate || capacity || brand || model)) {
        if (!updatedData.driverInfo) updatedData.driverInfo = {};
        if (licensePlate) updatedData.driverInfo.licensePlate = licensePlate;
        if (capacity) updatedData.driverInfo.capacity = capacity;
        if (brand) updatedData.driverInfo.brand = brand;
        if (model) updatedData.driverInfo.model = model;
      }

      // Actualizar datos en la base de datos
      await userRef.update(updatedData);
      res.status(200).json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
      console.error('Error al actualizar el usuario:', error);
      res.status(500).json({ message: 'Error al actualizar el usuario', error });
    }
  }
);

// Eliminar usuario
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRef = db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    // Eliminar foto de usuario
    if (userData.userPhotoURL) {
      const fileName = userData.userPhotoURL.split('/').pop();
      const file = storage.file(`users/${fileName}`);
      await file.delete().catch((error) => {
        console.error(`Error al eliminar la foto de usuario: ${error}`);
      });
    }

    // Si es conductor, eliminar fotos adicionales
    if (userData.userType === 'driver' && userData.driverInfo) {
      if (userData.driverInfo.vehiclePhotoURL) {
        const fileName = userData.driverInfo.vehiclePhotoURL.split('/').pop();
        const file = storage.file(`vehicles/${fileName}`);
        await file.delete().catch((error) => {
          console.error(`Error al eliminar la foto del vehículo: ${error}`);
        });
      }

      if (userData.driverInfo.soatPhotoURL) {
        const fileName = userData.driverInfo.soatPhotoURL.split('/').pop();
        const file = storage.file(`soat/${fileName}`);
        await file.delete().catch((error) => {
          console.error(`Error al eliminar la foto del SOAT: ${error}`);
        });
      }
    }

    // Eliminar usuario de la base de datos
    await userRef.remove();
    res.status(200).json({ message: 'Usuario y datos asociados eliminados correctamente' });
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    res.status(500).json({ message: 'Error al eliminar el usuario', error });
  }
});

module.exports = router;

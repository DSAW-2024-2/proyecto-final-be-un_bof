const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const { db, storage } = require('../firebase'); // Asegúrate de importar correctamente tu configuración de Firebase

const router = express.Router();

// Configuración de multer para manejar múltiples archivos
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/',
  upload.fields([
    { name: 'userPhoto', maxCount: 1 },
    { name: 'vehiclePhoto', maxCount: 1 },
    { name: 'soatPhoto', maxCount: 1 },
  ]),
  [
    // Validaciones comunes
    body('userType')
      .notEmpty()
      .withMessage('El tipo de usuario es obligatorio')
      .isIn(['passenger', 'driver'])
      .withMessage('Tipo de usuario inválido'),
    body('email').isEmail().withMessage('Formato de email inválido'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('name').notEmpty().withMessage('El nombre es obligatorio'),
    body('surName').notEmpty().withMessage('El apellido es obligatorio'),
    body('universityID').notEmpty().withMessage('El ID universitario es obligatorio'),
    body('phoneNumber')
      .notEmpty()
      .withMessage('El número de teléfono es obligatorio')
      .isNumeric()
      .withMessage('El número de teléfono debe ser numérico'),

    // Validaciones adicionales para conductores
    body('licensePlate')
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('La placa del vehículo es obligatoria para conductores'),
    body('capacity')
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('La capacidad es obligatoria para conductores')
      .isNumeric()
      .withMessage('La capacidad debe ser numérica'),
    body('brand')
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('La marca es obligatoria para conductores'),
    body('model')
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('El modelo es obligatorio para conductores'),
  ],
  async (req, res) => {
    // Manejo de errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extracción de datos del cuerpo de la solicitud
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
      // Verificación de existencia de usuario
      const usersRef = db.ref('users');
      const userSnapshot = await usersRef
        .orderByChild('email')
        .equalTo(email)
        .once('value');

      if (userSnapshot.exists()) {
        return res.status(400).json({ message: 'El usuario ya existe' });
      }

      // Encriptación de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Inicialización de URLs de fotos
      let userPhotoURL = null;
      let vehiclePhotoURL = null;
      let soatPhotoURL = null;

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

      // Subida de la foto del usuario
      if (req.files && req.files['userPhoto']) {
        const file = req.files['userPhoto'][0];
        userPhotoURL = await uploadFile(
          file,
          `users/${universityID}-${Date.now()}`
        );
      }

      // Si el usuario es conductor, subimos las fotos adicionales
      if (userType === 'driver') {
        if (req.files && req.files['vehiclePhoto']) {
          const file = req.files['vehiclePhoto'][0];
          vehiclePhotoURL = await uploadFile(
            file,
            `vehicles/${universityID}-${Date.now()}`
          );
        }

        if (req.files && req.files['soatPhoto']) {
          const file = req.files['soatPhoto'][0];
          soatPhotoURL = await uploadFile(
            file,
            `soat/${universityID}-${Date.now()}`
          );
        }
      }

      // Creación del objeto de usuario
      const newUser = {
        userType,
        name,
        surName,
        universityID,
        email,
        phoneNumber,
        password: hashedPassword,
        userPhotoURL,
      };

      // Agregar información adicional si es conductor
      if (userType === 'driver') {
        newUser.driverInfo = {
          licensePlate,
          capacity,
          brand,
          model,
          vehiclePhotoURL,
          soatPhotoURL,
        };
      }

      // Guardado del usuario en la base de datos
      const newUserRef = await usersRef.push(newUser);

      // Generación del token JWT
      const token = jwt.sign(
        { id: newUserRef.key, universityID },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(201).json({ message: 'Usuario registrado exitosamente', token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al registrar el usuario', error });
    }
  }
);

module.exports = router;

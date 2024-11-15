// CreateUser.js

const express = require('express');
const { db, storage } = require('../firebase');
const authMiddleware = require('../middlewares/authMiddleware');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const registerRoute = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware para manejar errores de validación
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

// Endpoint para registrar un nuevo usuario
registerRoute.post(
  '/',
  upload.fields([
    { name: 'userPhoto', maxCount: 1 },
    { name: 'vehiclePhoto', maxCount: 1 },
    { name: 'soatPhoto', maxCount: 1 },
  ]),
  [
    // Validaciones de entrada
    body('userType')
      .notEmpty()
      .withMessage('El tipo de usuario no puede estar vacío')
      .isIn(['passenger', 'driver'])
      .withMessage('Tipo de usuario inválido'),

    body('email')
      .notEmpty()
      .withMessage('El email no puede estar vacío')
      .isEmail()
      .withMessage('Formato de email inválido'),

    body('password')
      .notEmpty()
      .withMessage('La contraseña no puede estar vacía')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),

    body('name')
      .notEmpty()
      .withMessage('El nombre no puede estar vacío')
      .matches(/^[A-Za-z\s]+$/)
      .withMessage('El nombre solo puede contener letras'),

    body('surName')
      .notEmpty()
      .withMessage('El apellido no puede estar vacío')
      .matches(/^[A-Za-z\s]+$/)
      .withMessage('El apellido solo puede contener letras'),

    body('universityID')
      .notEmpty()
      .withMessage('El ID universitario no puede estar vacío')
      .isNumeric()
      .withMessage('El ID universitario debe contener solo números'),

    body('phoneNumber')
      .notEmpty()
      .withMessage('El número de teléfono no puede estar vacío')
      .isNumeric()
      .withMessage('El número de teléfono debe ser numérico')
      .isLength({ min: 10 })
      .withMessage('El número de teléfono debe tener al menos 10 dígitos'),

    // Validaciones adicionales para conductores
    body('licensePlate')
      .custom((value, { req }) => {
        if (req.body.userType === 'passenger' && value) {
          throw new Error('Un pasajero no puede incluir información de un vehículo');
        }
        return true;
      })
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('La placa del vehículo no puede estar vacía'),

    body('capacity')
      .custom((value, { req }) => {
        if (req.body.userType === 'passenger' && value) {
          throw new Error('Un pasajero no puede incluir información de un vehículo');
        }
        return true;
      })
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('La capacidad no puede estar vacía')
      .isNumeric()
      .withMessage('La capacidad debe ser numérica'),

    body('brand')
      .custom((value, { req }) => {
        if (req.body.userType === 'passenger' && value) {
          throw new Error('Un pasajero no puede incluir información de un vehículo');
        }
        return true;
      })
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('La marca no puede estar vacía')
      .matches(/^[A-Za-z\s]+$/)
      .withMessage('La marca solo puede contener letras'),

    body('model')
      .custom((value, { req }) => {
        if (req.body.userType === 'passenger' && value) {
          throw new Error('Un pasajero no puede incluir información de un vehículo');
        }
        return true;
      })
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('El modelo no puede estar vacío')
      .matches(/^[A-Za-z\s]+$/)
      .withMessage('El modelo solo puede contener letras'),
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
      // Validación adicional para archivos subidos
      if (userType === 'passenger') {
        if (
          (req.files && (req.files['vehiclePhoto'] || req.files['soatPhoto'])) ||
          licensePlate ||
          capacity ||
          brand ||
          model
        ) {
          return res.status(400).json({
            message: 'Un pasajero no puede incluir información del vehículo',
          });
        }
      }

      const usersRef = db.ref('users');

      // Verificar si el usuario ya existe por universityID o email
      const snapshotByUniversityID = await usersRef
        .orderByChild('universityID')
        .equalTo(universityID)
        .once('value');

      if (snapshotByUniversityID.exists()) {
        return res
          .status(400)
          .json({ message: 'El usuario ya existe con este ID universitario' });
      }

      const snapshotByEmail = await usersRef
        .orderByChild('email')
        .equalTo(email)
        .once('value');

      if (snapshotByEmail.exists()) {
        return res
          .status(400)
          .json({ message: 'El usuario ya existe con este email' });
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear referencia para el nuevo usuario
      const newUserRef = usersRef.push();
      const userId = newUserRef.key;

      // Datos básicos del usuario
      const newUserData = {
        userType,
        name,
        surName,
        universityID,
        email,
        phoneNumber,
        password: hashedPassword,
        createdAt: Date.now(),
      };

      // Si el usuario es conductor, agregar información adicional
      if (userType === 'driver') {
        newUserData.driverInfo = {
          licensePlate,
          capacity,
          brand,
          model,
        };
      }

      // Manejo de archivos subidos
      if (req.files) {
        // Subir foto de usuario
        if (req.files['userPhoto']) {
          const file = req.files['userPhoto'][0];
          const userPhotoURL = await uploadFile(
            file,
            `users/${universityID}-${Date.now()}`
          );
          newUserData.userPhotoURL = userPhotoURL;
        }

        // Si el usuario es conductor, subir fotos adicionales
        if (userType === 'driver') {
          if (req.files['vehiclePhoto']) {
            const file = req.files['vehiclePhoto'][0];
            const vehiclePhotoURL = await uploadFile(
              file,
              `vehicles/${universityID}-${Date.now()}`
            );
            newUserData.driverInfo.vehiclePhotoURL = vehiclePhotoURL;
          }

          if (req.files['soatPhoto']) {
            const file = req.files['soatPhoto'][0];
            const soatPhotoURL = await uploadFile(
              file,
              `soat/${universityID}-${Date.now()}`
            );
            newUserData.driverInfo.soatPhotoURL = soatPhotoURL;
          }
        }
      }

      // Guardar datos del usuario en la base de datos
      await newUserRef.set(newUserData);

      // Generar token JWT
      const token = jwt.sign(
        { id: userId, userType: userType },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Preparar datos para la respuesta (sin la contraseña)
      const { password: pwd, ...userWithoutPassword } = newUserData;

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        token,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Error al crear el usuario:', error);
      res.status(500).json({
        message: 'Error al crear el usuario',
        error: error.message,
      });
    }
  }
);

// Endpoint para obtener los datos del usuario actual
registerRoute.get('/me', authMiddleware, async (req, res) => {
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
    res
      .status(500)
      .json({ message: 'Error al obtener los datos del usuario', error });
  }
});

// Endpoint para actualizar los datos del usuario
registerRoute.put(
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
      .notEmpty()
      .withMessage('El tipo de usuario no puede estar vacío')
      .isIn(['passenger', 'driver'])
      .withMessage('Tipo de usuario inválido'),

    body('email')
      .notEmpty()
      .withMessage('El email no puede estar vacío')
      .isEmail()
      .withMessage('Formato de email inválido'),

    body('password')
      .optional()
      .notEmpty()
      .withMessage('La contraseña no puede estar vacía')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),

    body('name')
      .notEmpty()
      .withMessage('El nombre no puede estar vacío')
      .matches(/^[A-Za-z\s]+$/)
      .withMessage('El nombre solo puede contener letras'),

    body('surName')
      .notEmpty()
      .withMessage('El apellido no puede estar vacío')
      .matches(/^[A-Za-z\s]+$/)
      .withMessage('El apellido solo puede contener letras'),

    body('universityID')
      .notEmpty()
      .withMessage('El ID universitario no puede estar vacío')
      .isNumeric()
      .withMessage('El ID universitario debe contener solo números'),

    body('phoneNumber')
      .notEmpty()
      .withMessage('El número de teléfono no puede estar vacío')
      .isNumeric()
      .withMessage('El número de teléfono debe ser numérico')
      .isLength({ min: 10 })
      .withMessage('El número de teléfono debe tener al menos 10 dígitos'),

    // Validaciones adicionales para conductores
    body('licensePlate')
      .custom((value, { req }) => {
        if (req.body.userType === 'passenger' && value) {
          throw new Error('Un pasajero no puede incluir información de un vehículo');
        }
        return true;
      })
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('La placa del vehículo no puede estar vacía'),

    body('capacity')
      .custom((value, { req }) => {
        if (req.body.userType === 'passenger' && value) {
          throw new Error('Un pasajero no puede incluir información de un vehículo');
        }
        return true;
      })
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('La capacidad no puede estar vacía')
      .isNumeric()
      .withMessage('La capacidad debe ser numérica'),

    body('brand')
      .custom((value, { req }) => {
        if (req.body.userType === 'passenger' && value) {
          throw new Error('Un pasajero no puede incluir información de un vehículo');
        }
        return true;
      })
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('La marca no puede estar vacía')
      .matches(/^[A-Za-z\s]+$/)
      .withMessage('La marca solo puede contener letras'),

    body('model')
      .custom((value, { req }) => {
        if (req.body.userType === 'passenger' && value) {
          throw new Error('Un pasajero no puede incluir información de un vehículo');
        }
        return true;
      })
      .if(body('userType').equals('driver'))
      .notEmpty()
      .withMessage('El modelo no puede estar vacío')
      .matches(/^[A-Za-z\s]+$/)
      .withMessage('El modelo solo puede contener letras'),
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
      const userRef = db.ref(`users/${req.user.id}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();

      // Validación adicional para archivos subidos
      if (userType === 'driver') {
        if (
          req.files['vehiclePhoto'] ||
          req.files['soatPhoto'] ||
          licensePlate ||
          capacity ||
          brand ||
          model
        ) {
          return res.status(400).json({
            message: 'Un pasajero no puede incluir información de un vehículo',
          });
        }
      }

      const updatedData = {};

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
              const oldFileName = userData.driverInfo.vehiclePhotoURL
                .split('/')
                .pop();
              const oldFile = storage.file(`vehicles/${oldFileName}`);
              await oldFile.delete().catch((error) => {
                console.error(
                  `Error al eliminar la foto del vehículo anterior: ${error}`
                );
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
              const oldFileName = userData.driverInfo.soatPhotoURL
                .split('/')
                .pop();
              const oldFile = storage.file(`soat/${oldFileName}`);
              await oldFile.delete().catch((error) => {
                console.error(
                  `Error al eliminar la foto del SOAT anterior: ${error}`
                );
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
      if (
        (userData.userType === 'driver' || userType === 'driver') &&
        (licensePlate || capacity || brand || model)
      ) {
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
      res
        .status(500)
        .json({ message: 'Error al actualizar el usuario', error });
    }
  }
);

// Endpoint para eliminar el usuario actual
registerRoute.delete('/me', authMiddleware, async (req, res) => {
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
    res
      .status(200)
      .json({ message: 'Usuario y datos asociados eliminados correctamente' });
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    res.status(500).json({ message: 'Error al eliminar el usuario', error });
  }
});

module.exports = registerRoute;
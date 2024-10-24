// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../firebase');
const router = express.Router();

// Registro
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, ...userData } = req.body;

    // Verificar si el usuario ya existe
    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();
    if (!snapshot.empty) {
      return res.status(400).json({ message: 'Usuario ya registrado' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Guardar el usuario en Firestore
    const newUser = {
      email,
      password: hashedPassword,
      role, // 'driver' o 'passenger'
      ...userData,
    };

    const docRef = await db.collection('users').add(newUser);

    // Iniciar sesión
    req.session.userId = docRef.id;

    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: docRef.id });
  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error en el registro' });
  }
});

// Inicio de Sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar el usuario
    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();
    if (snapshot.empty) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const user = snapshot.docs[0].data();
    const userId = snapshot.docs[0].id;

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Iniciar sesión
    req.session.userId = userId;

    res.status(200).json({ message: 'Inicio de sesión exitoso', userId });
  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    res.status(500).json({ message: 'Error en el inicio de sesión' });
  }
});

// Cierre de Sesión
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  });
});

module.exports = router;

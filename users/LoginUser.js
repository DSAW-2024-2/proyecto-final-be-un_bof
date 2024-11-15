const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../firebase');

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  // Validar que los campos no estén vacíos
  if (!email) {
    return res.status(400).json({ message: 'El campo de email es requerido' });
  }

  if (!password) {
    return res.status(400).json({ message: 'El campo de contraseña es requerido' });
  }

  // Validar que el email tenga el formato correcto
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Formato de email inválido' });
  }

  try {
    const userRef = db.ref('users').orderByChild('email').equalTo(email);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const userData = Object.values(snapshot.val())[0];
    const userKey = Object.keys(snapshot.val())[0];

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: userKey, universityID: userData.universityID },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

module.exports = router;
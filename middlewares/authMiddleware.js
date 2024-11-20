// middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const { db } = require('../firebase');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Asegura que haya un token en el encabezado

  if (!token) {
    return res.status(401).json({ message: 'Token not provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    try {
      // Obtener el usuario de la base de datos
      const userSnapshot = await db.ref(`users/${decodedToken.id}`).once('value');
      const userData = userSnapshot.val();

      if (!userData) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Adjuntar los datos completos del usuario a req.user
      req.user = {
        id: decodedToken.id,
        userType: userData.userType,
        // Puedes agregar más propiedades si lo deseas
      };

      next();
    } catch (error) {
      console.error('Error fetching user data:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
};

module.exports = authMiddleware;

// middleware/authMiddleware.js
const authMiddleware = (req, res, next) => {
    if (req.session && req.session.userId) {
      next();
    } else {
      res.status(401).json({ message: 'No autorizado' });
    }
  };
  
  module.exports = authMiddleware;
  
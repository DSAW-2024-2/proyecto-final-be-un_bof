// middlewares/roleMiddleware.js

module.exports = (requiredRole) => {
    return (req, res, next) => {
      // Verificar que el usuario está autenticado y tiene el rol requerido
        if (req.user && req.user.userType === requiredRole) {
            next();
        } else {
        return res.status(403).json({ message: 'Acceso denegado: permisos insuficientes' });
        }
    };
};
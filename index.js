const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Importar rutas
const registerRoute = require('./users/CreateUser.js');
const loginRoute = require('./users/LoginUser.js');

// Usar las rutas
app.use('/register', registerRoute);
app.use('/login', loginRoute);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Path not found' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

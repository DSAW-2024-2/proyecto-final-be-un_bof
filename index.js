const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// Middlewares
const corsOptions = {
  origin: 'http://localhost:3000', // Permitir solo el frontend desde este origen
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Importar rutas
const registerRoute = require('./users/CreateUser.js');
const loginRoute = require('./users/LoginUser.js');
const userRoute = require('./users/LoadUser.js');
const createTripRoute = require('./trips/CreateTrip.js'); // Importamos CreateTrip.js
const listTripsRoute = require('./trips/ListTrips.js'); // Importamos ListTrips.js

// Usar las rutas
app.use('/register', registerRoute);
app.use('/login', loginRoute);
app.use('/', userRoute);
app.use('/trip/create', createTripRoute); // Ruta para crear un viaje
app.use('/trips', listTripsRoute); // Ruta para listar los viajes

// Manejo de rutas no encontradas
//app.use((req, res) => {
  //res.status(404).json({ message: 'Path not found' });
//});

const PORT = 5175;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

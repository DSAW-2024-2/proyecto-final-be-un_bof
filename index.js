// index.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// Middlewares
const corsOptions = {
  origin: 'https://drive2u.vercel.app', // Permitir solo el frontend desde este origen
  origin: ['http://localhost:3000', 'https://drive2u.vercel.app'], // Permitir ambos orígenes
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Importar rutas de usuarios
const registerRoute = require('./users/CreateUser.js');
const loginRoute = require('./users/LoginUser.js');
const userRoute = require('./users/LoadUser.js');

// Importar rutas de viajes
const createTripRoute = require('./trips/CreateTrip.js'); // Ruta para crear un viaje
const listTripsRoute = require('./trips/ListTrips.js'); // Ruta para listar los viajes
const updateTripRoute = require('./trips/UpdateTrip.js'); // Ruta para actualizar un viaje
const deleteTripRoute = require('./trips/DeleteTrip.js'); // Ruta para eliminar un viaje
const driverTripRoute = require('./trips/DriverTrip.js'); // Ruta para obtener el viaje del conductor
const selectTripRoute = require('./trips/SelectTrip.js'); // Ruta para reservar un viaje
const reservationsRoute = require('./trips/Reservations.js'); // Ruta para obtener las reservas del usuario

// Usar las rutas de usuarios
app.use('/register', registerRoute);
app.use('/login', loginRoute);
app.use('/', userRoute);

// Usar las rutas de viajes
app.use('/trip/create', createTripRoute); // Ruta para crear un viaje
app.use('/trips', listTripsRoute); // Ruta para listar los viajes
app.use('/trips', updateTripRoute); // Ruta para actualizar un viaje
app.use('/trips', deleteTripRoute); // Ruta para eliminar un viaje
app.use('/trips', driverTripRoute); // Ruta para obtener el viaje del conductor
app.use('/trips', selectTripRoute); // Ruta para reservar un viaje
app.use('/reservations', reservationsRoute); // Ruta para obtener las reservas del usuario

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Path not found' });
});

// Iniciar el servidor
const PORT = process.env.PORT || 5175;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
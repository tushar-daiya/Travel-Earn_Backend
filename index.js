const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const adminRoutes = require('./router/Admin.route');
const reportRoutes = require('./router/ReportRoute');
const helmet = require('helmet')

dotenv.config();
const app = express();

// CORS Configuration - Restricting to a specific domain
const corsOptions = {
  origin: 'https://admin.timestringssystem.com', // Only allow this domain
  methods: 'GET,POST,PUT,DELETE', // Allowed methods
  allowedHeaders: 'Content-Type, Authorization', // Allowed headers
  credentials: true, // If using cookies or authentication headers
};

app.use(express.json());



// Middlewares
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors({corsOptions}));

// Handle Preflight OPTIONS request (for methods other than GET, POST)
app.options('*', cors(corsOptions));


const PORT = process.env.PORT || 5002;
const Mongo_URI = process.env.MONGO_URI;

// console.log(`Mongo_URI: ${Mongo_URI}`);
// console.log(`JWT Secret: ${process.env.JWT_SECRET}`);
// console.log(`Port: ${PORT}`);

mongoose.connect(Mongo_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000, // 30 seconds
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2, // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Maximum time a connection can be idle
  retryWrites: true,
  retryReads: true,
  w: 'majority', // Write concern
  readPreference: 'primary'
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Add connection event listeners for better error handling
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

app.use('/admin', adminRoutes);
app.use('/report', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatusText[dbStatus] || 'unknown',
      readyState: dbStatus
    },
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.send('Welcome to the server!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

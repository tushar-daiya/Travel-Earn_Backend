const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const adminRoutes = require('./router/Admin.route');
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
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the server!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

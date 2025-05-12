const express = require('express');
const mongoose = require('mongoose');
const https = require('https');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const adminRoutes = require('./router/Admin.route')
const fs = require('fs')


dotenv.config();
const app = express();
app.use(express.json());

const options = {
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem'),
};


// Middlewares
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const PORT = process.env.PORT || 5000;
const Mongo_URI = process.env.MONGO_URI;
console.log(`Mongo_URI: ${Mongo_URI}`);
console.log(`JWT Secret: ${process.env.JWT_SECRET}`);
console.log(`Port: ${PORT}`);



mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the server!');
});

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS server running with Cloudflare origin cert');
});

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dns = require('dns');
const prometheus = require('prom-client');

const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydatabase', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Define schema
const querySchema = new mongoose.Schema({
  client_ip: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  addresses: [String], // Array to store resolved IPv4 addresses
});

// Define model
const Query = mongoose.model('Query', querySchema);

app.use(bodyParser.json());

// Define the metric variables outside of the generateMetrics function
const httpRequestCounter = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status_code', 'endpoint_path'],
});

const healthGauge = new prometheus.Gauge({
  name: 'health_status',
  help: 'Health status of the service (1 = healthy, 0 = unhealthy)',
});

// Your Prometheus metrics logic here, according to prometheus metrics format
async function generateMetrics() {
  // Example: Set health gauge to 1 (healthy)
  healthGauge.set(1);

  // Return the metrics as a string
  return prometheus.register.metrics();
}

// Prometheus Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await generateMetrics(); // This function should return the metrics as a string
    res.set('Content-Type', prometheus.register.contentType);
    res.end(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

// Root endpoint
app.get('/', async (req, res) => {
  try {
    // Increment HTTP request counter
    httpRequestCounter.inc({ method: 'GET', status_code: '200', endpoint_path: '/' });
    
    const responseData = {
      version: '1.0',
      date: Math.floor(new Date().getTime() / 1000),
      kubernetes: process.env.KUBERNETES_SERVICE_HOST ? true : false,
    };
    res.json(responseData);
  } catch (error) {
    console.error('Error handling root endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Health endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Increment HTTP request counter
    httpRequestCounter.inc({ method: 'GET', status_code: '200', endpoint_path: '/health' });
    
    // Respond with health status
    res.json({ 
      status: 'OK',
      database: dbStatus,
    });
  } catch (error) {
    console.error('Error handling health endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Tools - Lookup endpoint
app.get('/v1/tools/lookup', async (req, res) => {
  try {
    // Increment HTTP request counter
    httpRequestCounter.inc({ method: 'GET', status_code: '200', endpoint_path: '/v1/tools/lookup' });

    const { domain } = req.query;

    // Check if domain parameter is missing or invalid
    if (!domain || typeof domain !== 'string' || domain.trim() === '') {
      return res.status(400).json({ message: 'Bad Request - Invalid or missing domain parameter' });
    }

    // Perform domain lookup logic to resolve IPv4 addresses
    dns.resolve(domain, 'A', async (err, addresses) => {
      if (err) {
        console.error('Error resolving domain:', err);
        return res.status(404).json({ message: 'Error resolving domain, domain not found' });
      }

      // Log the query to MongoDB
      try {
        if (addresses.length === 0) {
          return res.status(404).json({ message: 'No IPv4 addresses found for the domain' });
        }
        
        const queryData = {
          addresses: addresses.filter(addr => addr.includes('.')), // Filter only IPv4 addresses
          client_ip: req.ip,
          domain: domain,
          created_at: new Date(),
        };
        await Query.create(queryData);
        res.json(queryData);
      } catch (error) {
        console.error('Error logging query to database:', error);
        res.status(500).json({ message: 'Error logging query to database' });
      }
    });
  } catch (error) {
    console.error('Error handling lookup endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Tools - Validate endpoint
app.post('/v1/tools/validate', async (req, res) => {
  try {
    // Increment HTTP request counter
    httpRequestCounter.inc({ method: 'POST', status_code: '200', endpoint_path: '/v1/tools/validate' });

    const { ip } = req.body;

    // Check if ip parameter is missing or invalid
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ message: 'Bad Request - Invalid or missing IP address parameter' });
    }

    // Validate if the input is a valid IPv4 address
    const status = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
    
    res.json({ status });
  } catch (error) {
    console.error('Error handling validate endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// History endpoint
app.get('/v1/history', async (req, res) => {
  try {
    // Increment HTTP request counter
    httpRequestCounter.inc({ method: 'GET', status_code: '200', endpoint_path: '/v1/history' });

    // Check for unexpected query parameters
    if (Object.keys(req.query).length > 0) {
      return res.status(400).json({ message: 'Bad Request - Unexpected query parameters' });
    }

    // Fetch latest 20 queries from MongoDB, excluding _id and __v fields
    const queries = await Query.find().sort({ created_at: -1 }).limit(20).select('-_id -__v');
    res.json(queries);
  } catch (error) {
    console.error('Error handling history endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Define a route for clearing history
app.post('/v1/history/clear', async (req, res) => {
  try {
    // Increment HTTP request counter
    httpRequestCounter.inc({ method: 'GET', status_code: '200', endpoint_path: '/v1/history/clear' });

    // Execute the deleteMany() operation to remove all documents from the Query collection
    const deleteResult = await Query.deleteMany({});
    console.log('History cleared successfully:', deleteResult.deletedCount, 'documents deleted.');
    res.status(200).json({ message: 'History cleared successfully.' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle 404 Not Found
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});



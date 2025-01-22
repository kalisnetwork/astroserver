import express from 'express';
import cors from 'cors';
import astrologyRoutes from './routes/astrologyRoutes.js';
import scrapingRoutes from './routes/scrapingRoutes.js';
import { errorHandler } from './utils/errorHandler.js';

const app = express();
const PORT = 1316;

// Middleware to parse JSON requests
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Routes
app.use('/api', astrologyRoutes);
app.use('/api', scrapingRoutes); // Use the new routes

// Error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

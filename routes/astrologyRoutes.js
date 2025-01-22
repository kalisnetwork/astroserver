import express from 'express';
import {
    getD27Chart,
    getD30Chart,
    getHoroscopeChart,
} from '../controllers/astrologyController.js';

const router = express.Router();

// D27 Chart Route
router.post('/d27-chart', getD27Chart);

// D30 Chart Route
router.post('/d30-chart', getD30Chart);

// Horoscope Chart Route
router.post('/horoscope-chart', getHoroscopeChart);

export default router;
import express from 'express';
import { getDailyHoroscopes, getDailyPanchangam } from '../controllers/scrapingController.js';

const router = express.Router();

router.get('/daily-horoscopes', getDailyHoroscopes);
router.get('/daily-panchangam', getDailyPanchangam);

export default router;
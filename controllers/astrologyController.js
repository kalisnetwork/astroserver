import axios from 'axios';

// Your Free Astrology API key
const API_KEY = 'TNytRvw9qo5LcIIvtxwowdASYzR8ggEaTrpgS94d';

// Base URL for Free Astrology API
const BASE_URL = 'https://json.apiastro.com';

// Generic function to fetch chart data
const fetchChartData = async (url, body) => {
    const response = await axios.post(url, body, {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
        },
    });

    // Log the entire response for debugging
    console.log('API Response:', response.data);

    // Check if the response is valid and contains the SVG data
    if (response.data && response.data.output) {
        // Fix escaped quotes in the SVG response
        return response.data.output.replace(/\\"/g, '"');
    } else {
        throw new Error('Invalid response format: Expected SVG data in "output" field');
    }
};

// Get D27 Chart
export const getD27Chart = async (req, res, next) => {
    try {
        const svgData = await fetchChartData(`${BASE_URL}/d27-chart-svg-code`, req.body);
        res.set('Content-Type', 'image/svg+xml');
        res.send(svgData);
    } catch (error) {
        console.error('Error fetching D27 Chart:', error.message);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        next(error);
    }
};

// Get D30 Chart
export const getD30Chart = async (req, res, next) => {
    try {
        const svgData = await fetchChartData(`${BASE_URL}/d30-chart-svg-code`, req.body);
        res.set('Content-Type', 'image/svg+xml');
        res.send(svgData);
    } catch (error) {
        console.error('Error fetching D30 Chart:', error.message);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        next(error);
    }
};

// Get Horoscope Chart
export const getHoroscopeChart = async (req, res, next) => {
    try {
        const svgData = await fetchChartData(`${BASE_URL}/horoscope-chart-svg-code`, req.body);
        res.set('Content-Type', 'image/svg+xml');
        res.send(svgData);
    } catch (error) {
        console.error('Error fetching Horoscope Chart:', error.message);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        next(error);
    }
};
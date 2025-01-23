import axios from 'axios';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';
import cron from 'node-cron';

const signs = [
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces",
];

// Initialize node-cache with a 24-hour TTL (time-to-live)
const cache = new NodeCache({ stdTTL: 24 * 60 * 60, checkperiod: 120 });

const scrapeAstroSageDailyHoroscope = async (sign, retryCount = 0, maxRetries = 3) => {
    const url = `https://www.astrosage.com/horoscope/daily-${sign}-horoscope.asp`;
    
    try {
        const response = await axios.get(url, { 
            timeout: 10000, // Increased timeout to 10 seconds
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (response.status !== 200) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const $ = cheerio.load(response.data);

        const horoscopeTitle = $('.ui-sign-heading h1').text().trim();
        const horoscopeDate = $('.ui-large-hdg').text().trim();

        const horoscopeDiv = $('.ui-large-content.text-justify');
        const horoscopeText = horoscopeDiv.length > 0 ? horoscopeDiv.first().text().trim() : "";

        const extractDetail = (keyword) => {
            const element = $(`.ui-large-content.text-justify:contains("${keyword}")`);
            const text = element.text();
            return text.replace(`${keyword} :- `, '').trim();
        };

        return {
            title: horoscopeTitle,
            date: horoscopeDate,
            text: horoscopeText,
            luckyNumber: extractDetail('Lucky Number'),
            luckyColor: extractDetail('Lucky Color'),
            remedy: extractDetail('Remedy')
        };
    } catch (error) {
        console.error(`Error scraping ${sign} horoscope (attempt ${retryCount + 1}):`, error.message);
        
        if (retryCount < maxRetries) {
            console.log(`Retrying ${sign} horoscope scraping`);
            // Add a random delay to prevent potential rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return await scrapeAstroSageDailyHoroscope(sign, retryCount + 1, maxRetries);
        } else {
            console.error(`Max retries exceeded for ${sign} horoscope.`);
            return null;
        }
    }
};

const fetchAllDailyHoroscopesConcurrently = async () => {
    try {
        // Use Promise.all for concurrent fetching
        const horoscopePromises = signs.map(sign => 
            scrapeAstroSageDailyHoroscope(sign)
        );

        // Fetch all horoscopes concurrently
        const horoscopesArray = await Promise.all(horoscopePromises);

        // Convert array to object
        const horoscopes = {};
        signs.forEach((sign, index) => {
            horoscopes[sign] = horoscopesArray[index];
        });

        return horoscopes;
    } catch (error) {
        console.error('Error in concurrent horoscope fetching:', error);
        throw error;
    }
};

// Function to get or fetch horoscopes
const getOrFetchHoroscopes = async () => {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `dailyHoroscopes-${today}`;
    
    // Check if we have cached data
    const cachedData = cache.get(cacheKey);
    
    // If we have valid cached data, return it
    if (cachedData && !cachedData.loading && Object.keys(cachedData).length > 1) {
        return cachedData;
    }
    
    // Otherwise, fetch new horoscopes
    try {
        const horoscopes = await fetchAllDailyHoroscopesConcurrently();
        
        // Cache the new horoscopes
        const dataToCache = { 
            ...horoscopes, 
            timestamp: new Date().toISOString(),
            loading: false 
        };
        
        cache.set(cacheKey, dataToCache);
        
        return dataToCache;
    } catch (error) {
        console.error('Error fetching horoscopes:', error);
        return { error: 'Failed to fetch horoscopes', loading: false };
    }
};

// Automatic refresh function
const setupHoroscopeRefresh = () => {
    // Schedule a daily refresh at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('Automatically refreshing daily horoscopes');
        try {
            await getOrFetchHoroscopes();
        } catch (error) {
            console.error('Scheduled horoscope refresh failed:', error);
        }
    });

    // Also set up an initial fetch when the server starts
    getOrFetchHoroscopes();
};

// Express route handler
export const getDailyHoroscopes = async (req, res, next) => {
    try {
        const horoscopes = await getOrFetchHoroscopes();
        res.json(horoscopes);
    } catch (error) {
        console.error('Error in getDailyHoroscopes:', error);
        next(error);
    }
};

// Initialize the automatic refresh when the module is imported
setupHoroscopeRefresh();

export { cache }; // Export cache for potential manual management if needed


// Separate cache for tracking refresh attempts
const refreshCache = new NodeCache({ stdTTL: 86400, checkperiod: 120 }); // 24 hours
const panchangamCache = new NodeCache({ stdTTL: 86400, checkperiod: 120 }); // 24 hours

const scrapeDailyPanchangam = async (date, retryCount = 0, maxRetries = 3) => {
    const url = `https://telugu.panchangam.org/dailypanchangam.php?date=${date}`;
    
    try {
        const response = await axios.get(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (response.status !== 200) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const $ = cheerio.load(response.data);

        const panchangamData = {};

        // Extract the date from the table header
        panchangamData.date = $('h3.panel-title').text().trim();

        // Extract general information (City, Sunrise, Sunset, etc.)
        panchangamData.generalInfo = {
            city: $('td:contains("City")').next('td').text().trim(),
            sunrise: $('td:contains("Sunrise")').next('td').text().trim(),
            sunset: $('td:contains("Sunset")').next('td').text().trim(),
            month: $('td:contains("Month")').next('td').text().trim(),
            paksham: $('td:contains("Paksham")').next('td').text().trim(),
        };

        // Function to extract time ranges for Tithi, Nakshatram, Yogam, and Karanam
        const extractTimeRanges = (label, $) => {
            const cellContent = $(`td:contains("${label}")`).next('td').html();
            if (!cellContent) return [];

            // Split the content by <br> tags to handle multiple lines
            const lines = cellContent.split('<br>').map(line => line.trim()).filter(Boolean);

            return lines.map(line => {
                // Match the pattern: "Label: Start Date Start Time to End Date End Time"
                const regex = /([^:]+)\s*:\s*([A-Za-z]+\s+\d+\s+\d+:\d+\s*[AP]M\s+to\s+[A-Za-z]+\s+\d+\s+\d+:\d+\s*[AP]M)/;
                const match = line.match(regex);

                if (match) {
                    return {
                        [label.toLowerCase()]: match[1].trim(),
                        time: match[2].trim()
                    };
                } else {
                    console.warn(`No match found for line: ${line}`);
                    return null;
                }
            }).filter(Boolean); // Remove null entries
        };

        // Extract Panchangam details
        panchangamData.panchangamDetails = {
            tithi: extractTimeRanges('Tithi', $),
            nakshatram: extractTimeRanges('Nakshatram', $),
            yogam: extractTimeRanges('Yogam', $),
            karanam: extractTimeRanges('Karanam', $),
        };

        // Extract "Time to Avoid" details
        panchangamData.timeToAvoid = {
            rahukalam: $('td:contains("Rahukalam")').next('td').text().trim(),
            yamagandam: $('td:contains("Yamagandam")').next('td').text().trim(),
            varjyam: $('td:contains("Varjyam")').next('td').text().trim(),
            gulika: $('td:contains("Gulika")').next('td').text().trim(),
        };

        // Extract "Good Time" details
        panchangamData.goodTime = {
            amritakalam: $('td:contains("Amritakalam")').next('td').text().trim(),
            abhijitMuhurtham: $('td:contains("Abhijit Muhurtham")').next('td').text().trim(),
        };

        return panchangamData;
    } catch (error) {
        console.error(`Error scraping Panchangam for ${date}:`, error.message);
        
        if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return await scrapeDailyPanchangam(date, retryCount + 1, maxRetries);
        }
        return null;
    }
};

const getOrFetchPanchangam = async (date) => {
    const cacheKey = `panchangam-${date}`;
    
    // Check cached data
    const cachedData = panchangamCache.get(cacheKey);
    if (cachedData) return cachedData;
    
    try {
        const panchangamData = await scrapeDailyPanchangam(date);
        
        const dataToCache = { 
            ...panchangamData, 
            timestamp: new Date().toISOString(),
        };
        
        panchangamCache.set(cacheKey, dataToCache);
        
        return dataToCache;
    } catch (error) {
        console.error('Error fetching Panchangam:', error);
        return { error: 'Failed to fetch Panchangam' };
    }
};

const setupPanchangamRefresh = () => {
    // Schedule a daily refresh at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('Attempting daily Panchangam refresh');
        try {
            // Get today's date in YYYY-MM-DD format
            const today = new Date().toISOString().split('T')[0];
            await getOrFetchPanchangam(today);
        } catch (error) {
            console.error('Scheduled Panchangam refresh failed:', error);
        }
    });

    // Initial fetch when server starts (for today's date)
    const today = new Date().toISOString().split('T')[0];
    getOrFetchPanchangam(today);
};

export const getDailyPanchangam = async (req, res, next) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: "Date is required in query parameter (e.g., ?date=2024-01-22)" });
    }

    try {
        const panchangamData = await getOrFetchPanchangam(date);
        res.json(panchangamData);
    } catch (error) {
        console.error('Error in getDailyPanchangam:', error);
        next(error);
    }
};

// Initialize the automatic refresh when the module is imported
setupPanchangamRefresh();

export { panchangamCache };
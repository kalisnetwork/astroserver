import axios from 'axios';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';

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
const cache = new NodeCache({ stdTTL: 24 * 60 * 60, checkperiod: 120 }); //check every 2 mins to delete expired cache, for safety we make check period half of the ttl

const scrapeAstroSageDailyHoroscope = async (sign, retryCount = 0, maxRetries = 3) => {
    const url = `https://www.astrosage.com/horoscope/daily-${sign}-horoscope.asp`;
    console.log("Fetching Url:", url);

    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await axios.get(url, { timeout: 5000 });
        console.log("Response Status:", response.status);
        if (response.status !== 200) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const html = response.data;
        console.log("HTML Content:", html.slice(0, 200));
        const $ = cheerio.load(html);
        console.log("Parsed HTML:", $);

        const horoscopeTitle = $('.ui-sign-heading h1').text().trim();
        const horoscopeDate = $('.ui-large-hdg').text().trim();

        const horoscopeDiv = $('.ui-large-content.text-justify');
        let horoscopeText = "";
        if (horoscopeDiv.length > 0) {
            horoscopeText = horoscopeDiv.first().text().trim();
        }
        const luckyNumberElement = $('.ui-large-content.text-justify:contains("Lucky Number :- ")');
        const luckyNumberText = luckyNumberElement.text();
        const luckyNumber = luckyNumberText.replace('Lucky Number :- ', '').trim();

        const luckyColorElement = $('.ui-large-content.text-justify:contains("Lucky Color :- ")');
        const luckyColorText = luckyColorElement.text();
        const luckyColor = luckyColorText.replace('Lucky Color :- ', '').trim();

        const remedyElement = $('.ui-large-content.text-justify:contains("Remedy :- ")');
        const remedyText = remedyElement.text();
        const remedy = remedyText.replace('Remedy :- ', '').trim();

        console.log('horoscopeDiv:', horoscopeDiv.length);

        return {
            title: horoscopeTitle,
            date: horoscopeDate,
            text: horoscopeText,
            luckyNumber: luckyNumber,
            luckyColor: luckyColor,
            remedy: remedy
        };
    } catch (error) {
        console.error(`Error scraping ${sign} horoscope (attempt ${retryCount + 1}):`, error.message);
        if (retryCount < maxRetries) {
            console.log(`Retrying ${sign} horoscope scraping`);
            return await scrapeAstroSageDailyHoroscope(sign, retryCount + 1, maxRetries);
        } else {
            console.error(`Max retries exceeded for ${sign} horoscope.`);
            return null;
        }
    }
};

const fetchAllDailyHoroscopesSequentially = async () => {
    const horoscopes = {};
    for (const sign of signs) {
        const horoscope = await scrapeAstroSageDailyHoroscope(sign);
        horoscopes[sign] = horoscope;
    }
    return horoscopes;
};

export const getDailyHoroscopes = async (req, res, next) => {
    try {
        const cachedData = cache.get('dailyHoroscopes');

        if (cachedData && !cachedData.loading) {
            console.log("Serving from cache");
            return res.json({ ...cachedData, loading: false });
        }

        if (cachedData && cachedData.loading) {
            console.log("Serving from cache and loading");
            return res.json({ ...cachedData, loading: true });
        }

        console.log("Cache invalid or empty, fetching new horoscopes");
        cache.set('dailyHoroscopes', { loading: true });
        res.json({ loading: true });
        fetchAllDailyHoroscopesSequentially()
            .then((horoscopes) => {
                cache.set('dailyHoroscopes', { ...horoscopes, loading: false });
                console.log("New Data fetched in background");
            })
            .catch((error) => {
                console.error("Error fetching in background", error);
                cache.set('dailyHoroscopes', { loading: false })
            });


    } catch (error) {
        console.error('Error fetching daily horoscopes', error);
        next(error);
    }
};

const scrapeDailyPanchangam = async (date) => {
    const url = `https://telugu.panchangam.org/dailypanchangam.php?date=${date}`;
    console.log("Fetching Panchangam Url:", url);
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await axios.get(url, { timeout: 5000 });
        console.log("Response Status:", response.status);
        if (response.status !== 200) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const html = response.data;
        console.log("HTML Content:", html.slice(0, 200));
        const $ = cheerio.load(html);
        console.log("Parsed HTML:", $);

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
        console.error(`Error scraping Panchangam data for ${date}:`, error.message);
        return null;
    }
};


export const getDailyPanchangam = async (req, res, next) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: "Date is required in query parameter (e.g., ?date=2024-01-22)" });
    }

    try {
        const cacheKey = `panchangam-${date}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData && !cachedData.loading) {
            console.log("Serving from cache");
            return res.json({ ...cachedData, loading: false });
        }
        if (cachedData && cachedData.loading) {
            console.log("Serving from cache and loading");
            return res.json({ ...cachedData, loading: true });
        }
        console.log("Cache invalid or empty, fetching new panchangam");
        cache.set(cacheKey, { loading: true });
        res.json({ loading: true })
        scrapeDailyPanchangam(date)
            .then((panchangamData) => {
                if (panchangamData) {
                    cache.set(cacheKey, { ...panchangamData, loading: false });
                    console.log("New panchangam Data fetched in background");
                } else {
                    cache.set(cacheKey, { loading: false });
                }

            })
            .catch((error) => {
                console.error("Error fetching panchangam data in background", error);
                cache.set(cacheKey, { loading: false });
            })
    } catch (error) {
        console.error('Error fetching daily panchangam', error);
        next(error)
    }
};
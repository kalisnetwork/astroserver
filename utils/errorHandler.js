export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Error details:', err.stack); // Log full error stack for debugging


     // Check for specific axios error types
    if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Axios response error:", err.response.data);
        console.error("Axios response status:", err.response.status);
         return res.status(err.response.status || 500).json({
            error: err.message || 'Something went wrong with the server response.',
            details: err.response.data
        });
    } else if (err.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error("Axios request error:", err.request);
         return res.status(500).json({
            error: 'No response received from the server. Check your network connection.',
             details: err.request
        });
    } else if (err.code === 'ECONNABORTED') {
        console.error("Axios request timeout:", err.message);
        return res.status(504).json({
            error: 'Request timed out. Please try again later.',
            details: err.message
        })
    } else {
          // Something happened in setting up the request that triggered an Error
         return res.status(500).json({
            error: err.message || 'Something went wrong on the server. Please try again later.',
            details: err.message
        });
    }


};
const axios = require('axios');

const actionDetails = {
    side: "Defender",
    action: "Virus Protection",
    location: "Fire/Police",
    current_compromise: 0
};

console.log("Sending request...");
axios.post('http://127.0.0.1:4000/process_action', actionDetails)
    .then(response => {
        console.log("Success!");
        console.log(response.data);
    })
    .catch(error => {
        console.error("Error:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    });

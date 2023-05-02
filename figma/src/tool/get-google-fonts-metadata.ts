const https = require("https");
const fs = require("fs");

require("dotenv").config();
const API_KEY = process.env.GOOGLE_FONTS_API_KEY;

const options = {
  host: "www.googleapis.com",
  path: "/webfonts/v1/webfonts?key=" + API_KEY,
  method: "GET",
  headers: { Accept: "application/json" },
};

const req = https.request(options, (resp) => {
  let data = "";

  resp.on("data", (chunk) => {
    data += chunk;
  });

  resp.on("end", () => {
    try {
      let json = JSON.parse(data);
      fs.writeFile(
        "./data/google-fonts-metadata.json",
        JSON.stringify(json),
        (err) => {
          // In case of a error throw err.
          if (err) throw err;
        }
      );
    } catch (error) {
      console.error(error.message);
    }
  });
});

req.on("error", (err) => {
  console.log("Error: " + err.message);
});

req.end();

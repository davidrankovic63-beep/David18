const express = require("express");
const path = require("path");
const { google } = require("googleapis");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

require("dotenv").config();

const app = express();

const PORT = 3000;

const DRIVE_FOLDER_ID =
    "1-tJQz_8swOjjVlpwCR-JWVm4H7uOdp30";

const TOKEN_PATH = path.join(
    __dirname,
    "data",
    "token.json"
);


// Učitavanje Google tokena
function loadTokens() {

    if (!fs.existsSync(TOKEN_PATH)) {
        return null;
    }

    const data = fs.readFileSync(
        TOKEN_PATH,
        "utf8"
    );

    return JSON.parse(data);
}


// Čuvanje Google tokena
function saveTokens(tokens) {

    fs.writeFileSync(
        TOKEN_PATH,
        JSON.stringify(tokens, null, 2)
    );
}


// Google OAuth
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);


// ==========================================
// GOOGLE AUTORIZACIJA
// ==========================================

// Na Renderu koristimo refresh token iz Environment Variables.
// Lokalno, ako njega nema, koristimo token.json.

const savedTokens = loadTokens();

if (process.env.GOOGLE_REFRESH_TOKEN) {

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

} else if (savedTokens) {

    oauth2Client.setCredentials(savedTokens);

}


// Google login
app.get("/auth", (req, res) => {

    const authUrl =
        oauth2Client.generateAuthUrl({

            access_type: "offline",

            scope: [
                "https://www.googleapis.com/auth/drive.file"
            ],

            prompt: "consent"
        });

    res.redirect(authUrl);
});


// Google callback
app.get("/oauth2callback", async (req, res) => {

    const code = req.query.code;

    if (!code) {

        return res.send(
            "Nedostaje Google authorization code."
        );
    }

    try {

        const { tokens } =
            await oauth2Client.getToken(code);

        saveTokens(tokens);

        oauth2Client.setCredentials(tokens);

        console.log(
            "Google autorizacija uspešna!"
        );

        res.send(`
            <h1>Google Drive je povezan! ✅</h1>
            <p>Autorizacija je uspešno sačuvana.</p>
        `);

    } catch (error) {

        console.error(error);

        res.status(500).send(
            "Greška prilikom Google autorizacije."
        );
    }
});


// ==========================================
// UPLOAD FOTOGRAFIJA
// ==========================================

const upload = multer({
    dest: path.join(__dirname, "temp")
});


app.post(
    "/upload",
    upload.array("photos", 20),
    async (req, res) => {

        try {

            if (!req.files || req.files.length === 0) {

                return res.status(400).json({
                    success: false,
                    message: "Nema fotografija."
                });

            }

            const drive =
                google.drive({
                    version: "v3",
                    auth: oauth2Client
                });


            for (const file of req.files) {

                const extension =
                    path.extname(file.originalname);

                const safeName =
                    path.basename(
                        file.originalname,
                        extension
                    );

                const newName =
                    `${safeName}_${uuidv4()}${extension}`;


                await drive.files.create({

                    requestBody: {

                        name: newName,

                        parents: [
                            DRIVE_FOLDER_ID
                        ]

                    },

                    media: {

                        mimeType: file.mimetype,

                        body: fs.createReadStream(
                            file.path
                        )

                    },

                    fields: "id, name"

                });


                fs.unlinkSync(file.path);
            }


            res.json({

                success: true,

                message:
                    "Fotografije su uspešno poslate!"

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Greška prilikom slanja fotografija."

            });

        }

    }
);


// ==========================================
// PRIKAZ SAJTA
// ==========================================

app.use(
    express.static(
        path.join(__dirname, "..")
    )
);


// ==========================================
// POKRETANJE SERVERA
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Server radi na http://localhost:${PORT}`
    );

});

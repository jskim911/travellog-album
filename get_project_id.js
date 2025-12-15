const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/VITE_FIREBASE_PROJECT_ID\s*=\s*(.*?)(\r|\n|$)/);
        if (match && match[1]) {
            console.log("PROJECT_ID:" + match[1].trim());
        } else {
            console.log("PROJECT_ID_NOT_FOUND");
        }
    } else {
        console.log("ENV_FILE_NOT_FOUND");
    }
} catch (e) {
    console.error(e);
}

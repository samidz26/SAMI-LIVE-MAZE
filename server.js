import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ========================================
// إعدادات Express
// ========================================

app.use(express.json());

app.use(express.static(
    path.join(__dirname, "public")
));


// ========================================
// الصفحة الرئيسية
// ========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});


// ========================================
// اختبار السيرفر
// ========================================

app.get("/api/status", (req, res) => {

    res.json({
        success: true,
        game: "SAMI LIVE MAZE",
        status: "online"
    });

});


// ========================================
// تشغيل السيرفر
// ========================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `SAMI LIVE MAZE running on port ${PORT}`
    );

});

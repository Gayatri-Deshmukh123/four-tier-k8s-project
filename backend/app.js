const express = require("express");
const mysql = require("mysql2/promise");
const redis = require("redis");

const app = express();
app.use(express.json());

const PORT = 3000;

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST || "db-primary",
    user: process.env.DB_USER || "appuser",
    password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "studentdb",
    waitForConnections: true,
    connectionLimit: 10
});

// Redis connection
const cache = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || "redis"}:6379`
});

cache.on("error", err => console.log("Redis error:", err.message));

async function start() {
    await cache.connect();

    app.get("/health", (req, res) => {
        res.json({ status: "healthy" });
    });

    // GET students - Redis cache
    app.get("/api/students", async (req, res) => {
        try {
            const cached = await cache.get("students");

            if (cached) {
                console.log("CACHE HIT");
                return res.json(JSON.parse(cached));
            }

            console.log("CACHE MISS");

            const [rows] = await db.query(
                "SELECT * FROM students ORDER BY id"
            );

            await cache.set("students", JSON.stringify(rows), {
                EX: 60
            });

            res.json(rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to retrieve students" });
        }
    });

    // ADD student
    app.post("/api/students", async (req, res) => {
        try {
            const { name, email, course } = req.body;

            if (!name || !email || !course) {
                return res.status(400).json({ error: "All fields required" });
            }

            const [result] = await db.query(
                "INSERT INTO students (name, email, course) VALUES (?, ?, ?)",
                [name, email, course]
            );

            // Invalidate cache
            await cache.del("students");

            res.status(201).json({
                id: result.insertId,
                name,
                email,
                course
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to add student" });
        }
    });

    // DELETE student
    app.delete("/api/students/:id", async (req, res) => {
        try {
            await db.query("DELETE FROM students WHERE id = ?", [req.params.id]);

            // Invalidate cache
            await cache.del("students");

            res.json({ message: "Student deleted" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to delete student" });
        }
    });

    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error("Startup failed:", err);
    process.exit(1);
});

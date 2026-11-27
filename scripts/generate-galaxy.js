
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.GH_TOKEN;
const USERNAME = process.env.GITHUB_USER;

if (!TOKEN || !USERNAME) {
    throw new Error("GH_TOKEN and GITHUB_USER are required");
}

const OUTPUT_DIR = path.join(__dirname, "..", "assets");
const OUTPUT_FILE = path.join(
    OUTPUT_DIR,
    "contribution-galaxy.svg"
);

const WIDTH = 1200;
const HEIGHT = 460;

async function fetchContributions() {
    const query = `
        query($username: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $username) {
                contributionsCollection(from: $from, to: $to) {
                    contributionCalendar {
                        totalContributions
                        weeks {
                            contributionDays {
                                date
                                contributionCount
                            }
                        }
                    }
                }
            }
        }
    `;

    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 364);

    const response = await fetch(
        "https://api.github.com/graphql",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query,
                variables: {
                    username: USERNAME,
                    from: from.toISOString(),
                    to: to.toISOString()
                }
            })
        }
    );

    if (!response.ok) {
        throw new Error(
            `GitHub API error: ${response.status} ${response.statusText}`
        );
    }

    const result = await response.json();

    if (result.errors?.length) {
        throw new Error(
            result.errors.map(e => e.message).join("; ")
        );
    }

    const calendar =
        result.data?.user?.contributionsCollection
            ?.contributionCalendar;

    if (!calendar) {
        throw new Error("Could not retrieve contribution calendar");
    }

    const days = calendar.weeks.flatMap(week =>
        week.contributionDays
    );

    return {
        days,
        total: calendar.totalContributions
    };
}

function random(seed) {
    let value = seed;

    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

function escapeXml(value) {
    return String(value).replace(/[<>&'"]/g, char => ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;"
    })[char]);
}

function createGalaxy(days, total) {
    const rand = random(42);

    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2 + 5;

    const maxCount = Math.max(
        1,
        ...days.map(day => day.contributionCount)
    );

    const stars = [];

    // Generate contribution stars
    days.forEach((day, index) => {
        const progress = index / Math.max(1, days.length - 1);

        const angle =
            progress * Math.PI * 12 +
            (rand() - 0.5) * 0.35;

        const radius =
            35 + progress * 350 +
            rand() * 18;

        const depth = (rand() - 0.5) * 130;

        const count = day.contributionCount;

        // 3D perspective projection
        const perspective = 1 + depth / 650;

        const x =
            centerX +
            Math.cos(angle) * radius * perspective;

        const y =
            centerY +
            Math.sin(angle) * radius * 0.36 * perspective +
            depth * 0.48;

        const intensity = count / maxCount;

        const starSize =
            count === 0
                ? 0.7
                : 1.1 + intensity * 4.5;

        const colors = [
            "#253c83",
            "#3478ed",
            "#00d9ff",
            "#8b5cf6",
            "#c084fc"
        ];

        const colorIndex = Math.min(
            colors.length - 1,
            Math.floor(intensity * colors.length)
        );

        const color = count === 0
            ? "#35405e"
            : colors[colorIndex];

        const opacity = count === 0
            ? 0.35
            : 0.55 + intensity * 0.45;

        stars.push(`
            <circle
                cx="${x.toFixed(2)}"
                cy="${y.toFixed(2)}"
                r="${starSize.toFixed(2)}"
                fill="${color}"
                opacity="${opacity.toFixed(2)}"
            >
                <title>
                    ${escapeXml(day.date)}:
                    ${count} contributions
                </title>
            </circle>
        `);

        // Glow for active contribution days
        if (count > 0) {
            stars.push(`
                <circle
                    cx="${x.toFixed(2)}"
                    cy="${y.toFixed(2)}"
                    r="${(starSize * 2.8).toFixed(2)}"
                    fill="${color}"
                    opacity="${(intensity * 0.16).toFixed(2)}"
                />
            `);
        }
    });

    // Background cosmic particles
    const particles = [];

    for (let i = 0; i < 150; i++) {
        const x = rand() * WIDTH;
        const y = rand() * HEIGHT;
        const size = 0.4 + rand() * 1.3;

        particles.push(`
            <circle
                cx="${x.toFixed(2)}"
                cy="${y.toFixed(2)}"
                r="${size.toFixed(2)}"
                fill="#b9caff"
                opacity="${(0.15 + rand() * 0.55).toFixed(2)}"
            />
        `);
    }

    // Galaxy orbital rings
    const rings = [];

    [100, 180, 260, 340].forEach((radius, index) => {
        rings.push(`
            <ellipse
                cx="${centerX}"
                cy="${centerY}"
                rx="${radius}"
                ry="${radius * 0.36}"
                fill="none"
                stroke="${index % 2 === 0 ? "#3878db" : "#8054e8"}"
                stroke-width="0.8"
                opacity="0.16"
                transform="rotate(-12 ${centerX} ${centerY})"
            />
        `);
    });

    return `
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${WIDTH}"
        height="${HEIGHT}"
        viewBox="0 0 ${WIDTH} ${HEIGHT}"
        role="img"
        aria-label="3D GitHub Contribution Galaxy"
    >
        <defs>
            <radialGradient id="space">
                <stop offset="0%" stop-color="#101c3b"/>
                <stop offset="65%" stop-color="#070b1b"/>
                <stop offset="100%" stop-color="#03050d"/>
            </radialGradient>

            <radialGradient id="core">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="15%" stop-color="#8beaff"/>
                <stop offset="45%" stop-color="#7160ff"/>
                <stop offset="100%" stop-color="#15133b" stop-opacity="0"/>
            </radialGradient>

            <filter id="glow">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>

            <linearGradient id="titleGradient">
                <stop offset="0%" stop-color="#00d9ff"/>
                <stop offset="50%" stop-color="#8b5cf6"/>
                <stop offset="100%" stop-color="#d8b4fe"/>
            </linearGradient>
        </defs>

        <rect
            width="${WIDTH}"
            height="${HEIGHT}"
            fill="url(#space)"
            rx="18"
        />

        ${particles.join("")}

        ${rings.join("")}

        <g filter="url(#glow)">
            ${stars.join("")}
        </g>

        <!-- Central galaxy core -->
        <circle
            cx="${centerX}"
            cy="${centerY}"
            r="85"
            fill="url(#core)"
            opacity="0.8"
        />

        <circle
            cx="${centerX}"
            cy="${centerY}"
            r="8"
            fill="#ffffff"
            filter="url(#glow)"
        />

        <!-- Header -->
        <text
            x="45"
            y="55"
            font-size="25"
            font-family="Arial, sans-serif"
            font-weight="bold"
            fill="url(#titleGradient)"
        >
            CONTRIBUTION GALAXY
        </text>

        <text
            x="47"
            y="82"
            font-size="12"
            font-family="Arial, sans-serif"
            fill="#8ca6d8"
        >
            ${escapeXml(USERNAME)} · 3D CONTRIBUTION UNIVERSE
        </text>

        <!-- Contribution statistics -->
        <text
            x="${WIDTH - 45}"
            y="55"
            font-size="25"
            font-family="Arial, sans-serif"
            font-weight="bold"
            fill="#ffffff"
            text-anchor="end"
        >
            ${total.toLocaleString("en-US")}
        </text>

        <text
            x="${WIDTH - 45}"
            y="80"
            font-size="12"
            font-family="Arial, sans-serif"
            fill="#8ca6d8"
            text-anchor="end"
        >
            TOTAL CONTRIBUTIONS · LAST YEAR
        </text>

        <!-- Footer -->
        <text
            x="${WIDTH / 2}"
            y="${HEIGHT - 24}"
            font-size="11"
            font-family="Arial, sans-serif"
            fill="#657aab"
            text-anchor="middle"
            letter-spacing="3"
        >
            EVERY STAR REPRESENTS A DAY OF BUILDING
        </text>
    </svg>
    `;
}

async function main() {
    console.log("Fetching GitHub contributions...");

    const { days, total } = await fetchContributions();

    console.log(`Fetched ${days.length} contribution days`);
    console.log(`Total contributions: ${total}`);

    const svg = createGalaxy(days, total);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, svg, "utf8");

    console.log(`Galaxy generated: ${OUTPUT_FILE}`);
}

main().catch(error => {
    console.error("Galaxy generation failed:", error);
    process.exit(1);
});

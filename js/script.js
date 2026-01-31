const CONFIG = {
    LAT: 57.048,
    LON: 9.941,
    STATION_ID: 20567,
    TIMEZONE: "Europe/Copenhagen",
    MULTIPLIERS: [
        // must have multiplier at 0 and 360
        // d: from direction
        // v: value
        { d: 0, v: 0.9 },
        { d: 80, v: 0.6 },
        { d: 135, v: 0.35 },
        { d: 180, v: 0.3 },
        { d: 240, v: 0.5 },
        { d: 300, v: 0.75 },
        { d: 360, v: 0.9 },
    ],
}
const DATA_SOURCES = {
    WEATHER: `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${CONFIG.LAT}&lon=${CONFIG.LON}`,
    WATER_TEMP: `https://opendataapi.dmi.dk/v2/oceanObs/collections/observation/items?limit=1&parameterId=tw&stationId=${CONFIG.STATION_ID}`
}

const MULTIPLIERS = buildMultiplierArray();


const getDKHours = (date) => {
    return parseInt(new Intl.DateTimeFormat("da-DK", {
        timeZone: CONFIG.TIMEZONE,
        hour: "2-digit",
        hour12: false,
    }).format(date));
};



class WeatherService {
    static async fetchData() {
        const results = await Promise.allSettled([
            fetch(DATA_SOURCES.WEATHER).then(r => r.json()),
            fetch(DATA_SOURCES.WATER_TEMP).then(r => r.json())
        ]);

        const weatherRes = results[0].status === 'fulfilled' ? results[0].value : null;
        const waterRes = results[1].status === 'fulfilled' ? results[1].value : null;

        return {
            weather: weatherRes,
            waterTemp: waterRes?.features?.[0]?.properties?.value ?? null,
        };
    }

    static processForecast(wData) {
        const timeseries = wData.properties.timeseries;
        const currentHour = new Date().getHours();

        const days = [];
        let currentDay = [];

        timeseries.forEach(item => {
            const time = new Date(item.time);
            const dkHour = getDKHours(time);

            // filter past hours and night hours
            if (time.getHours() < currentHour && time.getDate() === new Date().getDate()) return;
            if (dkHour < 6 || dkHour > 22) return;

            const rain = item.data.next_1_hours?.details?.precipitation_amount ??
                (item.data.next_6_hours?.details?.precipitation_amount / 5.0) ?? 0;

            const details = item.data.instant.details;
            const hour = new ForecastHour(
                time,
                details.air_temperature,
                details.wind_speed,
                details.wind_from_direction,
                rain
            );

            if (currentDay.length > 0 && time.getDate() !== currentDay[0].time.getDate()) {
                days.push(currentDay);
                currentDay = [];
            }
            currentDay.push(hour);
        });

        if (currentDay.length) days.push(currentDay);

        return days;
    }
}

class UI {
    static setSunTimes() {
        const times = SunCalc.getTimes(new Date(), CONFIG.LAT, CONFIG.LON);
        const sunriseStr = `${times.sunrise.getHours()}:${times.sunrise.getMinutes().toString().padStart(2, 0)}`;
        const sunsetStr = `${times.sunset.getHours()}:${times.sunset.getMinutes().toString().padStart(2, 0)}`;

        document.getElementById("sunrise").textContent = sunriseStr;
        document.getElementById("sunrise").classList.add("transition-no-transform");

        document.getElementById("sunset").textContent = sunsetStr;
        document.getElementById("sunset").classList.add("transition-no-transform");
    }

    static #getRainIcon(rain) {
        if (rain <= 0.1) return '';
        const level = rain < 0.5 ? 'low' : rain < 1.0 ? 'mid' : 'high';
        return `<img src="imgs/rain_${level}.png" style="height:20px; margin-left:10px; margin-bottom:-5px;">`;
    }

    static getScoreColor(score) {
        switch (score) {
            case 0:
                return "#32961f";
            case 1:
                return "#32961f";
            case 2:
                return "#559e1f";
            case 3:
                return "#7ba61f";
            case 4:
                return "#a6ad20";
            case 5:
                return "#b59620";
            case 6:
                return "#be731f";
            case 7:
                return "#c64b1f";
            default:
                return "#ce1f1f";
        }
    }

    static setWaterTemp(temp) {
        const el = document.getElementById("watertemp");
        el.classList.remove("spinner");
        if (temp !== null) {
            el.innerHTML = Math.round(temp) + "°";
        } else {
            el.innerHTML = "&#9888;";
            el.classList.add("error");
        }
        el.classList.add("transition-no-transform");
    }

    static createDayTable(day, index) {
        const container = document.createElement("div");
        container.className = "transition";
        container.style.animationDelay = `${index * 0.2}s`;

        const dateStr = `${this.#getDayName(day[0].time)} ${day[0].time.getDate()}/${day[0].time.getMonth() + 1}`;

        container.innerHTML = `
            <h4 style="margin-bottom: 5px; text-transform: capitalize;">${dateStr}</h4>
            <table>
                <thead>
                    <tr><th>Time</th><th>Temp &degC</th><th>Vind m/s</th><th>Score</th></tr>
                </thead>
                <tbody>
                    ${day.map(h => `
                        <tr>
                            <td>${h.time.toLocaleTimeString("da-DK", { hour: '2-digit', minute: '2-digit' }).slice(0, 2)}</td>
                            <td>${Math.round(h.temp)}° ${this.#getRainIcon(h.rain)}</td>
                            <td>
                                ${h.wind.toFixed(1)}
                                <img src="imgs/arrow_lowres.png" style="transform: rotate(${h.toDirection}deg); height:20px; margin-left:10px;">
                            </td>
                            <td style="color: ${this.getScoreColor(h.score)}; font-weight: bold;">${h.score}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        return container;
    }

    static #getDayName = (date) => {
        return new Intl.DateTimeFormat("da-DK", { weekday: 'long' }).format(date);
    };

    static setError() {
        const tableDiv = document.getElementById("tableDiv");
        tableDiv.innerHTML = `<p>&#9888;</p></p>Error getting data</p>`;
        tableDiv.className = "transition";
        tableDiv.classList.add("error");
        tableDiv.style.textAlign = "center";
        tableDiv.style.fontSize = "xx-large";
        document.getElementById("footer").className = "transition";
    }
}


class ForecastHour {
    constructor(time, temp, wind, direction, rain) {
        this.time = time;
        this.temp = temp;
        this.wind = wind;
        this.rain = rain
        this.fromDirection = direction;
        this.toDirection = (direction + 180) % 360;
        this.score = calcButter(wind, direction);
    }
}

function calcButter(wind, direction) {
    const score = wind * MULTIPLIERS[Math.round(direction)];
    return Math.round(score);
}


function buildMultiplierArray() {
    const lerp = (a, b, t) => a + (b - a) * t;
    const array = [];

    for (let i = 0; i < CONFIG.MULTIPLIERS.length - 1; i++) {
        let start = CONFIG.MULTIPLIERS[i].d;
        let end = CONFIG.MULTIPLIERS[i + 1].d;
        for (let j = start; j <= end; j++) {
            let distance = end - start;
            array[j] = lerp(
                CONFIG.MULTIPLIERS[i].v,
                CONFIG.MULTIPLIERS[i + 1].v,
                (j - start) / distance
            );
        }
    }

    return array;
}

async function init() {
    try {
        UI.setSunTimes();

        const { weather, waterTemp } = await WeatherService.fetchData();
        UI.setWaterTemp(waterTemp);

        if (weather) {
            const forecastDays = WeatherService.processForecast(weather);
            const tableDiv = document.getElementById("tableDiv");

            forecastDays.forEach((day, i) => {
                tableDiv.appendChild(UI.createDayTable(day, i));
            });

            document.getElementById("footer").className = "transition";
        }
        else {
            UI.setError();
        }
    } catch (error) {
        console.log(error);
        alert(error);
    }
}


init();
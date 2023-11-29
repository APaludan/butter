class Multiplier {
    constructor(fromDirection, value) {
        this.fromDirection = fromDirection;
        this.value = value;
    }
}

Date.prototype.getDKHours = function () {
    return parseInt(
        this.toLocaleTimeString("da-DK", {
            timeZone: "Europe/Copenhagen",
            hour: "2-digit",
            hour12: false,
        }).split(".")[0]
    );
};

const wUrl =
    "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.0481&lon=9.941";
const tUrl = "https://dmiapi-pfyplfu7ia-lz.a.run.app/watertemp";
const tableDiv = document.getElementById("tableDiv");
const windDirMultiplierArray = buildWindDirMultiplierArray();

try {
    update();
} catch (error) {
    alert(error);
}
async function update() {
    let wData;
    fetch(tUrl).then((response) => setInfo(response));
    wData = await fetch(wUrl).then((response) => response.json());

    let idx = 0;

    // Skip old data
    let timeseries = wData.properties.timeseries;
    while (new Date(timeseries[idx].time).getHours() != new Date().getHours()) {
        idx++;
    }

    // build forecast
    let forecast = [];
    let day = [];
    for (let i = idx; i < timeseries.length; i++) {
        let hour = new Date(timeseries[i].time);
        if (hour.getDKHours() < 6 || hour.getDKHours() > 22) continue;
        let details = timeseries[i].data.instant.details;
        let temp = details.air_temperature;
        let wind = details.wind_speed;
        let direction = details.wind_from_direction;
        if (
            day[0] != undefined &&
            hour.getDKHours() < day[day.length - 1].hour.getDKHours()
        ) {
            forecast.push(day);
            day = [];
        }
        day.push(new ForecastHour(hour, temp, wind, direction));
    }


    // build html
    forecast.forEach((day, dIndex) => {
        let div = document.createElement("div");
        let date = document.createElement("h4");
        date.style.marginBottom = "5px";
        div.style.opacity = "0";
        div.style.animationDelay = dIndex * 0.2 + "s";
        date.textContent =
            getDay(day[0].hour.getDay()) +
            " " +
            day[0].hour
                .toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" })
                .slice(0, -5)
                .replace(".", "/");
        div.appendChild(date);
        tableDiv.appendChild(div);

        let table = document.createElement("table");
        table.appendChild(getTableHeader());
        let tbody = document.createElement("tbody");

        day.forEach((hour) => {
            tbody.appendChild(hourRow(hour));
        });

        table.appendChild(tbody);
        div.appendChild(table);

        div.className = "transition";

        tableDiv.appendChild(div);
    });
    document.getElementById("footer").className = "transition";

    if (debug) printCsv(forecast);
}

async function setInfo(response) {
    const times = SunCalc.getTimes(new Date(), 57.0481, 9.941);
    const sunriseStr =
        times.sunrise.getHours() +
        ":" +
        times.sunrise.getMinutes().toString().padStart(2, 0);
    const sunsetStr =
        times.sunset.getHours() +
        ":" +
        times.sunset.getMinutes().toString().padStart(2, 0);

    document.getElementById("sunrise").textContent = sunriseStr;
    document.getElementById("sunrise").classList.add("transition-no-transform");

    document.getElementById("sunset").textContent = sunsetStr;
    document.getElementById("sunset").classList.add("transition-no-transform");

    if (response.ok) {
        document.getElementById("watertemp").textContent =
            Math.round(await response.json()) + "°";
    }
    else {
        const details = (await response.json()).detail;
        console.log(details)
        document.getElementById("watertemp").textContent = details;
    }
    document
        .getElementById("watertemp")
        .classList.add("transition-no-transform");
}

// print calculated data to console as csv to be used as temp data for nn
function printCsv(forecast) {
    let csv = "";
    forecast.forEach((day) => {
        day.forEach((hour) => {
            csv += `${hour.hour.getDKHours()}, ${hour.temp}, ${hour.wind}, ${hour.fromDirection
                }, ${hour.score}\n`;
        });
    });
    console.log(csv);
}

function hourRow(hour) {
    let row = document.createElement("tr");
    let time = document.createElement("td");
    let temp = document.createElement("td");
    let wind = document.createElement("td");
    let score = document.createElement("td");
    score.style.color = scoreColor(hour.score);
    score.style.fontWeight = "bold";

    time.textContent = hour.hour
        .toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen" })
        .slice(0, -3)
        .replace(".", ":");
    temp.textContent = hour.temp.toFixed(0) + "°";
    if (temp.textContent === "-0°") temp.textContent = "0°";
    wind.textContent = hour.wind.toFixed(1);

    let img = document.createElement("img");
    img.style.transform = "rotate(" + hour.toDirection + "deg)";
    img.style.height = "20px";
    img.style.marginLeft = "10px";
    img.src = "imgs/arrow_lowres.png";
    wind.appendChild(img);

    score.textContent = hour.score;

    row.appendChild(time);
    row.appendChild(temp);
    row.appendChild(wind);
    row.appendChild(score);
    return row;
}

class ForecastHour {
    constructor(hour, temp, wind, direction) {
        this.hour = hour;
        this.temp = temp;
        this.wind = wind;
        this.fromDirection = direction;
        this.toDirection = (direction + 180) % 360;
        this.score = calcButter(wind, direction);
    }
}

function calcButter(wind, direction) {
    let score = wind * windDirMultiplierArray[Math.round(direction)];
    return Math.round(score);
}


// must have multiplier at 0 and 360
function getMultipliers() {
    return [
        new Multiplier(0, 0.9),
        new Multiplier(80, 0.6),
        new Multiplier(135, 0.35),
        new Multiplier(180, 0.3),
        new Multiplier(240, 0.5),
        new Multiplier(300, 0.75),
        new Multiplier(360, 0.9),
    ];
}

function buildWindDirMultiplierArray() {
    let array = [];
    let multipliers = getMultipliers();

    for (let i = 0; i < multipliers.length; i++) {
        if (multipliers[i + 1] == undefined) break; // ??? i<multipliers.length-1 ???
        let start = multipliers[i].fromDirection;
        let end = multipliers[i + 1].fromDirection;
        for (let j = start; j <= end; j++) {
            let distance = end - start;
            array[j] = linearInterpolation(
                multipliers[i].value,
                multipliers[i + 1].value,
                (j - start) / distance
            );
        }
    }

    let chart = document.getElementById("chart");
    for (let i = 0; i < array.length; i += 1) {
        let div = document.createElement("div");
        div.style.height = array[i] * 100 + "px";
        div.style.backgroundColor = scoreColor(Math.round(array[i] * 8));
        div.style.flexGrow = "1";
        chart.appendChild(div);
    }
    return array;
}

function linearInterpolation(a, b, t) {
    return a + (b - a) * t;
}

function scoreColor(score) {
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

function getTableHeader() {
    let header = document.createElement("thead");
    header.innerHTML = `<thead>
                            <tr>
                                <th>Time</th>
                                <th>Temp &degC</th>
                                <th>Vind m/s</th>
                                <th>Score</th>
                            </tr>
                        </thead>`;
    return header;
}

function getDay(number) {
    switch (number) {
        case 0:
            return "Søndag";
        case 1:
            return "Mandag";
        case 2:
            return "Tirsdag";
        case 3:
            return "Onsdag";
        case 4:
            return "Torsdag";
        case 5:
            return "Fredag";
        case 6:
            return "Lørdag";
    }
}

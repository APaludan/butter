tf.setBackend('cpu');
let model = null;

Date.prototype.getDKHours = function () {
    return parseInt(this.toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", hour12: false }).split(".")[0]);
}


const wUrl = "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.0481&lon=9.941";
const sUrl = getSUrl();
const tUrl = "https://api.met.no/weatherapi/oceanforecast/2.0/complete?lat=56.988425&lon=10.286659";
const tableDiv = document.getElementById("tableDiv");

try {
    update()
    fetch("https://ahpa.azurewebsites.net/api/counter", { method: "POST" })
} catch (error) {
    alert(error);
}

async function update() {
    Promise.all([
        await tf.loadLayersModel('tf_model/model.json'),
        fetch(wUrl).then(response => response.json()),
        fetch(sUrl).then(response => response.json()),
        fetch(tUrl).then(response => response.json())])
        .then(([loadedModel, wData, sData, tData]) => {
            // load model
            model = loadedModel;

            // set water temp
            let span = document.createElement("span");
            span.className = "waterTemp transition-no-transform";
            span.textContent = Math.round(tData["properties"]["timeseries"][0]["data"]["instant"]["details"]["sea_water_temperature"]) + "°"
            document.getElementById("waterTemp").appendChild(span);

            let index = 0;

            let timeseries = wData["properties"]["timeseries"];
            while (new Date(timeseries[index]["time"]).getHours() != new Date().getHours()) {
                index++;
            }

            let totalTime = 0;

            let forecast = [];
            let day = [];
            for (let i = index; i < timeseries.length; i++) {
                let hour = new Date(timeseries[i]["time"]);
                if (hour.getDKHours() < 6) continue;
                let details = timeseries[i]["data"]["instant"]["details"];
                let temp = details["air_temperature"];
                let wind = details["wind_speed"];
                let direction = details["wind_from_direction"];
                if (day[0] != undefined && hour.getDKHours() < day[day.length - 1].hour.getDKHours()) {
                    forecast.push(day);
                    day = [];
                }
                const t0 = performance.now();
                day.push(new Hour(hour, temp, wind, direction));
                const t1 = performance.now();
                totalTime += t1 - t0;
            }

            console.log("Total inference time: " + totalTime + " milliseconds.");

            forecast.forEach((day, dIndex) => {
                let div = document.createElement("div");
                let date = document.createElement("h4");
                date.style.marginBottom = "5px";
                div.style.opacity = "0";
                div.style.animationDelay = (dIndex * 0.2) + "s";
                date.textContent = getDay(day[0].hour.getDay()) + " " + day[0].hour.toLocaleDateString("da-DK", { timeZone: "Europe/Copenhagen" }).slice(0, -5).replace(".", "/");
                div.appendChild(date);
                tableDiv.appendChild(div);

                let table = document.createElement("table");
                table.appendChild(getTableHeader());
                let tbody = document.createElement("tbody");

                day.forEach(hour => {
                    tbody.appendChild(hourRow(hour));
                });

                table.appendChild(tbody);
                div.appendChild(table);

                let sunDiv = document.createElement("div");
                sunDiv.style.display = "flex";
                sunDiv.style.justifyContent = "space-evenly";

                let sunriseDiv = document.createElement("div");
                sunriseDiv.style.display = "flex";
                sunriseDiv.style.alignItems = "center";
                sunriseDiv.style.marginLeft = "20px";

                {
                    let img = document.createElement("img");
                    img.style.height = "60px";
                    img.style.margin = "-5px";
                    img.src = "sunrise.svg";
                    sunriseDiv.appendChild(img);
                }
                let sunrise = document.createElement("p");
                sunrise.style.marginLeft = "10px";
                sunrise.textContent = new Date(sData.location.time[dIndex].sunrise.time).toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen" }).slice(0, -3).replace(".", ":");
                sunriseDiv.appendChild(sunrise);

                let sunsetDiv = document.createElement("div");
                sunsetDiv.style.display = "flex";
                sunsetDiv.style.alignItems = "center";
                sunsetDiv.style.marginRight = "20px";
                {
                    let img = document.createElement("img");
                    img.style.height = "60px";
                    img.style.margin = "-5px";
                    img.src = "sunset.svg";
                    sunsetDiv.appendChild(img);
                }
                let sunset = document.createElement("p");
                sunset.style.marginLeft = "10px";
                sunset.textContent = new Date(sData.location.time[dIndex].sunset.time).toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen" }).slice(0, -3).replace(".", ":");
                sunsetDiv.appendChild(sunset);

                sunDiv.appendChild(sunriseDiv);
                sunDiv.appendChild(sunsetDiv);
                div.appendChild(sunDiv);
                div.className = "transition";

                tableDiv.appendChild(div);
            });
            document.getElementById("footer").className = "transition";
        })
        .catch(error => { console.log(error); alert(error) });
}


function hourRow(hour) {
    let row = document.createElement("tr");
    let time = document.createElement("td");
    let temp = document.createElement("td");
    let wind = document.createElement("td");
    let score = document.createElement("td");
    score.style.color = scoreColor(hour.wack);
    score.style.fontWeight = "bold";

    time.textContent = hour.hour.toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen" }).slice(0, -3).replace(".", ":");
    temp.textContent = hour.temp.toFixed(0) + "°";
    if (temp.textContent === "-0°") temp.textContent = "0°";
    wind.textContent = hour.wind.toFixed(1);
    {
        let img = document.createElement("img");
        img.style.transform = "rotate(" + hour.toDirection + "deg)";
        img.style.height = "20px";
        img.style.marginLeft = "10px";
        img.src = "arrow_lowres.png";
        wind.appendChild(img);
    }
    score.textContent = hour.wack;

    row.appendChild(time);
    row.appendChild(temp);
    row.appendChild(wind);
    row.appendChild(score);
    return row;
}

class Hour {
    constructor(hour, temp, wind, direction) {
        this.hour = hour
        this.temp = temp;
        this.wind = wind;
        this.fromDirection = direction;
        this.toDirection = (direction + 180) % 360;
        const res = model.predict(tf.tensor([[hour.getDKHours(), temp, wind, direction]])).dataSync();
        if (res < 0) res = 0;
        this.wack = Math.round(res);
    }
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
                                <th>Temperatur &degC</th>
                                <th>Vind m/s</th>
                                <th>Score</th>
                            </tr>
                        </thead>`
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

function getTimezoneOffset(timeZone, date = new Date()) {
    // let dateString = date.toString().split(" ")[5];
    let dateString = date.toLocaleTimeString("en-US", { hour12: false, timeZone: timeZone, timeZoneName: "longOffset" });
    let sign = dateString.slice(12, 13);
    let hours = dateString.slice(13, 15);
    let minutes = dateString.slice(16, 18);


    // console.log(sign + hours + minutes);
    return `${sign}${hours}:${minutes}`
}

function getSUrl() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = month.toString().padStart(2, "0");
    const day = now.getDate();
    const dayStr = day.toString().padStart(2, "0");
    return `https://api.met.no/weatherapi/sunrise/2.0/.json?date=${year}-${monthStr}-${dayStr}&days=10&lat=57.0481&lon=9.941&offset=${getTimezoneOffset("Europe/Copenhagen")}`;
}
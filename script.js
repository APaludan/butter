class Multiplier {
    constructor(fromDirection, value) {
        this.fromDirection = fromDirection;
        this.value = value;
    }
}

const url = "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.0481&lon=9.941";
const table = document.getElementById("table");
let windDirMultiplierArray = buildWindDirMultiplierArray();


update()

function update() {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            let dateTime = new Date();
            let index = 0;

            let timeseries = data["properties"]["timeseries"];
            while (new Date(timeseries[index]["time"]).getHours() != dateTime.getHours()) {
                index++;
            }

            let forecast = [];
            for (let i = index; i < timeseries.length; i++) {
                let hour = new Date(timeseries[i]["time"]);
                let details = timeseries[i]["data"]["instant"]["details"];
                let temp = details["air_temperature"];
                let wind = details["wind_speed"];
                let direction = details["wind_from_direction"];
                forecast.push(new Hour(hour, temp, wind, direction));
            }
            console.log(forecast);

            for (let i = 0; i < forecast.length; i++) {
                if (i === 0 || forecast[i-1].hour.getDate() < forecast[i].hour.getDate()) {
                    let date = document.createElement("h5");
                    date.style.marginBottom = "0px";
                    date.innerHTML = `${getDay(forecast[i].hour.getDay())}<br>${forecast[i].hour.toLocaleDateString().slice(0, -5).replace(".", "/")}`;
                    table.appendChild(date);
                    table.appendChild(getTableHeader());
                }
                while (forecast[i].hour.getHours() < 6) {
                    i++;
                }

                let row = document.createElement("tr");
                row.innerHTML = `<tr>
                    <td>${forecast[i].hour.getHours()}:00</td>
                    <td>${forecast[i].temp.toFixed(0)}&deg</td>
                    <td>
                        ${forecast[i].wind.toFixed(1)}
                        <img style="height: 20px; margin-left: 10px; transform: rotate(${forecast[i].toDirection}deg)" src="arrow.png" />
                    </td>
                    <td style="color: ${scoreColor(forecast[i].wack)}; font-weight: bold;">
                        ${forecast[i].wack}
                    </td>
                    </tr>
                    `;
                table.appendChild(row);
            }
        })
}

function calcWack(wind, direction) {
    let wack = wind * windDirMultiplierArray[Math.round(direction)];
    return Math.round(wack);
}

class Hour {
    constructor(hour, temp, wind, direction) {
        this.hour = hour
        this.temp = temp;
        this.wind = wind;
        this.fromDirection = direction;
        this.toDirection = (direction + 180) % 360;
        this.wack = calcWack(wind, direction);
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

// must have multiplier at 0 and 360
function getMultipliers() {
    let m = [];
    m.push(new Multiplier(0, 0.9));
    m.push(new Multiplier(100, 0.6));
    m.push(new Multiplier(180, 0.4));
    m.push(new Multiplier(240, 0.5));
    m.push(new Multiplier(300, 0.75));
    m.push(new Multiplier(360, 0.9));
    return m;
}

function buildWindDirMultiplierArray() {
    let array = [];
    let multipliers = getMultipliers();

    for (let i = 0; i < multipliers.length; i++) {
        if (multipliers[i + 1] == undefined) break;
        
        let start = multipliers[i].fromDirection;
        let end = multipliers[i + 1].fromDirection;
        for (let j = start; j <= end; j++) {
            let distance = end - start;
            array[j] = linearInterpolation(multipliers[i].value, multipliers[i + 1].value, (j - start) / distance);
        }
    }

    console.log(array);
    let chart = document.getElementById("chart");
    for (let i = 0; i < array.length; i += 1) {
        let div = document.createElement("div");
        div.style.height = array[i] * 100 + "px";
        div.style.backgroundColor = scoreColor(Math.round(array[i] * 8));
        div.style.flexGrow = "1";
        chart.appendChild(div);
    };
    return array;
}


function linearInterpolation(a, b, t) {
    return a + (b - a) * t;
}

function getTableHeader(){
    let header = document.createElement("thead");
    header.innerHTML = `<thead>
                            <tr>
                                <th>Time</th>
                                <th>Temperatur</th>
                                <th>Vind</th>
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
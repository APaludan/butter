const url = "https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=57.0481&lon=9.941";
const tableBody = document.getElementById("tbody");

const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if (isDarkMode)
    document.getElementsByTagName("html")[0].className = "dark";
else
    document.getElementsByTagName("html")[0].className = "";


update()

function update() {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            let dateTime = new Date();
            let utcHours = dateTime.getUTCHours();
            let index = 0;

            let timeseries = data["properties"]["timeseries"];
            while (timeseries[index]["time"].substring(11, 13) != utcHours.toString().padStart(2, "0")) {
                index++;
            }
            console.log("index: " + index)
            let forecast = [];
            for (let i = index; i <= index + 24; i++) {
                let hour = new Date(timeseries[i]["time"]);
                let now = timeseries[i]["data"];
                let temp = now["instant"]["details"]["air_temperature"];
                let wind = now["instant"]["details"]["wind_speed"];
                let direction = (now["instant"]["details"]["wind_from_direction"] - 180) % 360;
                forecast.push(new Hour(hour, temp, wind, direction));
            }
            console.log(forecast);
            for (let i = 0; i < forecast.length; i++) {
                let row = document.createElement("tr");
                row.innerHTML = `
                    <td>${forecast[i].hour.getHours()}:00</td>
                    <td>${forecast[i].temp.toFixed(0)}&deg</td>
                    <td>
                        ${forecast[i].wind.toFixed(1)}
                        <img style="height: 20px; margin-left: 10px; transform: rotate(${forecast[i].direction}deg)" src="arrow.png" />
                    </td>
                    <td style="color: ${scoreColor(forecast[i].wack)}; font-weight: bold;">
                        ${forecast[i].wack}
                    </td>
                    `;
                tableBody.appendChild(row);
            }
        })
}

function calcWack(wind, direction) {
    let wack = wind * windDirMultiplier(direction);
    return Math.round(wack);
}

function windDirMultiplier(direction) {
    let dir = (direction + 180) % 360;
    if (dir >= 0 && dir <= 45)
        return 0.8;
    else if (dir >= 45 && dir <= 90)
        return 0.7;
    else if (dir >= 90 && dir <= 135)
        return 0.7;
    else if (dir >= 135 && dir <= 180)
        return 0.6;
    else if (dir >= 180 && dir <= 225)
        return 0.7;
    else if (dir >= 225 && dir <= 270)
        return 0.8;
    else if (dir >= 270 && dir <= 315)
        return 1;
    else if (dir >= 315 && dir <= 360)
        return 0.9;
    else
        alert("error in windDirScore");
}

class Hour {
    constructor(hour, temp, wind, direction) {
        this.hour = hour
        this.temp = temp;
        this.wind = wind;
        this.direction = direction;
        this.wack = calcWack(wind, direction);
    }
}

function scoreColor(score) {
    switch (score) {
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
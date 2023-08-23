document.getElementById("get-data").addEventListener("click", event => {
    event.preventDefault();
    fetch("https://ahpa.azurewebsites.net/api/butter/")
        .then(res => res.text().then(text => document.getElementById("data").innerHTML = text));
});


const form = document.getElementById("form");
const res = document.getElementById("res");
const submitButton = document.getElementById("submitButton")
setSubmitButton();

form.addEventListener("submit", function (event) {
    event.preventDefault();
    submitButton.setAttribute("disabled", "");
    password = document.getElementById("password").value;
    score = document.getElementById("score").value;
    fetch(`https://ahpa.azurewebsites.net/api/butter?&score=${score}&password=${password}`, { method: "POST" })
        .then(response => {
            if (response.status != 200) {
                throw new Error("Et eller andet gik galt🤯 den accepterer kun scores mellem 0 og 15 btw.");
            }
            res.innerHTML = "Gemt! 🧈🧈🌊🌊👌👌";
            window.localStorage.setItem("lastSubmit", Date.now().toString());
        })
        .catch(error => {
            res.innerHTML = error;
            submitButton.removeAttribute("disabled");
        })
        .finally(() => setSubmitButton());
});

function setSubmitButton() {
    const lastSubmit = Number.parseInt(window.localStorage.getItem("lastSubmit"));
    if (isNaN(lastSubmit)) {
        submitButton.removeAttribute("disabled");
        return;
    }
    const allowSubmit = lastSubmit < Date.now() - 3_600_000;
    if (!allowSubmit) {
        submitButton.setAttribute("disabled", "");
        const timeToNextSubmit = (lastSubmit - Date.now() + 3_600_000) / 1000 / 60;
        submitButton.innerHTML = `Vent ${Math.round(timeToNextSubmit)} minutter før du kan sende butterscore igen.`;
    }
}
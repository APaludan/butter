fetch("https://ahpa.azurewebsites.net/api/butter/")
    .then(res => res.text().then(text => document.getElementById("data").innerHTML = text));

const form = document.getElementById("form");
const res = document.getElementById("res");
const submitButton = document.getElementById("submitButton")
if (form != null) {
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitButton.setAttribute("disabled", "");
        password = document.getElementById("password").value;
        score = document.getElementById("score").value;
        fetch(`https://ahpa.azurewebsites.net/api/butter?&score=${score}&password=${password}`, { method: "POST" })
            .then(response => {
                let message;
                switch (response.status) {
                    case 200:
                        message = "Gemt! 🧈🧈🌊🌊👌👌"
                        break;
                    default:
                        message = "Et eller andet gik galt🤯. Måske fordi den kun accepterer scores mellem 0 og 15."
                        break;
                }
                res.innerHTML = "status = " + message
            })
            .catch(error => { 
                res.innerHTML = error;
                submitButton.removeAttribute("disabled")
            });
    });
}
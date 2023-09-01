let promise

Date.prototype.getDKHours = function () {
    return parseInt(this.toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", hour12: false }).split(".")[0]);
}

self.addEventListener('message', function (e) {
    console.log(e)
    if (typeof (e.data) === "string") {
        self.clients.matchAll()
        .then((clientlist) => {
            const res = {
                title: "Notifikationer er slået til",
                tag: "NotiEnabled"
            }
            clientlist[0].postMessage(res);
        });
        console.log("e.data er string")
        return;
    }
    console.log("jepep")
    let times = e.data[0]
    let dates = e.data[1]
    let promises = []
    times.forEach((time, i) => {
        promises.push(
            self.clients.matchAll()
                .then((clientlist) => {
                    setTimeout(() => {
                        const res = {
                            title: `Det bliver butter i dag kl: ${dates[i].getDKHours()}. Kom og shred!!`,
                            tag: time.toString()
                        }
                        clientlist[0].postMessage(res);
                    }, 120000);
                })
        )
    })

    if (e.waitUntil) {
        e.waitUntil(Promise.all(promises));
    }
});

self.addEventListener('install', function (event) {
    event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim()); // Become available to all pages
});
let times = []


self.addEventListener('message', function (e) {
    times = e.data
    
    let promises = []
    times.forEach( (time) => {
        promises.push(
            self.clients.matchAll()
            .then((clientlist) => {
                setTimeout(() => {
                    clientlist.forEach((client) => {
                        client.postMessage(`hejhej test test. Tid:${time}ms`)
                    })
                }, time);
            })
        )
    })
    
    let promise  = Promise.all(promises)

    if (event.waitUntil) {
        event.waitUntil(promise);
    }
    self.fetch("data.html")
});
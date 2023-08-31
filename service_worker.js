let promise

self.addEventListener('message', function (e) {
    clearTimeout();
    let times = e.data
    
    let promises = []
    times.forEach( (time) => {
        promises.push(
            self.clients.matchAll()
            .then((clientlist) => {
                setTimeout(() => {
                    clientlist.forEach((client) => {
                        client.postMessage(`Det bliver butter (1) her: ${(new Date(new Date().getTime() + time)).toString()}ms`)
                    })
                }, 0);
            })
        )
    })
    
    promise  = Promise.all(promises)

    if (event.waitUntil) {
        event.waitUntil(promise);
    }
});

self.addEventListener('install', function(event) {
    event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim()); // Become available to all pages
});
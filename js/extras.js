const url = new URL(window.location.href);
const debug = url.searchParams.get('debug') == 'true';


if (debug) {
    document.getElementById("chartDiv").classList.toggle("hidden");
}

if (useNN) {
    document.getElementById("nn-text").innerHTML = `<h3 class="center-text">AI version (test)</h3>
    <p class="center-text">NN er trænet på syntetisk data så den er ikke lige så god som den originale endnu.</p>`;
    document.getElementById("nn-link").innerHTML = "Standard version";
    document.getElementById("nn-link").href = "index.html"
}
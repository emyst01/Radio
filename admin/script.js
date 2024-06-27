
const socket = new WebSocket("ws://localhost:8080");
socket.addEventListener('open', (event) => {
    console.log("Connection opened")
});

const nextsong = document.getElementById('nextsonginp')
const nextsongbutton = document.getElementById('nextsongbutton')
const startButton = document.getElementById('startradiobutton')

nextsongbutton.addEventListener('click', () => {
    socket.send(JSON.stringify({
        type: "nextSong",
        id: nextsong.value
    }))
})
startButton.addEventListener('click', () => {
    socket.send(JSON.stringify({
        type: "start"
    }))
})
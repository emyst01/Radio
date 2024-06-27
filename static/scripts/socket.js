const socket = new WebSocket("ws://localhost:8080");
socket.addEventListener('open', (event) => {
    console.log("We would ask you not to run commands in the console or try to view or modify the site's source code thanks.")
    console.log("Anyway all the sensitive data are in the backend.")
});

const song = document.querySelector("#song");
const startButton = document.querySelector("#startbutton");
var activated = false
var started = false
song.muted = true

startButton.addEventListener('click', () => {
    if (activated == false){
        socket.send(JSON.stringify({
            type: "askCurrentSong"
        }));
        song.muted = false
        activated = true
        return
    } else {
        song.muted = true
        activated = false
        return
    }
});

song.volume = 0.4
socket.addEventListener('message', (event) => {
    const recivedData = JSON.parse(event.data)
    switch (recivedData.type) {
        case "newSong":
            if (activated == true){
                song.src = "filesongs/" + recivedData.songPath + ".webm"
                song.load()
                song.play()
                break
            } else {
                return
            }
        case "setCurrentSong":
            if (activated == true) {
                song.src = "filesongs/" + recivedData.song + ".webm"
                song.currentTime = recivedData.time;
                song.muted = false;
                song.play()
                activated = true
                break
            } else {
                return
            }
    }
})
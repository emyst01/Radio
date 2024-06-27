const express = require('express')
const http = require('http')
const websocket = require('ws')
const app = express()
const path = require('path')
const server = http.createServer(app)
const wss = new websocket.Server({ server })
const fs = require('fs')
app.use(express.static(__dirname + '/static'))
app.use(express.urlencoded({ extended: true }))
const clients = new Map()
const songsDataPath = path.join(__dirname, 'songs.json')

var currentTime = 0
var currentSong = ""
var currentSongLength = 0
var started = false
var lastSongID = null
var nextsong = null

function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}

function selectRandomID(NSongs) {
    return Math.floor(Math.random() * NSongs)
}
function getSongInfoByPathname(pathname, callback) {
    fs.readFile(songsDataPath, 'utf8', (err, data) => {
    if (err) {
        callback(err, null)
        return
    }
    const songsDatabase = JSON.parse(data);
    const song = songsDatabase.find(song => song.PathName === pathname)
    if (song) {
        const songInfo = {
            title: song.title,
            author: song.author,
            link: song.link
    }
        callback(null, songInfo)
    } else {
        callback('Song not found', null)
    }
    })
}
function listSongs() {
    fs.readFile('songs.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error: ', err);
            return;
        }
        try {
            const songsData = JSON.parse(data)
            console.log('List of songs:')
            songsData.forEach(song => {
                console.log(`Title: ${song.Title}`)
            });
        } catch (error) {
            console.error('Error: ', error)
        }
    });
}
function readSongsNumber(callback) {
    fs.readFile('songs.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error: ', err)
            return;
        }   
        try {
            const jsonData = JSON.parse(data);
            const numberOfObjects = Object.keys(jsonData).length;
            callback(numberOfObjects);
        } catch (error) {
            console.error('Error: ', error)
        }
    });
}

function IdToSongPath(id, callback) {
    fs.readFile('songs.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error: ', err);
            return;
        }
        try {
            const songsData = JSON.parse(data);
            const targetSong = songsData.find(song => song.ID === id)
            if (targetSong) {
                console.log("The song is: " + targetSong.Title)
                callback(targetSong.PathName)
            } else {
                console.log('There is no song with that id.')
            }
        } catch (error) {
            console.error('Error: ', error)
        }
    });
}

function PathNameToSongLength(id, callback) {
    fs.readFile('songs.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error: ', err)
            return
        }
        try {
            const songsData = JSON.parse(data)
            const targetSong = songsData.find(song => song.PathName === id)
            if (targetSong) {
                callback(targetSong.length)
            } else {
                console.log('There is no song with that pathname.')
            }
        } catch (error) {
            console.error('Error: ', error)
        }
    });
}

wss.on('connection', (ws) => {
    const clientId = generateUniqueId()
    clients.set(clientId, ws); 
    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message)
        switch(parsedMessage.type) {
            case "askCurrentSong":
                if (started == true) {
                    ws.send(JSON.stringify({
                        type: "setCurrentSong",
                        time: currentTime,
                        song: currentSong
                    }))
                } else {
                    return
                }
                started = true
                break
            case "songslist":
                listSongs()
            case "start":
                currentSong = parsedMessage.id
                started = true
                console.log("start request")
                currentTime = 0
                readSongsNumber((songsNumber) => {
                    let randomID = selectRandomID(songsNumber)
                    while (randomID == lastSongID) {
                        if (nextsong == null) {
                            randomID = selectRandomID(songsNumber)
                        } else {
                            randomID = nextsong
                            nextsong = null
                        }
                    }
                    IdToSongPath(randomID, (actualPath) => {
                        const newsongrequest = JSON.stringify({
                            type: "newSong",
                            songPath: actualPath
                        })
                        lastSongID = randomID
                        clients.forEach((client) => {
                            if (client.readyState === websocket.OPEN) {
                                client.send(newsongrequest);
                            }
                        });
                        currentSong = actualPath;
                        PathNameToSongLength(actualPath, (songLength) => {
                            currentSongLength = songLength;
                        });
                    });
                });
                break
            case "nextSong":
                nextsong = parsedMessage.path
        }
    });
});
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/index.html')
});
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/static/admin.html')
})
app.post('/sendPassword', (req, res) => {
    const password = req.body.password
    if (password != "boh"){
        res.send("Incorrect password")
        return
    } else {
        res.sendFile(__dirname + '/admin/index.html')
    }
})
setInterval(() => {
    if (started == true) {
        if (currentTime < currentSongLength) {
            currentTime++
            console.log(currentTime)
        } else {
            currentTime = 0
            if (nextsong == null){
                readSongsNumber((songsNumber) => {
                    let randomID = selectRandomID(songsNumber)
                    while (randomID == lastSongID) {
                        randomID = selectRandomID(songsNumber)
                    }
                    IdToSongPath(randomID, (actualPath) => {
                        const newsongrequest = JSON.stringify({
                            type: "newSong",
                            songPath: actualPath
                        })
                        lastSongID = randomID
                        clients.forEach((client) => {
                            if (client.readyState === websocket.OPEN) {
                                client.send(newsongrequest);
                            }
                        })
                        currentSong = actualPath;
                        PathNameToSongLength(actualPath, (songLength) => {
                            currentSongLength = songLength;
                        })
                    })
                })
            }else{
                IdToSongPath(nextsong, (actualPath) => {
                    const newsongrequest = JSON.stringify({
                        type: "newSong",
                        songPath: actualPath
                    })
                    lastSongID = nextsong
                    clients.forEach((client) => {
                        if (client.readyState === websocket.OPEN) {
                            client.send(newsongrequest);
                        }
                    })
                    currentSong = nextsong;
                    PathNameToSongLength(actualPath, (songLength) => {
                        currentSongLength = songLength;
                    })
                })
            }
        }
    }

}, 1000)

server.listen(8080, () => {console.log("Server started on :8080")})

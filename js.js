import YTMusic from "ytmusic-api"

const ytmusic = new YTMusic()

ytmusic.search("Believer").then(songs => {
	console.log(songs)
})
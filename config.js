//The port in which the server will run off
var port = 8000;

//The Movie Database API Key
//MUST BE FILLED
var tmdbApiKey = "ball";

//the URI for where the MongoDB server is located
//MUST BE FILLED
var mongoDBUri = "mongodb+srv://dbUser:dbUserPassword@cluster0.gtfkq.mongodb.net/movie_buddy?retryWrites=true&w=majority"

//The root folder where videos that are added to movie buddy will be stored
//Note: This is not the folder where your mp4s are
//MUST BE FILLED
var videoFilesRoot = "C:/Users/Cgiub/Videos/1 FINISHED VIDS";

//if left blank, server will run using HTTP instead of HTTPS
var security = {
    keyLocation: "",
    certificateLocation: "",
    passpharse: ""
}

/***********************************
 * 
 * DO NOT EDIT ANYTHING BELOW THIS LINE
 * 
 ***********************************/

//The name of all the collections that are in MongoDB
var collections = {
    users: "user",
    user_statistics: "user_statistics",
    movies: "movies",
    shows: "shows",
    genres: "genres",
    featured: "featured",
    invites: "invite_codes",
    sessions: "sessions",
    feedback: "feedback"
}

exports.collections = collections;

exports.port = port;
exports.tmdbApiKey = tmdbApiKey;
exports.mongoDBUri = mongoDBUri;
exports.videoFilesRoot = videoFilesRoot;

exports.security = security;

exports.isInformationFilled = function(){
    if(tmdbApiKey == null || tmdbApiKey.length === 0){
        return {result: false, reason: "TMDB API Key is empty"};
    }
    else if(mongoDBUri == null || mongoDBUri.length === 0){
        return {result: false, reason: "MongoDB URI is empty"};
    }
    else if(videoFilesRoot == null || videoFilesRoot.length === 0){
        return {result: false, reason: "Video Files Root Location is Empty"};
    }
    else{
        return {result: true, reason: ""};
    }
};
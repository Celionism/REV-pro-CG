const moduleAlias = require('module-alias');
moduleAlias.addAliases({
    '@root'  : __dirname,
    '@config': __dirname + '/config.js',
    '@collections': __dirname + '/database'
});
require('module-alias/register');
//Everything above is temporary

var fetch = require("node-fetch");
var config = require("@config");

var api_key = config.tmdbApiKey;

//Helper Functions
async function getJson(url){    
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

/**
 * Retrieves all genres that exist the The Movie Database API
 * @param {String} type  The type of media, "movie", "show", or empty string or null 
 * @returns {JSON} a list of genres. if a type is not provided, will return all genres from both lists
 */
async function getAllGenres(type){
    if(type != "show" && type != "movie"){
        let genreArray = [];

        let show_result = await getAllGenres("show");
        let movie_result = await getAllGenres("movie");

        show_result.forEach(r => {
            if(genreArray.findIndex(genre => genre.id == r.id) == -1){
                genreArray.push(r);
            }
        });

        movie_result.forEach(r => {
            if(genreArray.findIndex(genre => genre.id == r.id) == -1){
                genreArray.push(r);
            }
        });
        return genreArray;
    }

    type = type == "show" ? "tv" : "movie";
    let url = `https://api.themoviedb.org/3/genre/${type}/list?api_key=${api_key}&language=en-US`
    let result = (await getJson(url)).genres;
    return result;
}

/**
 * Searchs The Movie Database API for a specific movie or show
 * @param {String} query  a search query
 */
async function search(query){
    let url = `https://api.themoviedb.org/3/search/multi?query=${query}&api_key=${api_key}&page=1&include_adult=false&language=en-US`
    let results = (await getJson(url)).results;
    
    results = results.filter(searchEntry => searchEntry.media_type == "tv" || searchEntry.media_type == "movie");

    return results;
}

/**
 * Retrieves the movie details for a specific movie using its movie id
 * @param {String} movieId  The movie id that the movie belongs to
 */
async function getMovieDetails(movieId){
    let url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${api_key}&language=en-US`;
    
    //retrieves the movie data from The Movie Database
    let movie_details = await getJson(url);

    //parses out all of the fields that Movie Buddy will use
    let movie = {
        id: movie_details["id"],
        title: movie_details["title"],
        description: movie_details["overview"],
        rating: movie_details["vote_average"],
        frontpage: movie_details["poster_path"],
        backdrop: movie_details["backdrop_path"],
        runtime: movie_details["runtime"],
        release: movie_details["release_date"],
        type: "movie",
        uploaded_date: new Date(),
        modified_date: new Date(),
        genres: movie_details["genres"]
    }

    return movie;
}

/**
 * Retrieves the show details for a specific show using its show id
 * @param {String} showId  The show id that the show belongs to
 */
async function getShowDetails(showId){
    let url = `https://api.themoviedb.org/3/tv/${showId}?api_key=${api_key}&language=en-US`;
    
    //retrieves the movie data from The Movie Database
    let show_details = await getJson(url);

    //parses out all of the fields that Movie Buddy will use
    let movie = {
        id: show_details["id"],
        title: show_details["name"],
        description: show_details["overview"],
        rating: show_details["vote_average"],
        frontpage: show_details["poster_path"],
        backdrop: show_details["backdrop_path"],
        runtime: show_details["episode_run_time"][0],
        release: show_details["first_air_date"],
        type: "show",
        uploaded_date: new Date(),
        modified_date: new Date(),
        genres: show_details["genres"]
    }

    return movie;
}


let mongoose = require("mongoose");
mongoose.connect(config.mongoDBUri, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => {
        console.log("Database connection successful")
    })
    .catch(err => {
        console.error(err)
    });

var Movies = require("@collections/movies.js");

async function main(){
    let johnWick = await getMovieDetails("324552");
    await Movies.addMovie(johnWick);
    // console.log(await getMovieDetails("324552"));
    // console.log(await getShowDetails("60625"));
    // console.log(await search("John"));
}

main();




// Define some global variables for celebration mode
const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'];
let currentColorIndex = 0;

document.addEventListener("DOMContentLoaded", function () {
    let cards = new Cards();

    // Generate the cards with letters or pictures based on the settings
    GameSettings.pictures ? cards.generatePictureCards() : cards.generateCards();

    document.getElementById("settingsForm").addEventListener("submit", function (e) {
        // Prevent reloading the page
        e.preventDefault();
        // Start a new game with the provided settings
        startNewGame();
    });
});


function startNewGame() {
    // Reset the interval functions, global variables, static class variables, and timers
    clearInterval(window.foo);
    clearInterval(window.elapsedTimer);
    window.foo = undefined;
    window.elapsedTimer = undefined;
    window.allPromises = [];

    GameSettings.character = document.getElementById("character").value;
    GameSettings.pictures = document.getElementById("picture").value === "randomPictures";
    GameSettings.fieldSize = document.getElementById("size").value;
    GameSettings.totalCards = GameSettings.fieldSize * GameSettings.fieldSize;
    GameSettings.totalPlayTime = 7 * GameSettings.totalCards;
    GameSettings.closedCardColor = document.getElementById("cardColor").value;
    GameSettings.openCardColor = document.getElementById("openCardColor").value;
    GameSettings.foundCardColor = document.getElementById("foundCardColor").value;

    document.getElementById("elapsedTime").innerHTML = 0;
    document.getElementById("remainingTime").innerHTML = GameSettings.totalPlayTime;
    document.getElementById("time").value = GameSettings.totalPlayTime;
    document.getElementById("time").max = GameSettings.totalPlayTime;
    document.getElementById("playingField").style.pointerEvents = "initial";

    // Create a style element in the head of the DOM to get the dynamic color the player picked
    window.cardStyle ??= document.createElement('style');
    window.cardStyle.innerHTML = ".card.closed {\n\tbackground-color: " + GameSettings.closedCardColor.toUpperCase() + ";\n}\n\n";
    window.cardStyle.innerHTML += ".card.open {\n\tbackground-color: " + GameSettings.openCardColor.toUpperCase() + ";\n}\n\n";
    window.cardStyle.innerHTML += ".card.found {\n\tbackground-color: " + GameSettings.foundCardColor.toUpperCase() + ";\n}";
    document.head.appendChild(window.cardStyle);

    let cards = new Cards();
    GameSettings.pictures ? cards.generatePictureCards() : cards.generateCards();
    cards.prepareCards();
}

// Ends the current game of memory. If the max time has been elapsed, the player has lost, else the player has won the game
function gameOver(maxTimeElapsed) {
    clearInterval(window.elapsedTimer);

    if (maxTimeElapsed) {
        alert("Game over! De tijd is verlopen.");
        // Do not continue to execute pointer events
        document.getElementById("playingField").style.pointerEvents = "none";
    }
    else {
        alert("Gefeliciteerd! Je hebt het spel uitgespeeld!");
        updateColors();

        let innerCards = document.querySelectorAll(".inner-card");
        innerCards.forEach(card => {
            card.innerHTML = GameSettings.character;
            addClass(card, "hidden");
        });
    }
}

// Update the timers in the header
function updateTimers() {
    let elapsedTime = 1;
    window.elapsedTimer = setInterval(function () {
        if (elapsedTime >= GameSettings.totalPlayTime) {
            gameOver(true);
        }

        document.getElementById("remainingTime").innerHTML = GameSettings.totalPlayTime - elapsedTime;
        document.getElementById("time").value = GameSettings.totalPlayTime - elapsedTime;
        document.getElementById("elapsedTime").innerHTML = elapsedTime++;
    }, 1000);
}

// Create a deck of cards with random letters of the alphabet, and shuffle the deck
function shuffleLetters() {
    let result = "";
    let characters = "";

    for (let i = 0; i < (GameSettings.totalCards / 2); i++) {
        let letter = generateLetters(characters);
        characters += letter;
    }

    // Concat the unique letters with eachother to get the matching letters
    characters = characters.concat(characters);

    for (let i = 0; i < GameSettings.totalCards; i++) {
        let rng = Math.floor(Math.random() * characters.length);
        result += characters.charAt(rng);
        // Create a new array with all of the characters excluding the (random) one that has been added to the result
        // This ensures every character is used twice
        characters = characters.slice(0, rng) + characters.slice(rng + 1);
    }

    return result;
}

// Generate unique letters for the deck of cards
function generateLetters(characters) {
    let rng = Math.floor(Math.random() * GameSettings.totalCards);
    let letter = GameSettings.letters.charAt(rng);
    return !characters.includes(letter) ? letter : generateLetters(characters);
}

// Shuffle all of the pictures that are returned from the promise
async function shufflePictures() {
    let pictures = [];

    for (let i = 0; i < (GameSettings.totalCards / 2); i++) {
        promiseRandomPicture(i);
    }

    // We could catch on error, however the memory game is not playable with one picture missing
    await Promise.all(window.allPromises).then((value) => {
        value.forEach((blob) => pictures.push(window.URL.createObjectURL(blob)));
        // Concat the pictures with eachother to get the matching pictures
        pictures = pictures.concat(pictures);
    });

    // Randomly shuffle the pictures
    return pictures.sort(() => 0.5 - Math.random());
}

// Get a random picture from Lorem Picsum
function promiseRandomPicture(index) {
    window.allPromises ??= [];

    // Fetch a picture as a blob, to create an object url later on
    let promise = new Promise(function (resolve, reject) {
        let request = new XMLHttpRequest();
        request.responseType = "blob";
        // Disable caching the request by appending an unique index to the url, so the pictures cannot be the same
        request.open("GET", "https://picsum.photos/250?index=" + index, true);

        request.onload = function () {
            if (request.status == 200) {
                resolve(request.response);
            }
            else {
                reject("Picture not found");
            }
        };

        request.send();
    });

    // Push the promise into a global array containing all promises, so we can resolve them later
    window.allPromises.push(promise);
}

function updateFoundCardPairs(foundCardPairs) {
    document.getElementById("foundCardPairs").innerHTML = foundCardPairs;
}

// Celebration mode for when the player has won the game
function updateColors() {
    window.foo = setInterval(function () {
        let cards = document.getElementsByClassName("card");
        for (let i = 0; i < cards.length; i++) {
            cards[i].style.transition = 'background-color 1s ease';
            cards[i].style.backgroundColor = colors[currentColorIndex];
        }

        currentColorIndex = (currentColorIndex + 1) % colors.length;
    }, 1000);
}

function addClass(element, className) {
    if (!element.classList.contains(className)) {
        element.classList.add(className);
    }
}

function removeClass(element, className) {
    if (element.classList.contains(className)) {
        element.classList.remove(className);
    }
}


// Represents the deck of cards in the memory game
class Cards {
    constructor() {
        this.cards = [];

        // Reset the game state when starting a new game
        GameState.firstFlippedCard = null;
        GameState.lastFlippedCard = null;
        GameState.clickInProgress = false;
        GameState.maxCardsFlipped = false;
        GameState.foundCardPairs = 0;
        updateFoundCardPairs(GameState.foundCardPairs);

        // Remove all the cards from the playing field when starting a new game
        document.getElementById("playingField").innerHTML = "";
    }

    // Adds an event listener to each card, so the card knows how to handle a click
    prepareCards() {
        for (let i = 0; i < this.cards.length; i++) {
            let card = this.cards[i];
            let cardDOM = card.getCardAsDOM(card.id);
            cardDOM.addEventListener("click", function () {
                card.handleClick();
            });
        }
    }

    // Generates the cards based on the provided settings
    generateCards() {
        let letters = shuffleLetters();

        for (let i = 0; i < GameSettings.totalCards; i++) {
            let id = "card" + (i + 1);
            let letter = letters.charAt(i);
            let card = new Card(id, letter);
            this.cards.push(card);

            // -- UNCOMMENT FOR DEBUGGING PURPOSES --
            // document.getElementById("playingField").innerHTML += "<div class=\"card border closed\" id=\"" + id + "\"><div class=\"inner-card\">" + letter + "</div></div>";
            document.getElementById("playingField").innerHTML += "<div class=\"card border closed\" id=\"" + id + "\"><div class=\"inner-card\">" + GameSettings.character + "</div></div>";
        }

        this.prepareCards();
    }

    // Generates the picture cards based on the provided settings
    async generatePictureCards() {
        let pictures = await shufflePictures();

        for (let i = 0; i < GameSettings.totalCards; i++) {
            let id = "card" + (i + 1);
            let picture = pictures[i];
            let card = new Card(id, picture);
            this.cards.push(card);

            // -- UNCOMMENT FOR DEBUGGING PURPOSES --
            // document.getElementById("playingField").innerHTML += "<div class=\"card closed\" id=\"" + id + "\"><div class=\"inner-card\">" + GameSettings.character + "<img src=\"" + picture + "\"></div></div>";
            document.getElementById("playingField").innerHTML += "<div class=\"card closed\" id=\"" + id + "\"><div class=\"inner-card\">" + GameSettings.character + "</div></div>";
        }

        this.prepareCards();
    }
}

// Represents a card of the deck of cards in the memory game
class Card {
    constructor(id, value) {
        this.id = id
        this.value = value;
        this.state = new State();
    }

    open(cardDOM) {
        cardDOM.innerHTML = GameSettings.pictures ?
            cardDOM.innerHTML.replace(GameSettings.character, "<span>" + GameSettings.character + "</span><img src=\"" + this.value + "\">") :
            cardDOM.innerHTML.replace(GameSettings.character, this.value);
    }

    close(cardDOM) {
        cardDOM.innerHTML = GameSettings.pictures ?
            cardDOM.innerHTML.replace("<span>" + GameSettings.character + "</span><img src=\"" + this.value + "\">", GameSettings.character) :
            cardDOM.innerHTML.replace(this.value, GameSettings.character);
    }

    // Handles most of the logic when opening, closing, and finding matches of cards to prevent duplicate code
    switchCardState(state) {
        let cardDOM = this.getCardAsDOM(this.id);

        // Assign the current state to the card
        this.state.open = state === CardState.OPEN;
        this.state.closed = state === CardState.CLOSED;
        this.state.found = state === CardState.FOUND;

        // Add or remove classes depending on the current state
        for (let i = 0; i < CardState.stateCollection.length; i++) {
            if (CardState.stateCollection[i] === state) {
                addClass(cardDOM, CardState.stateCollection[i]);
            }
            else {
                removeClass(cardDOM, CardState.stateCollection[i]);
            }
        }

        // Simulate a card flip by changing the inner HTML of the card
        if (state === CardState.OPEN) {
            this.open(cardDOM);
        }
        else if (state === CardState.CLOSED) {
            this.close(cardDOM);
        }
    }

    // Handles the logic when a card has been clicked
    handleClick() {
        // Start the timers on the first click of the game
        if (window.elapsedTimer === undefined) {
            updateTimers();
        }

        // If the same card has been clicked, or the card has already been found, do not continue
        if (GameState.clickInProgress ||
            GameState.firstFlippedCard?.id === this.id ||
            GameState.lastFlippedCard?.id === this.id ||
            this.state.found) {
            return;
        }

        // If two cards are flipped, close them, reset some state values, and execute handleClick again
        if (GameState.maxCardsFlipped) {
            GameState.firstFlippedCard.switchCardState(CardState.CLOSED);
            GameState.lastFlippedCard.switchCardState(CardState.CLOSED);

            // Empty the clicked state
            GameState.firstFlippedCard = null;
            GameState.lastFlippedCard = null;
            GameState.maxCardsFlipped = false;
            return this.handleClick();
        }

        // Currently no cards are flipped, open the first one
        if (GameState.firstFlippedCard === null) {
            this.switchCardState(CardState.OPEN);
            GameState.firstFlippedCard = this;
        }
        else {
            // Check if one card is already open, if so check if the value matches with the one clicked
            GameState.clickInProgress = true;

            // If the card matched with the previous card
            if (this.value === GameState.firstFlippedCard.value) {
                this.switchCardState(CardState.OPEN);
                this.switchCardState(CardState.FOUND);

                GameState.firstFlippedCard.switchCardState(CardState.FOUND);
                GameState.firstFlippedCard = null;
                // Add the found card pair to the total found card pairs
                GameState.foundCardPairs++;

                // Update the found card pairs HTML
                updateFoundCardPairs(GameState.foundCardPairs);

                // Check if all of the cards are found
                if (GameState.foundCardPairs === (GameSettings.totalCards / 2)) {
                    gameOver(false);
                }
            }
            else {
                // Open the card so the player can see the value
                this.switchCardState(CardState.OPEN);
                GameState.lastFlippedCard = this;
                GameState.maxCardsFlipped = true;
            }

            GameState.clickInProgress = false;
        }
    }

    // Get the card with the provided id as Document Object Model
    getCardAsDOM(id) {
        return document.getElementById(id);
    }
}

// The state of a card object
class State {
    constructor() {
        this.open = false;
        this.closed = true;
        this.found = false;
    }
}

// The possible states that a card can contain
class CardState {
    // Write in uppercase to indicate that these properties should be constant
    static OPEN = "open";
    static CLOSED = "closed";
    static FOUND = "found";

    static stateCollection = [this.OPEN, this.CLOSED, this.FOUND];
}

// Contains the current state of the game
class GameState {
    static firstFlippedCard = null;
    static lastFlippedCard = null;
    static clickInProgress = false;
    static maxCardsFlipped = false;
    static foundCardPairs = 0;
}

// Represents all the dynamic settings in the memory game
class GameSettings {
    static letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static character = "+";
    static pictures = false;
    static fieldSize = 6;
    static totalCards = this.fieldSize * this.fieldSize;
    static totalPlayTime = 7 * this.totalCards;
    static closedCardColor = "#333333";
    static openCardColor = "#0075FF";
    static foundCardColor = "#197300";
}

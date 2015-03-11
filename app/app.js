var app = angular.module('Pointi-scoreboard', ["ngRoute", "ngTouch", "mobile-angular-ui", "ngAnimate", "firebase", "googlechart"]);
app.factory("Auth", ["$firebaseAuth",
    function($firebaseAuth) {
        var authRef = new Firebase("https://pointi-scoreboard.firebaseio.com/users");
        return $firebaseAuth(authRef);
    }
]);
app.config(function($routeProvider, $locationProvider) {
    $routeProvider.when('/', {
        templateUrl: "plays.html"
    });
    $routeProvider.when('/plays/:playID', {
        templateUrl: "play.html"
        //params.playID
    });
    $routeProvider.when('/plays/:playID/history', {
        templateUrl: "history.html"
        //params.playID
    });
    $routeProvider.when('/plays/:playID/details', {
        templateUrl: "details.html"
        //params.playID
    });
    $routeProvider.when('/plays/:playID/delete', {
        templateUrl: "delete-play.html"
        //params.playID
    });
    $routeProvider.when('/plays/:playID/scoreboard', {
        templateUrl: "scoreboard.html"
        //params.playID
    });
    $routeProvider.when('/plays/:playID/edit/:playerID', {
        templateUrl: "edit-player.html"
        //params.playID & params.playerID
    });
});
app.filter('displayPart', function() { //custom 'pagination' filter, used to seperate scorebaord into 3 columns
    return function(data, start, end) {
        var filtered = [];
        var i = 0;
        angular.forEach(data, function() {
            if(i >= start && i <= end) filtered.push(data[i]);
            i++;
        });
        return filtered;
    }
});
app.controller('PlayerController', function($rootScope, $scope, $firebase, $routeParams, $location, $window) {
    //EDITING PLAYER IN A GAME
    $rootScope.loading = true;
    var params = $routeParams;
    if($scope.user) {
        if(params.playID) {
            if(params.playerID) {
                var playRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID);
                var playerRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID + "/players/" + params.playerID);
                var play = $firebase(playRef).$asObject();
                var player = $firebase(playerRef).$asObject();
                $rootScope.loading = false;
                $scope.play = play;
                $scope.player = player;
                //$scope.player.playerNameTitle = player.playername;
                $scope.updatePlayer = function() {
                    console.log("player updated");
                    player.$save();
                    $window.history.go(-1);
                }
            }
        }
    }
});
app.controller('DeletePlayController', function($rootScope, $scope, $firebase, $routeParams, $location, $window) {
    //DELETING PLAY
    //$rootScope.loading = true;
    //var timer = [];
    var params = $routeParams;
    var playID = params.playID;
    if($scope.user) {
        if(playID) {
            console.log("params.playID: " + playID);
            var playRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + playID);
            $scope.deletePlay = function() {
                //FIRST REMOVE PLAY RECORD
                playRef.remove(function(error) {
                    if(error) {
                        console.log("error: " + error)
                    }
                    var accessRef = new Firebase("https://pointi-scoreboard.firebaseio.com/play-access");
                    accessRef.once('value', function(dataSnapshot) {
                        dataSnapshot.forEach(function(childSnapshot) { //CHECK EACH ACCESS RECORD
                            var user = childSnapshot.key();
                            if(childSnapshot.child(playID).exists()) {
                                var deleteRef = childSnapshot.child(playID).ref(); //THEN REMOVE ACCESS RECORDS
                                deleteRef.remove(function(error) {
                                    console.log("access record removed for: " + user);
                                });
                            }
                        });
                        console.log(" -> successful");
                        $window.location.href = "#/";
                        $window.location.reload();
                    }, function(err) {
                        console.log("Error with once(): " + err);
                    });
                });
            }
        }
    }
});
app.controller('ScoreController3', function($rootScope, $scope, $firebase, $routeParams, $location, $window) {
    $rootScope.loading = true;
    var timer = []; //ARRAY OF TIMERS - 1 PER PLAYER
    var params = $routeParams;
    if($scope.user) {
        if(params.playID) { //show individual play
            console.log("playID = " + params.playID);
            //PLAY
            var playRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID);
            var play = $firebase(playRef).$asObject();
            $scope.play = play;
            //PLAYERS
            var playerRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID + "/players");
            var players = $firebase(playerRef).$asArray();
            players.$loaded().then(function() {
                $rootScope.loading = false;
                $scope.players = players;
                var numberOfPlayers = players.length;
                $scope.numberOfPlayers = numberOfPlayers;
                $scope.scorePredicate = "playerName";
                $scope.scoreBoardPredicate = "-playerScore";
                $scope.chatPredicate = '-ISOtime';
                $scope.columnStyle1 = ""; //DYNAMIC STYLES FOR 1, 2 OR 3 COLUMNS
                $scope.columnStyle2 = "";
                $scope.columnStyle3 = "";

                function checkColumns() {
                    var newNumberOfPlayers;
                    playRef.child("numberOfPlayers").once("value", function(data) {
                        newNumberOfPlayers = data.val();
                    }); //CHECK REFERENCE DIRECTLY BECAUSE $scope.numberOfPlayers WILL BE OUT OF DATE
                    
                    var numberOfColumns = Math.ceil(newNumberOfPlayers / 10); //10 PER COLUMN
                    //THIS COULD PROBABLY BE DONE NEATER
                    var styles1 = []; //column #1
                    var styles2 = []; //column #2
                    var styles3 = []; //column #3
                    //1 column layout
                    styles1[1] = "col-xs-12 col-md-6 col-md-offset-3";
                    styles2[1] = "hidden";
                    styles3[1] = "hidden";
                    //2 column layout
                    styles1[2] = "col-xs-12 col-md-5 col-md-offset-1";
                    styles2[2] = "col-xs-12 col-md-5 col-md-offset-1";
                    styles3[2] = "hidden";
                    //3 column layout
                    styles1[3] = "col-xs-12 col-md-4";
                    styles2[3] = "col-xs-12 col-md-4";
                    styles3[3] = "col-xs-12 col-md-4";
                    $scope.columnStyle1 = styles1[numberOfColumns];
                    $scope.columnStyle2 = styles2[numberOfColumns];
                    $scope.columnStyle3 = styles3[numberOfColumns];
                }
                
                checkColumns(); //CHECK COLUMNS ON LOAD
                
                players.$watch(function(event) {
                    checkColumns(); //CHECK COLUMNS EVERY TIME PLAYERS ARE ADDED OR REMOVED
                });
                //
                //functions
                //

                $scope.addPlayer = function() {
                    var time = new Date();
                    play.time = time.toUTCString();
                    play.ISOtime = time.toISOString();
                    play.numberOfPlayers += 1;
                    play.$save(); //SHOULD PROBABLY GO IN A PROMISE AFTER ACTUALLY ADDING THE PLAYER vvv
                    numberOfPlayers += 1; //WHY?
                    $scope.numberOfPlayers = numberOfPlayers; //^^^ REDUNDANT CAT IS REDUNDANT?
                    var playerName = $scope.playerName || 'anonymous'; //SHOULDN'T BE USED - SHOULD HANDLE BLANK FORM BETTER
                    $scope.players.$add({
                        playerName: playerName.substr(0, 13), //LIMIT TO 13 CHARACTER NAMES
                        playerScore: 0,
                        turnOrder: 0,
                        tempScore: "",
                        stars: 0,
                        history: ""
                    });
                    $scope.playerName = "";
                }
                
                $scope.removePlayer = function(player) {
                    console.log("delete player: " + player.$id);
                    players.$remove(player).then(function(ref) {
                        play.numberOfPlayers -= 1;
                        play.$save();
                        console.log(" -> successful");
                    }, function(error) {
                        console.log("Error:", error);
                    });
                }
                
                $scope.updateScore = function(player, update) {
                    var playerNum = players.$indexFor(player.$id);
                    clearTimeout(timer[playerNum]); //RESET TIMER FOR THIS PLAYER
                    player.tempScore = Number(player.tempScore) + update;
                    wait(playerNum, function() {
                        finalupdate(player, playerNum, player.tempScore);
                        player.tempScore = "";
                        players.$save(player);
                    }, 2000); //WAIT 2 SECONDS BEFORE UPDATING
                }

                function wait(ref, func, time) {
                    timer[ref] = setTimeout(func, time); //SEPERATING THE FUNCTIONS SEEMED TO MAKE IT WORK?
                }

                function finalupdate(player, playerNum, update) {
                    $rootScope.toggle('overlay-' + player.$id, 'off');
                    var time = new Date();
                    play.time = time.toUTCString();
                    play.ISOtime = time.toISOString(); //BOTH WERE SAVED WHILE I WORKED OUT DATE FORMATS, BUT FILTERS ARE NOW EMPLOYED ON THE ISO TIME
                    play.$save();
                    var newScore = player.playerScore + Number(update);
                    console.log(player.playerName + " scored " + update + " = " + newScore);
                    player.playerScore = newScore;
                    var maxHistory = 16;
                    var newHistory = update.toString();
                    if(player.history.length > 0) { //NOT NEEDED ON SCOREBOARD?
                        newHistory = newHistory + ", " + player.history;
                    }
                    if(player.history.length >= maxHistory) {
                        newHistory = newHistory.substr(0, maxHistory).concat("...");
                    }
                    player.history = newHistory;
                    players.$save(player).then(function() {
                        console.log(" -> successful");
                        clearTimeout(timer[playerNum]); //CLEAR ANY LINGERING TIMER
                        var time = new Date();
                        var playerScoreRef = playerRef.child(player.$id + "/scores");
                        playerScoreRef.push({ //TO BE USED FOR GRAPHS? NOT USED IN SCOREBOARD, YET
                            score: newScore,
                            time: time.toUTCString()
                        });
                    });
                }
                
                $scope.updateStars = function(player, update) {
                    var time = new Date();
                    play.time = time.toUTCString();
                    play.ISOtime = time.toISOString();
                    play.$save();
                    var newScore = player.stars + Number(update);
                    if(newScore>3) newScore = 3;
                    if(newScore<0) newScore = 0;
                    player.stars = newScore;                    
                    players.$save(player).then(function() {
                        console.log(" -> successful");
                    });
                }
                
            });
        } else {  //show all plays
            console.log("list games");
            var ref = new Firebase("https://pointi-scoreboard.firebaseio.com/play-access/" + $scope.user.uid);
            var availablePlays = $firebase(ref).$asArray();
            availablePlays.$loaded().then(function() {
                var playsToShow = {}; //FOR EACH ACCESS RECORD, LOAD PLAY DATA INTO NEW ARRAY
                var playCount = 0;
                ref.once('value', function(dataSnapshot) {
                    dataSnapshot.forEach(function(childSnapshot) {
                        var playId = childSnapshot.key();
                        var playRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + playId);
                        var sync = $firebase(playRef);
                        var playSync = sync.$asObject();
                        playsToShow[playCount] = playSync;
                        playCount += 1;
                    });
                    $rootScope.loading = false;
                });
                $scope.playCount = playCount;
                $scope.playsToShow = playsToShow;
                
                $scope.addPlay = function() {
                    var playsRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/");
                    var plays = $firebase(playsRef).$asArray();
                    var gameName = $scope.gameName || 'anonymous';
                    var time = new Date();
                    plays.$add({
                        gameName: gameName,
                        creatorUid: $scope.user.uid,
                        time: time.toUTCString(),
                        ISOtime: time.toISOString(),
                        numberOfPlayers: 0
                    }).then(function(ref) {
                        var id = ref.key();
                        console.log("added record with id " + id);
                        var accessRef = new Firebase("https://pointi-scoreboard.firebaseio.com/play-access/" + $scope.user.uid);
                        accessRef.child(id).set({
                            time: time.toUTCString() //CREATE ACCESS RECORD WITH NEW PLAY $id AS KEY, DATE IS NOT NECESSARY BUT USEFUL FOR SEEING CREATION DATE
                        }, function(error) {
                            $window.location.href = "#/plays/" + id + "/details"; //LOAD PLAY AFTER CREATING
                            if(error) {
                                console.log("error: " + error);
                            }
                        });
                    });
                }
                
            });
        }
    } else {
        $rootScope.loading = false;
    }
});

app.controller('MainController', function($rootScope, $scope, $firebase, $window, Auth) {
    //ROUTING
    $rootScope.$on("$routeChangeStart", function() {
        $rootScope.loading = true;
    });
    $rootScope.$on("$routeChangeSuccess", function() {
        $rootScope.loading = false;
    });
    //AUTH
    $scope.form = {};
    $scope.auth = Auth;
    $scope.user = $scope.auth.$getAuth();
    if($scope.user) {
        var userRef = new Firebase("https://pointi-scoreboard.firebaseio.com/users/" + $scope.user.uid + "/details");
        var userDetails = $firebase(userRef).$asObject();
        $scope.userDetails = userDetails;
    }
    //FUNCTIONS
    $scope.login = function() {
        $scope.auth.$authWithPassword({
            email: $scope.form.email,
            password: $scope.form.password
        }).then(function(authData) {
            console.log("Logged in as:", authData.uid);
            $window.location.reload();
        }).
        catch(function(error) {
            console.error("Authentication failed:", error);
        });
    }
    $scope.logout = function() {
        console.log("log out");
        $scope.auth.$unauth();
        $window.location.href = "#/";
        $window.location.reload();
    }
    $scope.swapOverlay = function(overlayOff, overlayOn) {
        $rootScope.toggle(overlayOff, 'off');
        $rootScope.toggle(overlayOn, 'on');
    }
    $scope.newAccount = function() {
        var isNewUser = true;
        console.log("new account");
        console.log($scope.form.newEmail);
        console.log($scope.form.newName);
        $scope.auth.$createUser($scope.form.newEmail, $scope.form.newPassword).then(function() {
            console.log("User created successfully!");
            var usersRef = new Firebase("https://pointi-scoreboard.firebaseio.com/users");
            usersRef.onAuth(function(authData) {
                if(authData && isNewUser) {
                    // save the user's profile into Firebase so we can list users,
                    // use them in Security and Firebase Rules, and show profiles
                    usersRef.child(authData.uid).set(authData);
                    //try to save extra details
                    usersRef.child(authData.uid).child("details").set({
                        name: $scope.form.newName,
                    });
                }
            });
            return $scope.auth.$authWithPassword({
                email: $scope.form.newEmail,
                password: $scope.form.newPassword
            });
        }).then(function(authData) {
            console.log("Logged in as:", authData.uid);
            $window.location.reload();
        }).
        catch(function(error) {
            console.error("Error: ", error);
        });
    }
});
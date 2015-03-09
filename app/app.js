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
        //params.playID
    });
});


app.controller('PlayerController', function($rootScope, $scope, $firebase, $routeParams, $location, $window) {
    //EDITING PLAYER IN A GAME
    $rootScope.loading = true;
    //var timer = [];
    var params = $routeParams;
    if($scope.user) {
        if(params.playID) {
            if(params.playerID) {
                console.log("1. player update");
                var playRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID);
                var playerRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID + "/players/" + params.playerID);
                var play = $firebase(playRef).$asObject();
                var player = $firebase(playerRef).$asObject();
                $rootScope.loading = false;
                //var scores = scoresSync.$asObject();
                //scores.$bindTo($scope, "scores");
                $scope.play = play;
                $scope.player = player;
                //$scope.player.playerNameTitle = player.playername;
                $scope.updatePlayer = function() {
                    console.log("2. player updated");
                    //scores.p1Score = p1Score;
                    //scores.p2Score = p2Score;
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
            //var play = $firebase(playRef).$asObject();
            $scope.deletePlay = function() {
                //console.log("delete play id: " + play.$id);
                playRef.remove(function(error) {
                    if(error) {
                        console.log("error: " + error)
                    }
                    // data has been saved to Firebase
                    var accessRef = new Firebase("https://pointi-scoreboard.firebaseio.com/play-access");
                    accessRef.once('value', function(dataSnapshot) {
                        dataSnapshot.forEach(function(childSnapshot) {
                            //CHECK EACH ACCESS RECORD
                            var user = childSnapshot.key();
                            //console.log(id.ref());
                            if(childSnapshot.child(playID).exists()) {
                                var deleteRef = childSnapshot.child(playID).ref();
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
    //SCORE TESTING - n Players
    //
    //add score history & plays (instances of a game)
    //
    //
    $rootScope.loading = true;
    var timer = [];
    var params = $routeParams;
    if($scope.user) {
        if(params.playID) {
            //show individual play
            console.log("playID = " + params.playID);
            //PLAY REF
            var playRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID);
            var play = $firebase(playRef).$asObject();
            $scope.play = play;
            //PLAYERS REF
            var playerRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID + "/players");
            var players = $firebase(playerRef).$asArray();
            
            //chatRef.on("child_added", function(snapshot) {
            //    messages = $firebase(chatRef).$asArray();
            //    $scope.messages = messages;
            //    $scope.numberOfMessages = messages.length;
            //});
            players.$loaded().then(function() {
                $rootScope.loading = false;
                //console.log(players.length + " players in play");
                var numberOfPlayers = players.length;
                $scope.scorePredicate = "playerName";
                $scope.scoreBoardPredicate = "-playerScore";
                $scope.chatPredicate = '-ISOtime';
                $scope.numberOfPlayers = numberOfPlayers;
                $scope.players = players;
                //
                //functions
                //
                $scope.addPlayer = function() {
                    var time = new Date();
                    //console.log("update time");
                    play.time = time.toUTCString();
                    play.ISOtime = time.toISOString();
                    play.numberOfPlayers += 1;
                    play.$save();
                    
                    numberOfPlayers += 1;
                    $scope.numberOfPlayers = numberOfPlayers;
                    var playerName = $scope.playerName || 'anonymous';
                    //console.log(playerName);
                    $scope.players.$add({
                        playerName: playerName.substr(0, 13),
                        playerScore: 0,
                        turnOrder: 0,
                        tempScore: "",
                        history: ""
                    });
                    $scope.playerName = "";
                }
                $scope.removePlayer = function(player) {
                    console.log("delete player: " + player.$id);
                    players.$remove(player).then(function(ref) {
                        if(player.isUser) {
                            if(play.creatorUid == player.$id) {
                                console.log("access remains, as player is creator");
                            } else {
                                console.log("user Uid: " + player.userUid);
                                var accessRef = new Firebase("https://pointi-scoreboard.firebaseio.com/play-access/" + player.userUid + "/" + play.$id);
                                accessRef.remove(function(error) {
                                    if(error) {
                                        console.log('remove failed, ' + error);
                                    } else {
                                        console.log('remove succeeded');
                                    }
                                });
                            }
                        }
                        // data has been saved to Firebase
                        play.numberOfPlayers -= 1;
                        play.$save();
                        console.log(" -> successful");
                        //$window.location.href = "#/";
                        //$window.location.reload();
                    }, function(error) {
                        console.log("Error:", error);
                    });
                }
                $scope.updateScore = function(player, update) {
                    var playerNum = players.$indexFor(player.$id);
                    clearTimeout(timer[playerNum]); //ONE TIMER PER PLAYER
                    player.tempScore = Number(player.tempScore) + update;
                    wait(playerNum, function() {
                        finalupdate(player, playerNum, player.tempScore);
                        player.tempScore = "";
                        players.$save(player);
                    }, 2000);
                }

                function wait(ref, func, time) {
                    timer[ref] = setTimeout(func, time);
                }

                function finalupdate(player, playerNum, update) {
                    $rootScope.toggle('overlay-' + player.$id, 'off');
                    var time = new Date();
                    //console.log("update time");
                    play.time = time.toUTCString();
                    play.ISOtime = time.toISOString();
                    play.$save();
                    var newScore = player.playerScore + Number(update);
                    console.log(player.playerName + " scored " + update + " = " + newScore);
                    player.playerScore = newScore;
                    var maxHistory = 16;
                    var newHistory = update.toString();
                    if(player.history.length > 0) {
                        newHistory = newHistory + ", " + player.history;
                    }
                    if(player.history.length >= maxHistory) {
                        newHistory = newHistory.substr(0, maxHistory).concat("...");
                    }
                    player.history = newHistory;
                    //console.log(player.history);
                    players.$save(player).then(function() {
                        // data has been saved to Firebase
                        console.log(" -> successful");
                        clearTimeout(timer[playerNum]);
                        var time = new Date();
                        var playerScoreRef = playerRef.child(player.$id + "/scores");
                        playerScoreRef.push({
                            score: newScore,
                            time: time.toUTCString()
                        });
                    });
                }
            });
        } else {
            //show all plays
            console.log("list games");
            var ref = new Firebase("https://pointi-scoreboard.firebaseio.com/play-access/" + $scope.user.uid);
            var availablePlays = $firebase(ref).$asArray();
            availablePlays.$loaded().then(function() {
                //TODO: for each available play, load play data into array
                var playsToShow = {};
                var playCount = 0;
                /////////////////
                ref.once('value', function(dataSnapshot) {
                    dataSnapshot.forEach(function(childSnapshot) {
                        //EACH PLAY
                        var playId = childSnapshot.key();
                        //console.log("playId: " + playId);
                        var playRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + playId);
                        var sync = $firebase(playRef);
                        var playSync = sync.$asObject();
                        playsToShow[playCount] = playSync;
                        playCount += 1;
                        //console.log("playCount: " + playCount);
                    });
                });
                ////////////////
                $rootScope.loading = false;
                $scope.playCount = playCount;
                $scope.playsToShow = playsToShow;
                //$scope.availablePlays = availablePlays;
                $scope.addPlay = function() {
                    //numberOfPlays += 1;
                    var playsRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/");
                    var plays = $firebase(playsRef).$asArray();
                    var gameName = $scope.gameName || 'anonymous';
                    var time = new Date();
                    //ADD TO FIREBASE
                    //console.log(gameName);
                    //console.log(time);
                    //console.log($scope.user.uid);
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
                            time: time.toUTCString()
                        }, function(error) {
                            $window.location.href = "#/plays/" + id + "/details";
                            if(error) {
                                console.log("error: " + error);
                            }
                        });
                        //console.log("added access record");
                    });
                }
            });
        }
    } else {
        $rootScope.loading = false;
    }
});
app.controller('historyController', function($rootScope, $scope, $firebase, $routeParams) {
    //history TESTING
    //
    //var timer = [];
    var params = $routeParams;
    if(params.playID) {
        var testdata = new google.visualization.DataTable();
        //show individual play
        console.log("params playID = " + params.playID);
        var playRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID);
        var play = $firebase(playRef).$asObject();
        //play.$bindTo($scope, "play");
        $scope.play = play;
        var playerRef = new Firebase("https://pointi-scoreboard.firebaseio.com/plays/" + params.playID + "/players");
        var players = $firebase(playerRef).$asArray();
        players.$loaded().then(function() {
            console.log(players.length + " players in play");
            var numberOfPlayers = players.length;
            playerRef.on("child_removed", function(snapshot) {
                var deletedPost = snapshot.val();
                console.log("Player '" + deletedPost.playerName + "' has been deleted");
                numberOfPlayers -= 1;
            });
            $scope.predicate = "-playerScore";
            $scope.numberOfPlayers = numberOfPlayers;
            $scope.players = players;
            var chart1 = {};
            chart1.type = "LineChart";
            chart1.cssStyle = "width:100%";
            //
            //
            //
            //TODO convert data!
            //
            //
            //
            //
            // Declare columns
            testdata.addColumn('string', 'Score datetime');
            testdata.addColumn('number', 'score');
            testdata.addColumn('number', 'score 2');
            //
            //column per player
            //
            //for(var x in players) {
            //if(players[x].playerName) {
            //console.log(x + "/ " + players[x].playerName);
            //Add data.
            //
            //test:
            var data1a = new Date("Thu, 11 Dec 2014 21:49:18 GMT").toTimeString();
            var data2a = new Date("Thu, 11 Dec 2014 22:00:18 GMT").toTimeString();
            var data3a = new Date("Thu, 11 Dec 2014 22:05:18 GMT").toTimeString();
            var data4a = new Date("Thu, 11 Dec 2014 22:49:18 GMT").toTimeString();
            var data5a = new Date("Thu, 11 Dec 2014 23:50:18 GMT").toTimeString();
            var data6a = new Date("Thu, 11 Dec 2014 23:55:18 GMT").toTimeString();
            var data7a = new Date("Thu, 11 Dec 2014 23:55:18 GMT").toTimeString();
            var data8a = new Date("Fri, 12 Dec 2014 00:10:18 GMT").toTimeString();
            testdata.addRows([
                [data1a.substr(0, 5), 2, 4],
                [data2a.substr(0, 5), 3, 5],
                [data3a.substr(0, 5), 5, 1],
                [data4a.substr(0, 5), 10, 1],
                [data5a.substr(0, 5), 11, 1],
                [data6a.substr(0, 5), 1, 6],
                [data7a.substr(0, 5), 6, 5],
                [data8a.substr(0, 5), 6, 5]
            ]);
            //
            //row per 'time-slot' - e.g. KeepScore uses 5 minute slots
            //
            //
            //scores[x].playerScore = 0;
            //console.log("player " + scores[x].playerID + " score to 0");
            //scores.$save(scores[x]).then(function() {
            //    // data has been saved to Firebase
            //    console.log(" -> updated scores");
            //});
            //}
            //}
            //data.addRows
            //
            chart1.data = testdata;
            chart1.options = {
                "legend": {
                    "position": "top",
                    "maxLines": 4
                },
                "displayExactValues": true,
                "hAxis": {
                    "title": "TEST DATA ONLY"
                },
                "domainAxis": {
                    "type": "category"
                }
            };
            chart1.formatters = {};
            $scope.chart = chart1;
        });
    } else {
        console.log("no params");
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
    //$scope.userDetails = $scope.user.child("details");
    //FUNCTIONS
    $scope.login = function() {
        //console.log("login");
        $scope.auth.$authWithPassword({
            email: $scope.form.email,
            password: $scope.form.password
        }).then(function(authData) {
            console.log("Logged in as:", authData.uid);
            //$location.path(absUrl);
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
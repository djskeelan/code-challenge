/**
 * Created by djskeelan on 8/5/2016.
 */
var cheggv = (function() {
    var API, USERNAMEP, SEPARATOR, MESSAGES, NUMBER_TO_SHOW, NUMBER_TO_GENERATE;
    // Constants
    API = "http://chegg-tutors.appspot.com/coding-challenge/api/user/?";
    USERNAMEP = "username";
    SEPARATOR = ",";
    NUMBER_TO_SHOW = 3;
    NUMBER_TO_GENERATE = 5;
    MESSAGES = {
        'INVALID_STRING' : "Please enter a user name containing only letters, numbers and underscore.",
        'AVAILABLE' : "Congrats! <span style='font-weight: bold'>%s</span> is available",
        'NOT_AVAILABLE' : "<span style='font-weight: bold'>%s</span> is not available. How about one of these",
        'SERVER_ERROR' : "Server Error"
    };

    // Private functions
    function getFeedbackText(key, value) {
        var msg;
        msg = MESSAGES[key];
        if (msg) {
            if (value) {
                msg = msg.replace(/%s/, value);
            }
        }
        return msg;
    }

    function showFeedback(html) {
        // Always re-enable the check availability button
        $("#chg-balloon-submit").prop("disabled", false);
        // Write the message to the div
        $("#chg-balloon-feedback-container").html(html);
    }

    function showAvailable(username) {
        // Build HTML
        var html;
        var html = '<p><span class="material-icons" style="color:green">check_box</span>';
        html += "<span>" + getFeedbackText('AVAILABLE', username) + "</span></p>";
        showFeedback(html);
    }
    function showSuggestions(username, suggestions) {
        // Build HTML
        var html,i;
        html = '<p><span class="material-icons" style="color:red">error</span>';
        html += "<span>" + getFeedbackText('NOT_AVAILABLE', username) + "</span></p>";
        html += "<div id='chg-balloon-feedback-suggestions'>";
        for (i = 0; i < NUMBER_TO_SHOW ; i++ ) {
            html += "<div>" + suggestions[i] + "</div>"
        }
        html += "</div>";
        showFeedback(html);
    }

    function reportError() {
        showMessage("SERVER ERROR");
    }

    function getWordList(username) {
        // TODO: Find an API to get similar words to use as alternatives.
        // Hardcode word list for the moment
        return [ "ForPresident" , "student", "customer",  "buyer", "shopper"];
    }

    //  Generate a list of possible alternative user names and make a single API call
    function generateAltUsernames(username) {
        var nodigits, alts = [], hasDigits, year, wordlist, i, j, newname, words, r;

        // Pull any digits out of the user name and try it as a possible name
        nodigits = username.replace(/[0-9]/g, "");
        hasDigits = username.length !== nodigits.length;
        year = new Date().getFullYear();
        words = getWordList(username);

        //  If username contains digits, pull them out and try that user name
        //   Spec: At least one submission should have no numerical characters
        if (hasDigits) {
            // Push username without digits as possible choice
            alts.push(nodigits);
            // When generate possible usernames, use the string without the digits
            newname = nodigits;

            // Apoend 1st word to both username with and without digits.
            alts.push(newname + words[0]);
            ;

            // Replace digits with current year
            if (!username.search(year)) {
                alts.push(username.replace(/[0-9]/g, year));
            }
        }
        else {
            // Add year to the end since username had not digits
            alts.push(username + year);

            // Push nodigits with 1st like word appended
            alts.push(username + words[0]);

            // Add the similar word with the year
            alts.push(words[0] + year);
            newname = username;

        }

        // Generate a number of entries with additional digits on the end
        // If NUMBER_TO_GENERATE is 4 and r is 5
        //  10, 11, 12, 13, 55, 56, 57, 58
        //  100, 101, 102, 103, 155, 156, 157, 158
        //  200, 201, 202, 203, 255, 256, 257, 258
        //  300, 301, 302, 304, 355, 356, 357, 358
        r = Math.floor((Math.random() * 10) + 1);
        for ( j = 1 ; j < (10 * NUMBER_TO_GENERATE) ;  j += 10 ) {
            for (i = 0; i < NUMBER_TO_GENERATE ; i++) {
                // String type conversion wins over number
                alts.push(newname + j + i);
                alts.push(newname + (j + r) + i);
            }
        }

        return alts;
    }

    function checkUsernames(original, usernames, f) {
        var names;
        // Remember all user names which are passed so
        // they can be compared against return user names
        // The username API returns already registered usernames
        names = usernames.split(SEPARATOR);
        $.ajax(encodeURI(API + USERNAMEP + "=" + usernames))
            .done(function(data) {
                f(original, names, data);
            })
            .fail(function() {
                reportError();
            });
    }

    function showIfAvailable(original, usernames, data) {
        // In the case of checking a single username, if data is empty
        // then let the user know
        if (data instanceof Array && data.length === 0) {
            showAvailable(original);
        }
        else if (data.length === 1) {
            // Means user is NOT available.
            // Generate new list of names based of original and present 3 to the user
            // Original and usernames[0] should be the same value since it is a registered user
            checkUsernames(usernames[0], generateAltUsernames(usernames[0]).join(SEPARATOR), showAltUsernames);
        }
    }

    function showAltUsernames(original, names, data) {
        var hashmap, suggestions;
        // Compare names and data to determine and show available username suggestions
        // names [] of possible suggestion set to the server
        // data [] holds that names are NOT available.
        registered = {}; suggestions = [];

        /// Convert data in a hashmap then generate suggestions
        $.each(data, function (i,v) {
            // Remember data contain objects like {username: "Hillary", id: 9111707}
            registered[v.username] = 1;
        });
        $.each(names, function ( i, name) {
            // Already registered users are returned so skip them
            if (!registered.hasOwnProperty(name)) {
                suggestions.push(name);
            }
        });

        // TODO: Stricly speaking code should try again if NUMBER_TO_SHOW valid suggestions are not returned.

        showSuggestions(original, suggestions);
    }

    function isValidUsernameString(username) {
        // While it is NOT explicitly stated in the spec assumes only words characters as valid.
        // The username API does seem to support most special characters
        // so this condition could be removed.
        // Make a temporary assumption that the username can contain word characters
        // letters, numbers, underscore - Report username as invalid if it contains
        // any non word characters \W
        if (username && username.length > 0 && username.search(/\W/g) === -1) {
            return true
        }
        return false;
    }

    function isUsernameAvailable(username) {
        checkUsernames(username, username, showIfAvailable);
    }

    // Public API
    function checkAvailability(button) {
        var username;
        username = $("#chg-balloon-input").val();
        // Check validate if username string before comunicating to the server
        if (isValidUsernameString(username)) {
            // Disable button while determining if username is valid
            button.disabled = true;

            // Call username API to see if name is taken
            isUsernameAvailable(username);
        }
        else {
            // String not valid show letter the user know
            alert(getFeedbackText("INVALID_STRING"));
            button.disabled = false;
        }
    }

    /// Pseudo module with public API
    return {
        checkAvailability : checkAvailability
    };
}());

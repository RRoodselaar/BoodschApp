// refresh browser after update to start using downloaded version
window.applicationCache.addEventListener('updateready', function() {
    location.reload();
}, false);

function fillTransactions(el) {
    var uId = $(el).attr('id');
    var sum = 0.0;
    var totItems = (items ? items.slice(0) : []);
    
    // add cached items;
    var r = stash.get(boodschappen);
    if (r) $.map(r, function(item) {
        item.userId = client.currentUser.userId;
        item.users = JSON.parse(item.users).join();
        item.date = new Date(item.date);
        totItems.unshift(item);            
    });
    
    if (totItems) var row = $.map(totItems, function(item) {
        var amount = 0.0;
        var color = (!item.id ? 'mistyrose' : 'none');
        if (item.userId == uId) amount += parseFloat(item.amount);
        if (item.users.indexOf(uId) > -1) amount -= parseFloat(item.amount) / item.users.split(',').length;
        if (amount != 0) {
            sum += amount;
            return $('<li>').css('background', color)
                .append($('<div style="float:left;width:90px;text-align:right" />').append(item.date.getDate()+'-'+(item.date.getMonth()+1)+'-'+item.date.getFullYear()))
                .append($('<div style="float:left;width:auto" />').append(item.text))
                .append($('<div class="currency" style="float:right;width:80px" />').append(amount.toFixed(2)));
        }
    });
    var totalrow = "";
    if (sum != 0) totalrow = $('<li>').css('font-weight','bold')
        .append($('<div style="float:left;width:90px" />').append('&nbsp;'))
        .append($('<div style="float:left;width:auto" />').append('totaal'))
        .append($('<div class="currency" style="float:right;width:80px" />').append(sum.toFixed(2)).css('text-align','right'));
    
    $(el).off('click').on('click', function () { $(this).find('ul').toggle(); })
        .append($('<ul>').append('<li>')
        .append(row).append(totalrow));
}    

var items = stash.get('items');
function getTransactions(el) {
    if (!items && navigator.onLine) itemTable.orderByDescending('date').take(1000).read().then( function (t) {
        items=t;
        stash.set('items', items);
        fillTransactions(el);
    }, handleError);
    else fillTransactions(el);
}

function refreshTotals() {
    //*
    if (!users) users = stash.get('users');
    if (users) {
        var listItems = $.map(users, function (user) {
            return $('<li>').attr('id', user.id).css('cursor','pointer')
                .on('click', function(){ getTransactions(this); })
                .append($('<div>').css('float','left').append(user.name))
                .append($('<div class="currency" />').css('float','right').css('width','80px').append(user.total.toFixed(2)));
        });
        $('#todo-items').empty().append(listItems).toggle(listItems.length > 0);
    }
    /**/
    /*
    userTable.read().then(function (users) {
        itemTable.read().then(function(items){
            compare(users, items);
        }, handleError);
    }, handleError);
}
    
function compare(users, items) {
    var us = $.map(users, function (user) {
        var tot = 0;
        $.map(items, function (item) {
            if (item.userId == user.id) tot += item.amount;
            if (item.users.indexOf(user.id) > -1)
                tot -= item.amount / item.users.split(',').length;
        });
        //userTable.update({id:user.id,name:user.name,total:tot}).then(function () {}, handleError);
        return $('<li>')
            .append($('<div>').css('float', 'left').append(user.name))
            .append($('<div>').css('float', 'right').append("&euro; " + tot.toFixed(2)));
    });
        
    $('#todo-items').empty().append(us).toggle(us.length > 0);
*/}

var boodschappen = 'boodschappen';  // name stash store (renamed after login)

function persistCachedItems() {
    var r = stash.get(boodschappen);
    if (navigator.onLine) {
        if (r && r.length > 0) {
            console.log('boodschappen: '+JSON.stringify(r));
            itemTable.insert(r.pop()).then(function () {
                stash.set(boodschappen, r);
                console.log('boodschappen: '+JSON.stringify(r));
                items = null;   // delete cached transaction history
                stash.cut('items');
                $('#summary').html('<strong style="color:green">De boodschap is opgeslagen</strong>').show();
                if (r.length > 0) persistCachedItems();
                else getUsers();
             }, handleError);
        }
    } else { // offline
        refreshTotals();
        fillTransactions();
        resetForm();
    }
}

function persist(item) {
    var r = stash.get(boodschappen);
    if (!r) r = [];
    r.push(item);
    stash.set(boodschappen, r);
    
    users.forEach(function(user){
        if (user.id == client.currentUser.userId) user.total += item.amount;
        if (item.users.indexOf(user.id) > -1) user.total -= item.amount / item.users.split(',').length;
    });
    
    persistCachedItems();
    
    /*
    console.log('boodschappen: '+JSON.stringify(r));
    if (navigator.onLine) itemTable.insert(item).then(
        function (item) {
            r.splice(r.indexOf(item), 1);
            console.log('boodschappen: '+JSON.stringify(r));
            stash.set(boodschappen, r);
            items = null;   // delete cached transaction history
            stash.cut('items');
            $('#summary').html('<strong style="color:green">De boodschap is opgeslagen</strong>').show();
            resetForm();
        }
    , handleError);
    else resetForm();
    */
}

// Handle insert
$('#add-item').submit(function (evt) {
    $("#add-item").find("input, button").attr("disabled", true);
    var datebox = $('#new-item-date'),
        datum = (datebox.val().split('-').length == 3 ? datebox.val().split('-')[2] + '/' + datebox.val().split('-')[1] + '/' + datebox.val().split('-')[0] : new Date());
    var textbox = $('#new-item-text'),
        itemText = textbox.val();
    var amountbox = $('#new-item-amount'),
        itemAmount = parseFloat(amountbox.val());
    var us = []; $('#add-item').find("input[name='users']:checked").each(function () {
        us.push($(this).val());
    });

    $('#errorlog').empty();

    var boodschap = { date: datum, amount: itemAmount, text: itemText, users: JSON.stringify(us) };
    persist(boodschap);

    datebox.focus();
    evt.preventDefault();
});

var users = stash.get('users');
function getUsers() {
    if (navigator.onLine) { // altijd opnieuw gebruikers ophalen, wanneer online
        userTable.where({}).read().then(function (us) {
            users = us;
            stash.set('users', users);
            resetForm();
        }, handleError);
    } else {
        resetForm();
    }
}

// On initial load, start by fetching the current data
function refreshAuthDisplay() {
    // Log in
    if (sessionStorage.loggedInUser) {
        client.currentUser = JSON.parse(sessionStorage.loggedInUser);
        $("#logged-out").toggle(false);
        
        // rename stash store and clear stashed items not ours
        boodschappen = client.currentUser.userId;
        if (!stash.get(boodschappen)) {
            //stash.cutAll(); // gooi je dan ook de stashed data van andere apps met stash.js weg?
            stash.cut('users');
            stash.cut('items');
        } //else checkStash();
        
        getUsers();
    } else {
        var isLoggedIn = client.currentUser !== null;
        $("#logged-in").toggle(isLoggedIn);
        $("#logged-out").toggle(!isLoggedIn);

        if (isLoggedIn) {
            // remember user locally
            sessionStorage.loggedInUser = JSON.stringify(client.currentUser);

            // register user
            userTable.insert({ id: client.currentUser.userId })
                .then(refreshAuthDisplay, handleError);
            
            //$("#login-name").text(client.currentUser.userId);
        }
    }
}

function logIn() {
    client.login("facebook").then(refreshAuthDisplay, handleError/*function (error) {
        alert(error);
    }*/);
}

function logOut() {
    client.logout();
    sessionStorage.removeItem('loggedInUser');
    refreshAuthDisplay();
    $("#add-item").find("input, button").attr("disabled", true);
    $('#summary').html('<strong>Log in om het boodschappenbedrag op te slaan</strong>').show();
}

function resetForm() {
    var userList = $.map(users, function (user) {
        var isMe = (user.id == client.currentUser.userId);
        return $('<li>')
            .append($('<label>')
            .append($('<input type="checkbox" name="users" required />')
            .attr('value', user.id)
            .attr('checked', isMe)
            .attr('onclick', 'checkUsers();'))
            .append(user.name.split(' ')[0]));
    });
    $("#add-item").find("ul").empty().append(userList);

    $('#summary').children().fadeOut(2000);
    $("#add-item").find("input, button").attr("disabled", false);
    
    refreshTotals();
}

function checkStash() {
    // is the stash up to date?
    itemTable.take(0).includeTotalCount().read().then(function (results) {
        if (items && items.length < results.totalCount) {
            items = null;
            stash.cut('items');
        }
    }, handleError);
    userTable.take(0).includeTotalCount().read().then(function (results) {
        if (users && users.length < results.totalCount) {
            users = null;
            stash.cut('users');
            
            resetForm();
        }
    }, handleError);
}

var retries = 0;
function updateIndicator() {
	// based on offline/online
    if(navigator.onLine) {
        retries++;
        userTable.take(0).read().then(() => {
            clearTimeout();
            retries = 0;
            $('body').css('background-color', '#e0e0e0');
            if (client.currentUser) {
                checkStash();
                persistCachedItems();
            }
        }, (e) => {
            setTimeout(updateIndicator, 200 * retries);
            handleError(e);
        });
    } else {
        $('body').css('background-color', 'mistyrose');
        clearTimeout();
        retries = 0;
    }
}

// On page init, fetch the data and set up event handlers
$(function () {
    // Update the online status icon based on connectivity
    window.addEventListener('online',  updateIndicator);
    window.addEventListener('offline', updateIndicator);
    updateIndicator();
    
    $("#add-item").find("input, button").attr("disabled", true);
    
    $("#logged-out button").click(logIn);
    $("#logged-in button").click(logOut);
    
    $('#summary').html('<strong>Log in om het boodschappenbedrag op te slaan</strong>');

    refreshAuthDisplay();
});

function getTodaysDate(el) {
    var d = new Date();
    el.value = d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear();
}

function checkUsers() {
    $('#add-item').find('input[name=users]').attr('required', true);
    $('#add-item').find('input[name=users]:checked').each(function(item) {
        if (item.value != sessionStorage.loggedInUser) {
            $('#add-item').find('input[name=users]').attr('required', false);
            return;
        }
    });
}

function handleError(error) {
    var text = error + (error.request ? ' - ' + error.request.status : '');
    $('#errorlog').append($('<li>').text(text));
    resetForm();
}
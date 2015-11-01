$(function () {
    var client = new WindowsAzure.MobileServiceClient("https://iclowdmobileservicestaging.azure-mobile.net/", "HFskzFvxtEzskJtARkmGJLWIcNhWxE19"),
        ItemTable = client.getTable('item'),
        userTable = client.getTable('user');

    var items;
    function fillTransactions(el) {
        var uId = $(el).attr('id');
        var sum = 0.0;
        var row = $.map(items, function(item) {
            var amount = 0.0;
            if (item.userId == uId) amount += item.amount;
            if (item.users.indexOf(uId) > -1) amount -= item.amount / item.users.split(',').length;
            if (amount != 0) {
                sum += amount;
                return $('<li>')
                    .append($('<div>').css('float','left').css('width','80px').append(item.date.getDate()+'-'+(item.date.getMonth()+1)+'-'+item.date.getFullYear()).css('text-align','right'))
                    .append($('<div>').css('float','left').css('width','auto').append(item.text))
                    .append($('<div>').css('float','right').css('width','80px').append("&euro; " + amount.toFixed(2)).css('text-align','right'));
            }
        });
        var totalrow = "";
        if (sum != 0) totalrow = $('<li>').css('font-weight','bold')
            .append($('<div>').css('float','left').css('width','80px').append('&nbsp;'))
            .append($('<div>').css('float','left').css('width','auto').append('totaal'))
            .append($('<div>').css('float','right').css('width','80px').append("&euro; " + sum.toFixed(2)).css('text-align','right'));
        
        $(el).off('click').on('click', function () { $(this).find('ul').toggle(); })
            .append($('<ul>').append('<li>')
            .append(row).append(totalrow));
    }    

    function getTransactions(el) {
        if (!items) ItemTable.orderByDescending('date').read().then( function (t) {
            items=t;
            fillTransactions(el);
        }, handleError);
        else fillTransactions(el);
    }

    function refreshTotals() {
        //*
        userTable.read().then(function (users) {
            var listItems = $.map(users, function (user) {
                return $('<li>').attr('id', user.id).css('cursor', 'pointer')
                    .on('click', function(){ getTransactions(this); })
                    .append($('<div>').css('float', 'left').append(user.name))
                    .append($('<div>').css('float', 'right').append("&euro; " + user.total.toFixed(2)));
            });
            $('#todo-items').empty().append(listItems).toggle(listItems.length > 0);
        }, handleError);
        /**/
        /*
        userTable.read().then(function (users) {
            ItemTable.read().then(function(items){
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
    
    function handleError(error) {
        var text = error + (error.request ? ' - ' + error.request.status : '');
        $('#errorlog').append($('<li>').text(text));
    }

    // Handle insert
    $('#add-item').submit(function (evt) {
        $("#add-item").find("input, button").attr("disabled", true);
        var datebox = $('#new-item-date'),
            datum = (datebox.val().split('-').length == 3 ? datebox.val().split('-')[2] + '/' + datebox.val().split('-')[1] + '/' + datebox.val().split('-')[0] : new Date());
        var textbox = $('#new-item-text'),
            itemText = textbox.val();
        var amountbox = $('#new-item-amount'),
            itemAmount = amountbox.val();
        var us = []; $('#add-item').find("input[name='users']:checked").each(function () {
            us.push($(this).val());
        });

        $('#errorlog').empty();

        if (itemText !== '' && itemAmount !== '') {
            ItemTable.insert({ date: datum, amount: itemAmount, text: itemText, users: JSON.stringify(us) }).then(
                function () {
                    items = null;
                    refreshForm();
                    $('#summary').html('<strong style="color:green">De boodschap is opgeslagen</strong>').show();
                }
            , handleError);
        }
        datebox.focus();
        evt.preventDefault();
    });

    // On initial load, start by fetching the current data
    function refreshAuthDisplay() {
        // Log in
        if (sessionStorage.loggedInUser) {
            client.currentUser = JSON.parse(sessionStorage.loggedInUser);
            $("#logged-out").toggle(false);
            refreshForm();
        } else {
            var isLoggedIn = client.currentUser !== null;
            $("#logged-in").toggle(isLoggedIn);
            $("#logged-out").toggle(!isLoggedIn);

            if (isLoggedIn) {
                // remember user locally
                sessionStorage.loggedInUser = JSON.stringify(client.currentUser);

                // register user
                userTable.insert({ id: client.currentUser.userId }).then(refreshForm, handleError);
                //$("#login-name").text(client.currentUser.userId);
            }
        }
    }

    function logIn() {
        client.login("facebook").then(refreshAuthDisplay, function (error) {
            alert(error);
        });
    }

    function logOut() {
        client.logout();
        sessionStorage.removeItem('loggedInUser');
        refreshAuthDisplay();
        $("#add-item").find("input, button").attr("disabled", true);
        $('#summary').html('<strong>Log in om het boodschappenbedrag op te slaan</strong>').show();
    }

    function refreshForm() {
        var query = userTable.where({});

        query.read().then(function (users) {
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
        });

        $('#summary').children().fadeOut(2000);
        $("#add-item").find("input, button").attr("disabled", false);
        
        refreshTotals();
    }

    // On page init, fetch the data and set up event handlers
    $(function () {
        $("#add-item").find("input, button").attr("disabled", true);
        $('#summary').html('<strong>Log in om het boodschappenbedrag op te slaan</strong>');
        $("#logged-out button").click(logIn);
        $("#logged-in button").click(logOut);
        refreshAuthDisplay();
    });
});

function getTodaysDate(el) {
    var d = new Date();
    el.value = d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear();
}

function checkUsers() {
    $('#add-item').find('input[name=users]').attr('required', true);
    if ($('#add-item').find('input[name=users]:checked')) {
        $('#add-item').find('input[name=users]').attr('required', false);
    }
}
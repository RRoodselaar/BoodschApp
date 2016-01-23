var client = new WindowsAzure.MobileServiceClient("https://iclowdmobileservice.azure-mobile.net/", "fCsocjgGjXwETiEbyPzpeVCpihHweE29"),
    itemTable = client.getTable('item'),
    userTable = client.getTable('user');
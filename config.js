var client = new WindowsAzure.MobileServiceClient("https://iclowdmobileservicestaging.azure-mobile.net/", "HFskzFvxtEzskJtARkmGJLWIcNhWxE19"),
    itemTable = client.getTable('item'),
    userTable = client.getTable('user');
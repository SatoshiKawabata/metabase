# Working with MongoDB in Metabase

This article covers:

- [Connecting to MongoDB](#connecting-to-mongodb).
- [Configuring SSL via the command line](#configuring-ssl-via-the-command-line).
- [Connecting to a MongoDB Atlas cluster](#connecting-to-a-mongodb-atlas-cluster).
- [General connectivity concerns](#general-connectivity-concerns).
- [I added fields to my database but don't see them in Metabase](#i-added-fields-to-my-database-but-dont-see-them-in-metabase).

## How does MongoDB work in Metabase

Because MongoDB contains unstructured data, Metabase takes a different approach to syncing your database's metadata. To get a sense of the schema, Metabase will scan the first 200 documents of each collection in your MongoDB. This sampling helps Metabase do things like differentiate datetime fields from string fields, and provide people with pre-populated filters. The reason Metabase only scans a sample of the documents is because scanning every document in every collection on every sync would be put too much strain on your database. And while the sampling does a pretty good job keeping Metabase up to date, it can also mean that new fields can sometimes fall through the cracks, leading to visualization issues, or even fields failing to appear in your results. For more info, check out our [troubleshooting guide](../../troubleshooting-guide/datawarehouse.html).

## Connecting to MongoDB

Go to Admin -> Databases, and click the **Add database** button. Select MongoDB from the dropdown.

There are two ways to connect to MongoDB:

1. Using the [Metabase fields to input your connection details](#using-metabase-fields).
2. Pasting your [connection string](#using-a-connection-string).

### Using Metabase fields

The default way to connect to MongoDB is to fill out your connection details in the fields Metabase provides:

- Host
- Database name
- Port
- Username
- Password
- Authentication Database (optional)
- Additional connection string options (optional)

Additional settings:

- **Use DNS SRV when connecting** Using this option requires that provided host is a FQDN. If connecting to an Atlas cluster, you might need to enable this option. If you don't know what this means, leave this disabled.

- **Use a secure connection (SSL)** Enable SSL and paste the contents of the server's SSL certificate chain in the input text box. This option is available for this method of connection only (i.e. you cannot include a certificate when connecting with a connection string).

### Using a connection string

If you'd prefer to connect to MongoDB using a [connection string](https://docs.mongodb.com/manual/reference/connection-string/),
click on **Paste a connection string**. The Metabase user interface will update with a field to paste your connection string.

Metabase currently does NOT support the following connection string parameters:

- `tlsCertificateKeyFile`
- `tlsCertificateKeyFilePassword`
- `tlsCAFile`

If you need to use a certificate, connect via the [default method](#using-metabase-fields) and enable **Use a secure connection(SSL)**.

### Settings common to both connection options

- **Use an SSH tunnel for database connections.** Some database installations can only be accessed by connecting through an SSH bastion host. This option also provides an extra layer of security when a VPN is not available. Enabling this is usually slower than a direct connection.
- **Automatically run queries when doing simple filtering and summarizing.** When this is on, Metabase will automatically run queries when users do simple explorations with the Summarize and Filter buttons when viewing a table or chart. You can turn this off if querying this database is slow. This setting doesn’t affect drill-throughs or SQL queries.
- **This is a large database, so let me choose when Metabase syncs and scans.** By default, Metabase does a lightweight hourly sync and an intensive daily scan of field values. If you have a large database, we recommend turning this on and reviewing when and how often the field value scans happen.

## Configuring SSL via the command line

You can enter a self-signed certificate via the Metabase UI (though not when using a connection string), or you can use the command line to add a self-signed certificate.

```
cp /usr/lib/jvm/default-jvm/jre/lib/security/cacerts ./cacerts.jks
keytool -import -alias cacert -storepass changeit -keystore cacerts.jks -file my-cert.pem
```

Then, start Metabase using the store:

```
java -Djavax.net.ssl.trustStore=cacerts.jks -Djavax.net.ssl.trustStorePassword=changeit -jar metabase.jar
```

Learn more about [configuring SSL with MongoDB](http://mongodb.github.io/mongo-java-driver/3.0/driver/reference/connecting/ssl/).

## Connecting to a MongoDB Atlas cluster

To make sure you are using the correct connection configuration:

1. Log into your [Atlas cluster](https://cloud.mongodb.com)

2. Select the cluster you want to connect to, and click **Connect**.

   ![Your cluster screengrab](../images/mongo_1.png "Your cluster")

3. Click **Connect Your Application**.

   ![Connect screengrab](../images/mongo_2.png "Connect")

4. Select **Java** and **3.6 or later**.

   ![Java screengrab](../images/mongo_3.png "Java")

5. The resulting connection string has the relevant information to provide to Metabase's `Add a Database` form for MongoDB.

6. You will likely want to select the option `Use DNS SRV`, which newer Atlas clusters use by default.

## General connectivity concerns

- **Connect using `DNS SRV`**, which is the recommended method for newer Atlas clusters.
- **Have you checked your cluster host whitelist?** When testing a connection but seeing failure, have you tried setting the IP whitelist to `0.0.0.0/0`? Whitelisting this address allows connections from any IP addresses. If you know the IP address(es) or CIDR block of clients, use that instead.
- **Connect to the secondary server**. When connecting to a cluster, always use the `?readPreference=secondary` argument in the connection string, which allows Metabase to read from a secondary server instead of consuming resources from the primary server.

## I added fields to my database but don't see them in Metabase

Metabase may not sync all of your fields, as it only scans the first 200 documents in a collection to get a sample of the fields the collection contains. Since any document in a MongoDB collection can contain any number of fields, the only way to get 100% coverage of all fields would be to scan every single document in every single collection, which would put too much strain on your database (so we don't do that).

One workaround is to include all possible keys in the first document of the collection, and give those keys null values. That way, Metabase will be able to recognize the correct schema for the entire collection.

## Further reading

See our troubleshooting guide for [troubleshooting your connection](../../troubleshooting-guide/datawarehouse.md)

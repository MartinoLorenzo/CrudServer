//A.  Import delle librerie
import http from "http";
import url from "url";
import fs from "fs";
import express from "express";
import dotenv from "dotenv"
import { MongoClient, ObjectId } from "mongodb";
import queryStringParser from "./queryStringParser";
import cors from "cors";

// i parametri GET sono restituiti dentro req.query
// i parametri POST sono restituiti dentro req.body
// i parametri passati come risorsa sono restituiti dentro req.params

//B.  Configurazioni
// funzione di callback richiamata in corrispondenza di ogni richiesta al server
const app: express.Express = express();
dotenv.config({
    path: ".env"
});
const connectionString = process.env.connectionStringAtlas;
const PORT = parseInt(process.env.PORT!);
const dbName = process.env.dbName;

//C.  Creazione ed avvio del server http
const server = http.createServer(app);
let paginaErrore: string = "";
// Avviamo il server sulla porta indicata
// 3000 è la porta storica di express
// se usassimo una porta diversa non cambia niente
server.listen(PORT, function () {
    console.log("Server in ascolto sulla porta " + PORT);
    // il metodo readFile non è asincrono quindi lo esegue e nel mentre va avanti
    fs.readFile("./static/error.html", function (err, content) {
        if (err) {
            paginaErrore = "<h1> Risorsa non trovata </h1>"
        }
        else {
            // bisogna fare .toString() perchè content è una sequenza di byte
            paginaErrore = content.toString();
        }
    });
});

//D.  Middleware
// 1. Request Log
app.use("/", function (req, res, next) {
    //originalUrl è la url completa richiesta dal client
    console.log(req.method + ": " + req.originalUrl);
    next();
});

// 2. Gestione risorse statiche
// lui riceve la richiesta con il file (es. index.html)
// la funzione express.static mi concatena ./static + risorsa richiesta (es. ./static + /index.html --> ./static/index.html)
app.use("/", express.static("./static"));

// 3. Lettura dei parametri post
// il json con limit indica il limite dei parametri 
// in questo caso impostiamo come limite dei parametri  5 Mb
// i parametri POST sono restituiti come json all'interno di req.body
// i parametri GET sono restituiti come json all'intenro di req.query (agganciati automaticamente perchè accodati alla url)
app.use("/", express.json({ "limit": "5mb" }));

// 4. Parsing dei parametri GET
app.use("/", queryStringParser);

// 5. Log dei parametri 
app.use("/", function (req: any, rew, next) {
    if (req["parsedQuery"] && Object.keys(req["parsedQuery"]).length > 0)
        console.log("   Parametri Query: " + JSON.stringify(req["parsedQuery"]));
    if (req["body"] && Object.keys(req["body"]).length > 0)
        console.log("   Parametri Body: " + JSON.stringify(req["body"]));
    next();
});

// 6. Vincoli CORS
// accettiamo richieste da qualunque client
const corsOptions = {
    origin: function (origin: any, callback: any) {
        return callback(null, true);
    },
    credentials: true
};
app.use("/", cors(corsOptions));

//E.  Gestione delle risorse dinamiche
// richiesta elenco delle collezioni
app.get("/api/getCollections", async function (req, res, next) {
    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const db = client.db(dbName);
    // restituisce un json per ogni collezione presente nel database
    // per ogni collezione c'è il name e altre collezioni
    const cmd = db.listCollections().toArray();
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.catch(function (err) {
        res.status(500).send("Errore lettura collezioni: " + err);
    })
    cmd.finally(function () {
        client.close();
    })
});

// inviaRichiesta("GET", "/unicorns", {filters})
app.get("/api/:collection", async function (req: any, res, next) {
    const selectedCollection = req.params.collection;
    const filters = req["parsedQuery"];
    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const db = client.db(dbName);
    const collection = client.db(dbName).collection(selectedCollection);
    const cmd = collection.find(filters).toArray();
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    })
    cmd.finally(function () {
        client.close();
    })
});

// inviaRichiesta("GET", "/unicorns/id"}) 
app.get("/api/:collection/:id", async function (req, res, next) {
    const selectedCollection = req.params.collection;
    const selectedId = req.params.id;

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const collection = client.db(dbName).collection(selectedCollection);
    const cmd = collection.findOne({ "_id": new ObjectId(selectedId) })
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    })
    cmd.finally(function () {
        client.close();
    })
});

// inviaRichiesta("POST", "/unicorns", newRecord) 
app.post("/api/:collection/", async function (req, res, next) {
    const selectedCollection = req.params.collection;
    const newRecord = req.body;

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const db = client.db(dbName);
    const collection = client.db(dbName).collection(selectedCollection);
    const cmd = collection.insertOne(newRecord);
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    })
    cmd.finally(function () {
        client.close();
    })
});

// inviaRichiesta("DELETE", "/unicorns/id") 
app.delete("/api/:collection/:id", async function (req, res, next) {
    const selectedCollection = req.params.collection;
    const _id = req.params.id;

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const collection = client.db(dbName).collection(selectedCollection);
    const cmd = collection.deleteOne({ "_id": new ObjectId(_id) });
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    })
    cmd.finally(function () {
        client.close();
    })
});

// inviaRichiesta("DELETE", "/unicorns", {filters}) 
app.delete("/api/:collection", async function (req: any, res, next) {
    const selectedCollection = req.params.collection;
    const filters = req["parsedQuery"];

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const collection = client.db(dbName).collection(selectedCollection);
    const cmd = collection.deleteMany(filters);
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    })
    cmd.finally(function () {
        client.close();
    })
});

// inviaRichiesta("PATCH", "/unicorns/id", {fieldsToUpdate})
app.patch("/api/:collection/:id", async function (req, res, next) {
    const selectedCollection = req.params.collection;
    const _id = new ObjectId(req.params.id);
    const action = req.body;

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const db = client.db(dbName);
    const collection = client.db(dbName).collection(selectedCollection);
    const cmd = collection.updateOne({ "_id": _id }, { "$set": action });
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    })
    cmd.finally(function () {
        client.close();
    })
});

// inviaRichiesta("PUT", "/unicorns/id", {mongoActions}) // specifico le singole actions
app.put("/api/:collection/:id", async function (req, res, next) {
    const selectedCollection = req.params.collection;
    const _id = new ObjectId(req.params.id);
    const action = req.body;

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const db = client.db(dbName);
    const collection = client.db(dbName).collection(selectedCollection);
    const cmd = collection.updateOne({ "_id": _id }, action);
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    })
    cmd.finally(function () {
        client.close();
    })
});

// inviaRichiesta("PUT", "/unicorns/", {"filter":{filters}, "action":{mongoActions}})
app.put("/api/:collection", async function (req, res, next) {
    const selectedCollection = req.params.collection;
    const filter = req.body.filter;
    const action = req.body.action;

    const client = new MongoClient(connectionString!);
    await client.connect().catch(function (err) {
        res.status(503).send("Errore di connessione al Database");
        return;
    });
    const db = client.db(dbName);
    const collection = client.db(dbName).collection(selectedCollection);
    const cmd = collection.updateMany(filter, action);
    cmd.then(function (data) {
        res.send(data);
    });
    cmd.catch(function (err) {
        res.status(500).send("Errore esecuzione query: " + err);
    })
    cmd.finally(function () {
        client.close();
    })
});

//F.  Default root e gestione degli errori
//  Se nessuna delle root dinamiche va a buon fine arriva qua
app.use("/", function (req, res, next) {
    // Di default res.status è 200
    res.status(404);
    if (!req.originalUrl.startsWith("/api/"))
        res.send(paginaErrore);
    else
        res.send("Risorsa non trovata");
});

//G.  Gestione degli errori
app.use("/", function (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
    //  err.stack mi indica l'elenco completo degli errori
    //  err.message è il messaggio riassuntivo dell'errore
    res.status(500).send(err.message)
    console.log("******** ERRORE ********: \n" + err.stack);
});

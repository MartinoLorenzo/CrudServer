"use strict";

// inizializzazione puntatori
const divIntestazione = document.getElementById("divIntestazione")
const divFilters = document.querySelector(".card")
const lstHair = document.getElementById("lstHair")
const divCollections = document.getElementById("divCollections")
const table = document.getElementById("mainTable")
const tbody = table.querySelector("tbody")
const thead = table.querySelector("thead")
const divDettagli = document.getElementById("divDettagli")
const chkGender = document.querySelectorAll("input[type=checkbox]");

// avvio
let currentCollection = "";
divFilters.style.display = "none";
btnAdd.disabled = true;
btnUpdate.disabled = true;

getCollections();

async function getCollections() {
    const HTTPResponse = await inviaRichiesta("GET", "/getCollections");
    if (HTTPResponse.status == 200) {
        console.log(HTTPResponse.data);
        const collections = HTTPResponse.data;
        const label = divCollections.querySelector("label");
        for (const collection of collections) {
            // clona la label
            // con true clona anche i discendenti della label altrimenti no
            const clonedLabel = label.cloneNode(true);
            clonedLabel.querySelector("span").textContent = collection.name;
            clonedLabel.querySelector("input[type=radio]").addEventListener("click", function () {
                currentCollection = collection.name;
                btnAdd.disabled = false;
                btnUpdate.disabled = false;
                getData();
            });
            divCollections.appendChild(clonedLabel);
        }
        // rimuove la label originale dal dom
        label.remove();
    }
    else
        alert(HTTPResponse.status + " : " + HTTPResponse.err)
}

// se non passiamo i filters gli passiamo il JSON vuoto
async function getData(filters = {}) {
    // avremo richieste tipo /api/unicorns che andremo a gestire
    // i json server lavorano così
    const HTTPResponse = await inviaRichiesta("GET", `/${currentCollection}`, filters);
    if (HTTPResponse.status == 200) {
        console.log(HTTPResponse.data);
        const strongs = divIntestazione.querySelectorAll("strong");
        strongs[0].textContent = currentCollection;
        strongs[1].textContent = HTTPResponse.data.length;
        tbody.innerHTML = "";
        for (const item of HTTPResponse.data) {
            const tr = document.createElement("tr");
            tbody.appendChild(tr);

            let td = document.createElement("td");
            td.addEventListener("click", function () {
                getCurrent(item._id);
            });
            td.textContent = item._id;
            tr.appendChild(td);

            td = document.createElement("td");
            // vettor eenumerativo con tutti i nomi delle chiavi dentro item
            const secondKey = Object.keys(item)[1];
            // item.secondKey equivale a item["secondKey"]
            td.textContent = item[secondKey];
            tr.append(td);

            // thead.querySelector("th:nth-of-type(2)");
            thead.querySelectorAll("th")[1].textContent = secondKey;

            td = document.createElement("td");
            tr.append(td);

            //patch
            let div = document.createElement("div");
            div.addEventListener("click", function () {
                patchCurrent(item._id);
            });
            td.append(div);

            //put
            div = document.createElement("div");
            div.addEventListener("click", function () {
                putCurrent(item._id);
            });
            td.append(div);

            //delete
            div = document.createElement("div");
            div.addEventListener("click", function () {
                deleteCurrent(item._id);
            })
            td.append(div);
        }
        if (currentCollection == "unicorns") {
            divFilters.style.display = "";
        }
        else
            divFilters.style.display = "none"
        divDettagli.innerHTML = "";
    }
    else
        alert(HTTPResponse.status + " : " + HTTPResponse.err)
}

async function getCurrent(_id) {
    const HTTPResponse = await inviaRichiesta("GET", `/${currentCollection}/${_id}`);
    if (HTTPResponse.status == 200) {
        console.log(HTTPResponse.data);
        let currentItem = HTTPResponse.data;
        divDettagli.innerHTML = "";
        for (const key in currentItem) {
            const strong = document.createElement("strong");
            strong.textContent = key + ": ";
            divDettagli.append(strong);

            const span = document.createElement("span");
            span.textContent = JSON.stringify(currentItem[key]);
            divDettagli.append(span);

            divDettagli.append(document.createElement("br"));
        }
    }
    else
        alert(HTTPResponse.status + " : " + HTTPResponse.err)
}

btnFind.addEventListener("click", function () {
    getData(getFilters());
});

chkGender[0].addEventListener("change", function () {
    chkGender[1].checked = false;
});

chkGender[1].addEventListener("change", function () {
    chkGender[0].checked = false;
});

btnAdd.addEventListener("click", function () {
    divDettagli.innerHTML = "";
    const textarea = document.createElement("textarea");
    divDettagli.append(textarea);
    textarea.style.height = "100px";
    textarea.value = `{\n "name":"pippo",\n "example":"modify this"\n}`;
    addTextAreaButton("POST");
});

function addTextAreaButton(method, _id = "") {
    let button = document.createElement("button");
    divDettagli.append(button);
    button.textContent = "Salva";
    button.classList.add("btn", "btn-success", "btn-sm");
    button.style.margin = "10px";

    button.addEventListener("click", async function () {
        let record = divDettagli.querySelector("textarea").value;
        try {
            record = JSON.parse(record);
        }
        catch (error) {
            alert("JSON non valido\n" + error);
            return;
        }

        let resource = `/${currentCollection}`;
        // Se c'è un id cioè nel caso delle richieste PATCH o PUT
        // concateno l'id in coda 
        if (_id)
            resource += `/${_id}`;

        const HTTPResponse = await inviaRichiesta(method, resource, record)
        if (HTTPResponse.status == 200) {
            console.log(HTTPResponse.data);
            alert("Operazione eseguita con successo");
            getData();
        }
        else
            alert(HTTPResponse.status + " : " + HTTPResponse.err)
    });

    button = document.createElement("button");
    divDettagli.append(button);
    button.textContent = "Annulla";
    button.classList.add("btn", "btn-secondary", "btn-sm");
    button.addEventListener("click", function () {
        divDettagli.innerHTML = "";
    });
}

async function deleteCurrent(_id) {
    if (confirm("Vuoi veramente cancellare il record " + _id + "?")) {
        const resource = `/${currentCollection}/${_id}`;
        const HTTPResponse = await inviaRichiesta("DELETE", resource)
        if (HTTPResponse.status == 200) {
            console.log(HTTPResponse.data);
            alert("Eliminazione eseguita con successo");
            getData();
        }
        else
            alert(HTTPResponse.status + " : " + HTTPResponse.err)

    }
}

//deleteWithFilters
btnDelete.addEventListener("click", async function () {
    let filters = getFilters();
    if (confirm("Vuoi veramente cancellare i record " + JSON.stringify(filters) + "?")) {
        const resource = `/${currentCollection}`;
        const HTTPResponse = await inviaRichiesta("DELETE", resource, filters)
        if (HTTPResponse.status == 200) {
            console.log(HTTPResponse.data);
            alert("Eliminazioni eseguite con successo" + HTTPResponse.data.deletedCount);
            getData();
        }
        else
            alert(HTTPResponse.status + " : " + HTTPResponse.err)
    }
});

function getFilters() {
    const hair = lstHair.value;
    let gender = "";
    const genderChecked = divFilters.querySelector("input[type=checkbox]:checked");
    if (genderChecked)
        gender = genderChecked.value;
    let filters = {};
    if (hair != "All")
        filters.hair = hair.toLowerCase();
    if (gender)
        filters.gender = gender.toLowerCase();
    return filters;
}

async function patchCurrent(_id) {
    const HTTPResponse = await inviaRichiesta("GET", `/${currentCollection}/${_id}`);
    if (HTTPResponse.status == 200) {
        console.log(HTTPResponse.data);
        divDettagli.innerHTML = "";
        const current = HTTPResponse.data;
        // rimuoviamo la chiave _id dal JSON 
        delete (current._id);
        const textarea = document.createElement("textarea");
        divDettagli.append(textarea);
        textarea.value = JSON.stringify(current, null, 2);
        textarea.style.height = textarea.scrollHeight + "px";
        addTextAreaButton("PATCH", _id);
    }
    else
        alert(HTTPResponse.status + " : " + HTTPResponse.err)
}

async function putCurrent(_id) {
    divDettagli.innerHTML = "";
    const textarea = document.createElement("textarea");
    divDettagli.append(textarea);
    textarea.value = `{\n "$inc": {"vampires": 2}\n }`;
    textarea.style.height = textarea.scrollHeight + "px";
    addTextAreaButton("PUT", _id);
}

btnUpdate.addEventListener("click", function () {
    divDettagli.innerHTML = "";
    const textarea = document.createElement("textarea");
    divDettagli.append(textarea);
    textarea.value = `{\n "filter": {"gender": "m"},\n "action": {"$inc": {"vampires": 2}}\n}`;
    textarea.style.height = textarea.scrollHeight + "px";
    addTextAreaButton("PUT");
})
/* #############################################################################
Javascript for admin page

This file contains:
- imports from forms.js for logging to Firestore (Firebase cloud database)
- functions to collect login & pwd and authetify admins
- helper functions for fetching data from Firestore used in forms

What happens here?
-> when the page loads, the function window.onload is called.
############################################################################# */

import { db, getInputVal, setInputVal, loadLaboratories } from  './form.js'; 
// pathname without leading nor trailing "/" 
// eg. turns /admin or /admin/ into admin
const pageName = window.location.pathname.replace(/^\/+/g, '').replace(/\/+$/, ''); 
let provider = new firebase.auth.GoogleAuthProvider();
var admin = firebase.auth();//('firebase-admin');
var participants =  new Array(); // list of participants
var dlwdedCollections = {};
const listCollections = ["participants", "participants_nov_2020", "laboratories"];
// Counter class
class Counter {
	timestamp = 0; // timestamp will be initialised later
	constructor(){
		this.value = null;
	}
};
var counters = {};
const timeOut = 30 * 60 * 1000; // 30 min in millisecond
//document.getElementById('login_form').addEventListener('submit', window.login);

// window.updateForm 
console.log("firebase:", firebase);
console.log("firebase.app().name:", firebase.app.name);

/* #############################################################################
window.onload
=> called when page is loaded
############################################################################# */
window.onload = function() {
	console.log("window.location.pathname: ", window.location.pathname );
	console.log("pageName: ", pageName);
	initApp();
	if (pageName == "dashboard"){
		listCollections.forEach(collection => {
			counters[collection]= new Counter();		
		});
		Counter.timestamp = Date(); // ninitialize timestamp
		updateNumbers();
	}
};
/* #############################################################################
initApp is called only once at window loading time.
However, once called firebase.auth().onAuthStateChanged() will be stay active.
Each time the user logs in / logs out, the code inside its definition will
be executed. 
############################################################################# */
function initApp() {
	console.log("Init App")
      // Listening for auth state changes.
      // [START authstatelistener]
	firebase.auth().onAuthStateChanged(function(user) {
		console.log("Init App onAuthStateChanged");
		if (user) {
			console.log("User signed in")
		  	// Get user data from firebase
			var displayName = user.displayName;
			var email = user.email;
			var emailVerified = user.emailVerified;
			var photoURL = user.photoURL;
			var isAnonymous = user.isAnonymous;
			var uid = user.uid;
			var providerData = user.providerData;
			document.getElementById('logging-status').textContent='Signed in';
			document.getElementById("log-out-btn").disabled = false;
			document.getElementById("log-out-btn").style.visibility = "visible"; 
			// [START_EXCLUDE]
			if (pageName == "admin"){
				window.location.pathname = "/dashboard";
			}
			if (pageName == "dashboard"){
				document.getElementById('dashboard').style.display = "block";
			}
		  // [END_EXCLUDE]
		} 
		else {
			// User is signed out.
			// [START_EXCLUDE]
			if (pageName == "admin"){
				document.getElementById('admin_title').textContent = "Admin Log In Page";
			}
			else if (pageName == "dashboard"){
				document.getElementById('dashboard').style.display = "none";
			}
			// [END_EXCLUDE]
		}
		// [START_EXCLUDE silent]
		if (pageName == "admin"){
			document.getElementById('sign-in').disabled = false;
		}
		// [END_EXCLUDE]
	});
	// [END authstatelistener]
	console.log("Reached end of initApp");
}

/* #############################################################################
logout
winwow.functionName is for accessing functionName with htmn onclik
############################################################################# */
window.logout = function logout(){
	firebase.auth().signOut();
	if (pageName == "dashboard"){
		window.location.pathname = "/admin";
	}
}
/* #############################################################################
signIn
############################################################################# */
window.signIn = function signIn() {
	console.log("toggleSignIn triggered");
 	if (firebase.auth().currentUser) {
	    // [START signout]
	    firebase.auth().signOut();
	    // [END signout]
  	} 
  	else {
	    var email = document.getElementById('username').value;
	    var password = document.getElementById('password').value;
	    if (email.length < 4) {
	      alert('Please enter an email address.');
	      return;
	    }
	    if (password.length < 4) {
	      alert('Please enter a password.');
	      return;
		}
	    // Sign in with email and password
	    // [START authwithemail]
	    createSession(email, password);				
	    document.getElementById("login_form").reset();
	    // [END authwithemail]
	}
}

/* #############################################################################
createSession
############################################################################# */
function createSession(email, password){
	console.log("createSession")
	firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
	.then(function() {
    // Existing and future Auth states are now persisted in the current
    // session only. Closing the window would clear any existing state even
    // if a user forgets to sign out.
    // ...
    // New sign-in will be persisted with session persistence.
    return firebase.auth().signInWithEmailAndPassword(email, password).catch(async function(error) {
	      // Handle Errors here.
	      var errorCode = error.code;
	      var errorMessage = error.message;
	      // [START_EXCLUDE]
	      if (errorCode === 'auth/wrong-password') {
	        alert('Wrong password.');
	      } 
	      else {
	        alert(errorMessage);
	      }
	      console.log(error);
	      document.getElementById('sign-in').disabled = false;
      	// [END_EXCLUDE]
    	});;
  })
  .catch(function(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
  });
}

/* #############################################################################
dwldDatabase calls loadCollection to retreive data from Firebase
ARGUMENT "collection" is the name of the Firestore collection
OUTPUT file is in csv format

Remark about accessing data:

At the same time, since we spend "reads" for getting the data, we update the numbers.

It is important to know that Firebase allows only a certain amount of reads / day for free.
Each query counts for 1 read and each document dowloaded counts for 1 read.
=> If you query a collection containing 100 documents, it will be counted as 100 reads
=> Since there is no way to know the size of a collection, we use a special class called
"counters" which countains counters that track the number of elements in collections.
This way we only pay for 1 read to know the number of documents in each collections.
NB: the function actuallizing the counters is a Firebase Cloud Function => see Firebase folder

############################################################################# */

window.dwldDatabase = async function dwldDatabase(collection){
	//console.log(labs.toJSON());
	if(dlwdedCollections[collection] !== undefined){
		return dlwdedCollections[collection];
	}
	else{
		await loadCollection(collection)
		.then(function(snap){
			if (snap != null){
				let spanId = "number_" + collection;
				console.log(spanId);
				document.getElementById(spanId).textContent = snap.size;
				dlwdedCollections[collection] = snap;
				let p;
				snap.forEach(doc => {
			    	p = doc.data();
			    	participants.push(p);  
				})
			}
		})
		.catch(function(error){
			console.log(error);
		});
	}
	
	var csvContent = "data:text/csv;charset=utf-8,"; // csv file
	
		/*snap.forEach(doc => {
	    	p = doc.data();
	    	participants.push(p);  
		})
		// to fill csv
		//csvContent += ;
		var json = participants
		var fields = Object.keys(participants[0])
		var replacer = function(key, value) { return value === null ? '' : value } 
		var csv = json.map(function(row){
		  return fields.map(function(fieldName){
		    return JSON.stringify(row[fieldName], replacer)
		  }).join(',')
		})
		csv.unshift(fields.join(',')) // add header column
		csv = csv.join('\r\n');
		//console.log(csv)
	}
		
	var csvData = new Blob([csv], { type: 'text/csv' }); //new way
	var csvUrl = URL.createObjectURL(csvData);
	var a = document.createElement('a');
	a.href        = csvUrl;
	a.target      = '_blank';
	a.download    = 'export.csv';
	document.getElementById("dashboard").appendChild(a);
	document.getElementById('download_participant').disabled = false;
	document.getElementById('download_participant').addEventListener('click', downloadParticipantCSV, false);
	function downloadParticipantCSV(){
		a.click();*/
}

/* #############################################################################
loadCollection accesses the database and downloads the collection from Firebase
argument "collection" is the name of the Firestore collection
############################################################################# */

function loadCollection(collection){
	console.log("Fetching Firestore collection:", collection);
	return new Promise((resolve, reject) => {
		db.collection(collection).get()
		.then(snapshot =>{
			console.log("snapshot", snapshot);
			console.log("snapshot.path", snapshot.path);
			console.log("not empty?", !snapshot.empty);
			console.log("empty?", snapshot.empty);
			try{
				document
			}
			catch(error){
				console.log("Arguments: id", id);
				console.error(error);
			}
			if (!snapshot.empty){
				console.log("Not empty");
				resolve(snapshot);
				console.log("Collection ", collection, " downloaded.");
			}
			else{
				throw "failure";
				reject(null)
			}
		})
		.catch(err =>{
			console.log("Failed to load collection ", collection, ":", err);
			reject(null);
		});
	})
}

/* #############################################################################
loadCounters accesses the database and downloads the "counters" collection from Firebase
it is used to update the numbers of documents per collection displayed on the dashboard
############################################################################# */

async function loadCounters(){

	console.log("Fetching counters from Firestore")
	return new Promise((resolve, reject) => {
		//var docRef = db.collection("counters").doc("counters");
		db.collection("counters").doc("counters").get()
		.then(snapshot =>{
			console.log("snapshot", snapshot);
			console.log("snapshot.path", snapshot.path);
			console.log("not empty?", !snapshot.empty);
			console.log("empty?", snapshot.empty);
			if (!snapshot.empty){
				console.log("Not empty");
				resolve(snapshot);
				console.log("Counters downloaded.");
			}
			else{
				throw "failure";
				reject(null)
			}
		})
		.catch(err =>{
			console.log("Failed to load counters:", err);
			reject(null);
		});
	})

}

/* #############################################################################
updates the numbers of documents per collection displayed on the dashboard
use loadCounters for retreiving data from Firestore.
############################################################################# */

async function updateNumbers(){
	// Create a reference to the cities collection
	let flag = false;
	listCollections.forEach(collection => {
		let spanId = "number_" + collection;
		let spinnerId = "spinner_" + collection;
		document.getElementById(spanId).textContent = "Loading...";
		document.getElementById(spinnerId).classList.add("spinner-border");
		if(counters[collection].value == null){
			flag = true;
		}
	});
	if (flag || (Date() - Counter.timestamp) < timeOut ){
		const object = await loadCounters();
		const data = object.data();
		listCollections.forEach(collection => {
			counters[collection].value = data[collection];
		});
		Counter.timestamp = Date(); // update timestamp of Counter class
	}
	listCollections.forEach(async function (collection, index) {
		let spanId = "number_" + collection;
		let spinnerId = "spinner_" + collection;
		document.getElementById(spinnerId).classList.remove("spinner-border");
		document.getElementById(spanId).textContent = counters[collection].value;
	});

}
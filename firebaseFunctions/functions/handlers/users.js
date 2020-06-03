const { db, admin } = require('../utilities/admin')

const firebaseConfig = require("../utilities/config");

// Auth
// cd into the 'functions' folder and run 'npm install --save firebase'
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const { validateSignUpData, validateLoginData, reduceUserDetails} = require('../utilities/vailidators')

exports.signUp = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    }

    const { valid, errors } = validateSignUpData(newUser) 

    if (!valid) {
        return res.status(400).json(errors)
    }

    const noImg = 'no-img.png'

    // No repeat userHandles
    let token
    let userId

    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                return res.status(400).json({handle: 'this handle is already taken'})
            }
            else {
               return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        })
        .then(data => {
            userId = data.user.uid
            return data.user.getIdToken()
        })
        .then(idToken => {
            token = idToken
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
                userId: userId
            }
            return db.doc(`/users/${newUser.handle}`).set(userCredentials)
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch(err => {
            console.error(err)
            if (err.code === "auth/email-already-in-use") {
                return res.status(400).json({email: 'Email is already in use'})
            }
            else {
                return res.status(500).json({error: err.code})
            }
        })
}

exports.logIn = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const { valid, errors } = validateLoginData(user) 

    if (!valid) {
        return res.status(400).json(errors)
    }

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({token})
        })
        .catch(err => {
            console.error(err)
            if (err.code === 'auth/wrong-password') {
                return res.status(403).json({general: 'Wrong password, please try again'})
            }
            else {
                return res.status(500).json({error: err.code})
            }
            
        })
 }

 // Add User Details
 exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body)

    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(() => {
            return res.json({message: "Details added successfully"})
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({error: err.code})
        })
 }


 // npm install --save busboy
 // Upload image
 exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    let imageFileName;
    let imageToBeUploaded = {};

    const busboy = new BusBoy({headers: req.headers})
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({error: 'Wrong file type submitted'})
        }

        const imageExtension = filename.split('.')[filename.split('.').length - 1] //get the png or jpg
        imageFileName = `${Math.round(Math.random() * 10000000)}.${imageExtension}`;
        // console.log(imageFileName)
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype }
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
        admin.storage().bucket(firebaseConfig.storageBucket).upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }          
            }
        })
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`
            // console.log(imageUrl)
            return db.doc(`/users/${req.user.handle}`).update({ imageUrl: imageUrl })
        })
        .then(() => {
            return res.json({ message: 'Image uploaded successfully' });
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({ error: err.code })
        })
    })
    busboy.end(req.rawBody);
 }

 //Get own user Details
 exports.getAuthenticatedUser = (req, res) => {
     let userData = {};
     db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle', '==', req.user.handle).get()
            }
        })
        .then(data => {
            userData.likes = []
            data.forEach(doc => {
                userData.likes.push(doc.data());
            })
            return dv.collection('notifications').where('recipient', '==', req.user.handle).orderBy('createdAt', 'desc').limit(10).get()
            // WILL NEED TO CREATE AN INDEX HERE
        })
        .then(data => {
            userData.notifications = []
            data.forEach(doc => {
                userData.notifications.push({
                    createdAt: doc.data().createdAt,
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    type: doc.data().type,
                    read: doc.data().read,
                    postId: doc.data().postId,
                    notificationId: doc.id
                })
            })
            return res.json(userData)
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({error: err.code})
        })
 }

exports.getUserDetails = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                userData.user = doc.data();
                return db.collection('posts').where('userHandle', '==', req.params.handle).orderBy('createdAt', 'desc').get()
            }
            else {
                return res.status(404).json({error: 'User not found'})
            }
        })
        .then(data => {
            userData.posts = []
            data.forEach(doc => {
                userData.posts.push({
                    postText: doc.data().postText,
                    createdAt: doc.data().createdAt,
                    userHandle: doc.data().userHandle,
                    userImage: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    postId: doc.id
               })
           })
           return res.json(userData)
        })
        .catch(err => {
            console.error(err)
            return res.status(500).json({error: err.code})
        })
}

exports.markNotificationsRead = (req, res) => {
    
}
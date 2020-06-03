const functions = require('firebase-functions');

const express = require('express');
const app = express();

const { db } = require('./utilities/admin')

const { getAllPosts, createPost, getPost, likePost, unlikePost, commentOnPost, deletePost } = require('./handlers/posts');
const { signUp, logIn, uploadImage, addUserDetails, getAuthenticatedUser, getUserDetails, markNotificationsRead } = require('./handlers/users');
const { FBAuth } = require('./utilities/fbAuth')

// Post Routes
app.get('/posts', getAllPosts)
app.post('/post', FBAuth, createPost)
app.get('/post/:postId', getPost)
app.get('/post/:postId/like', FBAuth, likePost)
app.get('/post/:postId/unlike', FBAuth, unlikePost)
app.post('/post/:postId/comment', FBAuth, commentOnPost)
app.delete('/post/:postId', FBAuth, deletePost)

// User Posts
app.post('/signup', signUp)
app.post('/login', logIn)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)
app.get('/user/:handle', getUserDetails)
app.post('/notifications', FBAuth, markNotificationsRead )



exports.api = functions.https.onRequest(app);
// exports.api = functions.region('us-east-1).https.onRequest(app);

exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
    .onCreate((snapshot) => {
        db.doc(`/posts/${snapshot.data().postId}`).get()
            .then(doc => {
                if (doc.exists) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        postId: doc.id
                    })
                }
            })
            .then(() => {
                return
            })
            .catch(err => {
                console.error(err)
                return;
            })
    })
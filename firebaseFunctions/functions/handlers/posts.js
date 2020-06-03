const { db } = require('../utilities/admin')

exports.getAllPosts = (req, res) => {
    db.collection('posts').orderBy('createdAt', 'desc').get()
    .then(data => {
        let posts = [];
        data.forEach(doc => {
            posts.push({
                postId: doc.id,
                ...doc.data()
            });
        })
        return res.json(posts);
    })
    .catch(err => console.error(err)); 
}

exports.createPost = (req, res) => {
    if (req.body.postText.trim() === '') {
        return res.status(400).json({postText: 'postText must not be empty'})
    }

    const newPost = {
        postText: req.body.postText,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    }

    db.collection('posts').add(newPost)
        .then(doc => {
            const resPost = newPost;
            resPost.postId = doc.id;
            res.json(resPost)
        })
        .catch(err => {
            res.status(500).json({error: 'something went wrong'})
            console.error(err);
        })
}

exports.getPost = (req,res) => {
    let postData = {}
    db.doc(`/posts/${req.params.postId}`).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({error: 'Post not found'})
            }

            postData = doc.data()
            postData.postId = doc.id
            return db.collection('comments').orderBy('createdAt', 'desc').where('postId', '==', req.params.postId).get()
        })
        .then(data => {
            postData.comments = []
            data.forEach(doc => {
                postData.comments.push(doc.data())
            })
            return res.json(postData)
        })
        .catch(err => {
            res.status(500).json({error: 'something went wrong'})
            console.error(err);
        })
}

exports.likePost = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('postId', '==', req.params.postId).limit(1)
    const postDocument = db.doc(`/posts/${req.params.postId}`)

    let postData = {}
    postDocument.get()
        .then(doc => {
            if (doc.exists) {
                postData = doc.data();
                postData.postId = doc.id;
                return likeDocument.get()
            }
            else {
                return res.status(404).json({error: 'Post not found'})
            }
        })
        .then(data => {
            if (data.empty) {
                return db.collection('likes').add({
                    postId: req.params.postId,
                    userHandle: req.user.handle
                })
                .then(() => {
                    postData.likeCount++
                    return postDocument.update({likeCount: postData.likeCount})
                })
                .then(() => {
                    return res.json(postData)
                })
            }
            else {
                return res.status(400).json({error: 'Post already liked'})
            }
        })
        .catch(err => {
            console.error(err)
            res.status(500).json({error: err.code})
        })
}

exports.unlikePost = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('postId', '==', req.params.postId).limit(1)
    const postDocument = db.doc(`/posts/${req.params.postId}`)

    let postData = {}
    postDocument.get()
        .then(doc => {
            if (doc.exists) {
                postData = doc.data();
                postData.postId = doc.id;
                return likeDocument.get()
            }
            else {
                return res.status(404).json({error: 'Post not found'})
            }
        })
        .then(data => {
            if (data.empty) {
                return res.status(400).json({error: 'Post not liked'})
            }
            else {
                return db.doc(`/likes/${data.docs[0].id}`).delete()
                    .then(() => {
                        postData.likeCount--
                        return postDocument.update({likeCount: postData.likeCount})
                    })
                    .then(() => {
                        return res.json(postData)
                    })
            }
        })
        .catch(err => {
            console.error(err)
            res.status(500).json({error: err.code})
        })

}

exports.commentOnPost = (req, res) => {
    if(req.body.body.trim() === '') {
        return res.status(400).json({error: 'Cannot be empty'})
    }

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString,
        postId: req.params.postId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    }

    db.doc(`/posts/${req.params.postId}`).get()
        .then(doc => {
            if(!doc.exists) {
                return res.status(404).json({error: 'Post not found'})
            }
            return db.collection('comments').add(newComment)
        })
        .then(() => {
            res.json(newComment)
        })
        .catch(err => {
            res.status(500).json({error: 'something went wrong'})
            console.error(err);
        })
}

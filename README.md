# flange
Node.js plugin for handling [flow.js](https://github.com/flowjs/flow.js) uploads

THIS MODULE IS UNDER ACTIVE DEVELOPMENT AND IS UNSTABLE.

If you'd like to use it, please wait for the 1.0.0 release. Anything in the 0.x version
chain is going to be rapidly iterating and probably won't work half the time.

# Configuring

Create a new `Receiver` with the appropriate settings. Settable options include:

`tmpDir`: *required* A path string that points to the temp file directory where incoming
files should be saved. This will be created if it does not exist.
`onComplete`: *optional* If not null, this callback will be called after an upload is
complete with a path string pointing to the finalized file. Handle all your post-processing
here (upload to s3, etc). This callback should return a promise.

# Server Plugins

Flange ships with one server plugin so far, for [Hapi.js](http://hapijs.com/). Call `hapiPlugin`
with an options block that includes `tmpDir`, `onComplete`, and any overrides to the route
block definitions (`options.getOptions = {config: {auth: 'token'}} `) which will be deep
copied into the blocks.

# IMPORTANT
The default flow.js flowIdentifier is based on the full path of the file. If you have a
system with concurrent users, you'll need to change that, because otherwise two users who are
uploading `/Macintosh HD/Users/bob/Desktop/bigFile.mov` at the same time will overwrite each
other.

The odds of a collision are naturally pretty small, since it's the full path name that generates
the identifier. Still, this is worth worrying about. For my own implementation, I passed a value
for `generateUniqueIdentifier` in the flow initialization object that prepends the user's system
identifier, and test on the backend that the flowIdentifier attached to the request has a valid
systemId that matches the currently logged-in user.

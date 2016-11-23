# flange
Node.js plugin for handling flow.js uploads

# important
The default flow.js flowIdentifier is based on the full path of the file. If you have a
system with concurrent users, you'll need to change that, because otherwise two users who are
uploading `/Macintosh HD/Users/bob/Desktop/bigFile.mov` at the same time will overwrite each
other.

The odds of a collision are naturally pretty small, since it's the full path name that generates
the identifier. Still, this is worth worrying about. For my own implementation, I passed a value
for `generateUniqueIdentifier` in the flow initialization object that prepends the user's system
identifier, and test on the backend that the flowIdentifier attached to the request has a valid
systemId that matches the currently logged-in user.

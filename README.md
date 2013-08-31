Rocket Jump
=======

This is a Firefox Add-on prototype created during the Paris DevTools 2013 work week.

Currently to develop a jetpack add-on, the Python [cfx tool](http://github.com/mozilla/addon-sdk) needs to be used to transform the jetpack working directory into a bootstrapped add-on, requiring a map of dependencies generated via cfx, and then subsequently zipped into a xpi file.

This add-on allows you to specify a directory where jetpack code lives, and to `reload` manually or `reload on save` with a file system watcher.

Very hacky and crude, and the basis for future cfx improvements coming in the next few months, but will work for the most part! This most likely won't be updated as it will be redundant with moving jetpack development code into AddonManager.jsm

## TODO

* Port fs enhancements into SDK?
* Move dependency lookup during installation in AddonManager.jsm, add runtime dependency lookup into Loader for fallback
* Port reusable components (zip, filepicker, etc.) into SDK?

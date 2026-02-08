'use strict';

const tiddlywiki = require("tiddlywiki");

const tw = tiddlywiki.TiddlyWiki();

const host = process.env.HOST
const port = process.env.WIKIPORT ?? '7777'
const password = process.env.WIKIPW

const argv = ['--listen', 'root-tiddler=$:/core/save/lazy-all']

if (host) {
    argv.push('host='+host)
}
argv.push('port='+port)
if (password) {
    argv.push('username=miRoox', 'password='+password)
}
argv.push('readers=(anon)', 'writers=(authenticated)', 'admin=miRoox')

console.debug('arg: %o', argv)

tw.boot.argv = argv

tw.boot.boot();

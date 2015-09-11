var fs = require('fs');
var mPath = require('path');

function generalPromisify(name, argLength) {
  exports[name] = function(){
    var args = Array.prototype.slice.call(arguments, 0, argLength);
    return new Promise(function(resolve, reject) {
      fs[name].apply(fs, args.concat(function(err, val) {
        if (err) return reject(err);
        resolve(val);
      }));
    });
  };
};

// functionName : functionArgumentsLength
var targets = {
  open : 3,
  close : 1,
  rename : 2,
  ftruncate : 2,
  chown : 3,
  fchown : 3,
  lchown : 3,
  chmod : 2,
  fchmod : 2,
  lchmod : 2,
  stat : 1,
  fstat : 1,
  lstat : 1,
  link : 2,
  symlink : 3,
  readlink : 1,
  realpath : 2,
  unlink : 1,
  rmdir : 1,
  mkdir : 2,
  readdir : 1,
  utimes : 3,
  futimes : 3,
  fsync : 1,
  write : 5,
  read : 5,
  writeFile : 3,
  readFile : 2,
};

for (var fnName in targets) {
  generalPromisify(fnName, targets[fnName]);
}

//normalize path
function getPath(path) {
  if (typeof path === 'string' && path) {
    path = mPath.normalize(path);
    if (mPath.isAbsolute(path)) {
      return path;
    } else {
      return mPath.join(process.cwd(), path);
    }
  } else {
    return process.cwd();
  }
}

exports.ls = exports.readdir;

//recursive mkdir with Promise
//$ mkdir -p
exports.mkdirp = function mkdirp(path) {
  var path = getPath(path);
  return exports.stat(path).then(function(stat) {
    if (!stat.isDirectory()) throw new Error('pfs.mkdirp : A file is in this path');
  }, function(err) {
    if (err.code !== 'ENOENT') throw err;
    return mkdirp(mPath.normalize(path + '/..')).then(function() {
      return exports.mkdir(path);
    });
  });
};

//recursive rm with Promise
//$ rm -r
exports.rm = function rm(path) {
  var path = getPath(path);
  return exports.stat(path).then(function(stat) {
    if (!stat.isDirectory()) {
      return exports.unlink(path);
    }
    return exports.ls(path).then(function(files) {
      return Promise.all(files.map(function(file) {
        return rm(mPath.join(path, file));
      }));
    }).then(function() {
      return exports.rmdir(path);
    });
  });
};

//describe file by it's path
//used within pfs.tree
//you can replace this function to modify pfs.tree function's output
//by default it's output is always 'file'
exports.getFile = function(path) {
  return Promise.resolve('file');
};

//implementation of popular bash util - tree
//returns promised filesystem subtree
//as a JavaScript object form
exports.tree = function tree(path) {
  var path = getPath(path);
  return exports.stat(path).then(function(stat) {
    if (!stat.isDirectory()) {
      return exports.getFile(path);
    }
    return exports.ls(path).then(function(files) {
      return Promise.all(files.map(function(file) {
        return tree(mPath.join(path, file));
      })).then(function(trees) {
        var result = {};
        var filesLength = files.length;
        for (var i = 0; i < filesLength; i++) {
          result[files[i]] = trees[i];
        }
        return result;
      });
    });
  });
};

//TODO: Implement GNU cp
exports.cp = function cp(src, dest) {
  var src = getPath(src);
  var dest = getPath(dest);
};

# prebid-packager

The Prebid Packager is tool used for the management and building of multiple Prebid.js installs across
mulitple versions of Prebid.js.  While it could be used for building an indvidiual Prebid.js bundle, the
real power comes from using the Packager's configuration files which allows you to describe builds
for multiple Prebid.js clients.  The Packager can use these configuration files to generate Prebid.js .js bundles 
directly or to genereate Prebid.js .json manifest files which can facilitate the creation of dynamic .js bundles 
(.js bundles that might switch between different modules or external code inclusions somewhat frequently).

## Configuration Files

The Packager's configuration files are .json files that follow a schema similar to this:
```json
{
  "pub2": {
    "version": "0.27.1",
    "packages": [
      {
        "filename": "pub2-site1.js",
        "modules": [
          "appnexusBidAdapter"
        ],
        "code": [
          "./adUnits.js"
        ]
      },
      {
        "filename": "pub2-site2.json",
        "code": {
          "adUnits": "./adUnits.js",
          "digitrust": "http://cdn.digitru.st/prod/1/digitrust.min.js"
        }
      }
    ]
  },
  "pub3": {
    "version": "1.0.0",
    "packages": [
      {
        "filename": "pub3-site1.js",
        "modules": [
          "appnexusBidAdapter",
          "rubiconBidAdapter"
        ]
      },
      {
        "filename": "pub3-site2.json",
        "code": {
          "adUnits": "./adUnits2.js",
          "digitrust": "http://cdn.digitru.st/prod/1/digitrust.min.js"
        }
      }
    ]
  }
}
```
Each of these objects in a Packager configuration file are used for tracking a specific version of Prebid.js and a 
set of Prebid.js packages that you wish to have built using that version into either Prebid.js javascript bundles or 
Packager manifest files which can faciliate creating dynamic Prebid.js javascript files.  The only requirement 
for these top-level objects is that the keys be unique (e.g. "pub1", "pub2").

The `version` field for each Packager object specifies which version of Prebid.js will be used for the enclosed
packages.  The only requirement of the version specified is that it be a version of Prebid.js that has support for
Prebid.js modules: `version >= 0.26.0`.

The `packages` array is where you define each of the Prebid.js javascript bundles or Packager manifest files that 
will be created when the Packager is run.  Which type of file is built will depend on the filename supplied for the
package.  The type of file generated will dictate which values are allowed in the rest of the package object.

### Javascript .js bundle package

If the `filename` supplied has a `.js` extension, then a Prebid.js bundle will be generated for this package.  When
generating a Prebid.js bundle package you may optionally specify both a `modules` array and/or a `code` array.
* `modules`: An array of module names specifying all the modules that will be included in this Prebid.js 
javascript bundle.
* `code`: An array of paths to javascript code files that will be included inside the bundle.  This can be either
local paths to javascript `.js` files or URLs that specify a `.js` file to be downloaded and included in the bundle.


### Packager .json manifest package

If the `filename` supplied has a `.json` extensions, then a Prebid.js manifest file will be generated for this package
along with the output of multiple `.js` files that the manifest will describe. A manifest file is not a Prebid.js 
javascript bundle, but can be used to create one.  When generating a manifest, the `modules` list is excluded as the 
manifest will generate a list that contains all the modules available for that version of Prebid.js. 

*`code` is an object that can be included when generating a Prebid.js manifest file.  Here you will list the location of 
various code files that you may want to include in your bundle that you will generate from a manifest file.  The key
will specify the key that the file will be known as in the manifest, whereas the value will specify where to find the
file that will be included.  The file location can be either a local filesystem path or a remote URL that will be
downloaded by the Packager.

The manifest file contents will look similar to this:

```json
{
  "main": "../prebid/0.27.1/prebid-core.js",
  "modules": {
    "aardvarkBidAdapter": "../prebid/0.27.1/aardvarkBidAdapter.js",
    "adbladeBidAdapter": "../prebid/0.27.1/adbladeBidAdapter.js",
    "adbundBidAdapter": "../prebid/0.27.1/adbundBidAdapter.js",
    "adbutlerBidAdapter": "../prebid/0.27.1/adbutlerBidAdapter.js",
    "adequantBidAdapter": "../prebid/0.27.1/adequantBidAdapter.js",
    "adformBidAdapter": "../prebid/0.27.1/adformBidAdapter.js",
    "adkernelBidAdapter": "../prebid/0.27.1/adkernelBidAdapter.js",
    "admediaBidAdapter": "../prebid/0.27.1/admediaBidAdapter.js",
    "admixerBidAdapter": "../prebid/0.27.1/admixerBidAdapter.js",
    "...": "..."
  },
  "code": {
    "adUnits": "../code/34cb974.js",
    "digitrust": "../code/e775040.js"
  },
  "postfix": "pbjs.processQueue();"
}
```

The manifest file contains a description to the various parts of Prebid.js that results from running the Packager
and where those parts can be found on the local filesystem (relative to the manifest file).
* `main` includes the location to the `prebid-core.js` file.  This file includes all the core code for running Prebid.js.
* `modules` will contain a list of every module available for the package (not all listed brevity's sake) and the
    location of where it can be found on the filesystem if you wish to include them.
* `code` will contain a list of all the external code that was listed in the Packager configuration file for this package
    and its resultant location on the filesystem should you wish to include it.
* `postfix` is a string of code that should be included at the end of a manually created bundle.  This is the command
    that bootstraps the Prebid.js bundle when it is executed in the browser.

## Running the Packager

The basic command to run the packager looks like this when run from the root of this repository.
```bash
node package.js ./publisherFile.json ./publisherFile2.json ../publishers/**/*.json
```

The `package.js` script requires one or more configuration files to be listed that will be loaded for the Packager.
These file paths allow the inclusion of glob patterns for loading multiple files with one path definition.  When
these configuration files are loaded, the Packager will merge all their definitions into a single configuration 
object; this is why configuration file objects are required to specify a unique key, like `pub1` when created.

When this command is run, this will result in a `build/packages` folder being generated in the project root that 
will contain the resulting packages from the defined configuration.  The `build` folder will also contain all the
scripts necessary to use any Prebid.js `.json` manifest packages that are generated.

(Note: even if no `.json` manifest files are generated, all the script files will still be outputted to the `build` 
folder as the Packager uses a manifest internally to build the `.js` bundle packages that are specified)

## [Optional] Manifest bundler

The Packager includes a bundle script that can be used to generate a Prebid.js bundle from a `.json` manifest file.
You can use this script by executing it and pointing it at a manifest file that you wish to bundle into a Prebid.js
browser bundle.

```bash
node bundle.js ./build/packages/pub2-site2.json
```

By default the bundle generated will be placed alongside the manifest file (in the example listed, inside the
`build/packages` folder).  An output file name can be specified if you wish to place the bundle somewhere else. e.g.

```bash
node bundle.js ./build/packages/pub2-site2.json -o ./bundle.js
```
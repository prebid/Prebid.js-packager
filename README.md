# prebid-packager

The Prebid Packager is a tool used for the management and building of multiple Prebid.js installs across
multiple versions of Prebid.js.  While it could be used for building an individual Prebid.js bundle, the
real power comes from using the Packager's configuration files which allow you to describe packages to be built
for multiple Prebid.js clients.  The Packager can use these configuration files to generate Prebid.js `.js` bundles 
directly or to generate Prebid.js `.json` manifest files which can facilitate the creation of dynamic `.js` bundles 
as needed (dynamic meaning bundles that might switch between different modules or external code inclusions somewhat 
frequently).

## Configuration Files

The Packager's configuration files are `.json` files that follow a schema similar to this:
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
Each of these top-level objects in a Packager configuration file are used for tracking a specific version of Prebid.js 
and a set of Prebid.js "packages" that you wish to have built, using that version, into either Prebid.js javascript 
bundles or Packager manifest files which can facilitate creating dynamic Prebid.js javascript bundles.  The keys on
these top-level objects are expected to be unique (e.g. "pub1", "pub2" etc).

The `version` field for each top-level Packager object specifies which version of Prebid.js will be used for the enclosed
packages.  The only requirement of the version specified is that it be a valid version of Prebid.js that has support for
Prebid.js modules: `version >= 0.26.0`.

The `packages` array is where you define each of the Prebid.js javascript bundles or Packager manifest files that 
will be created when the Packager is run.  Which type of file is built will depend on the filename extension supplied
for the package.  The type of file generated will dictate which values are allowed in the rest of the package object.

### Javascript .js bundle package

If the `filename` supplied has a `.js` extension, then a Prebid.js browser bundle will be generated for this package.  
When generating a Prebid.js browser bundle you may optionally specify both a `modules` array and/or a `code` array.
* `modules`: An array of module names specifying all the modules that will be included in this Prebid.js 
javascript bundle (e.g. `modules: ['appnexusBidAdapter', 'rubiconBidAdapter', 'prebidServerBidAdapter']`).
* `code`: An array of paths to javascript code files that will be included inside the bundle.  This can be either
local paths to javascript `.js` files or URLs that specify a `.js` file to be downloaded and included in the bundle.
Local `.js` files will be minified before being included in the bundle.  Downloaded files are expected to be in a 
format suitable for usage (e.g. production should be pre-minified).


### Packager .json manifest package

If the `filename` supplied has a `.json` extensions, then a Packager manifest file will be generated for this package
along with the output of multiple `.js` files that the manifest will describe. A manifest file is not a Prebid.js 
browser bundle, but can be used to create one.  When generating a manifest, the `modules` property is excluded as the 
manifest will generate a list that contains all the modules available for that version of Prebid.js. 

*`code` is an object that can be included when generating a Packager manifest file.  Here you will list the location of 
various code files that you may want to include in your bundle that you will generate from a manifest file.  The key of
the `code` object will specify the key that the file will be known as in the generated Packager manifest, whereas the 
value will specify where to find the file that will be included.  The file location can be either a local filesystem 
path or a remote URL that will be downloaded by the Packager.

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

The manifest file contains a description of how to find the various parts of a Prebid.js browser bundle by listing
where those parts can be found on the local filesystem (relative to the manifest file).
* `main` includes the location of the `prebid-core.js` file.  This file includes all the core code for running Prebid.js.
* `modules` will contain a list of every module available for the package (not all listed in this example for brevity's 
    sake) and the location of where they can be found on the filesystem if you wish to include them.
* `code` will contain a list of all the external code that was listed in the Packager configuration file for this package
    and its resultant location on the filesystem should you wish to include it.
* `postfix` is a string of code that should be included at the end of a manually created bundle.  This is the command
    that bootstraps the Prebid.js bundle when it is executed in the browser.

## Running the Packager

The basic command to run the packager looks like this when run from the root of this repository.
```bash
node package.js ./publisherFile.json ./publisherFile2.json ../publishers/**/*.json
```

The `package.js` script requires one or more configuration files to be listed that will be loaded into the Packager.
These file paths allow the inclusion of glob patterns for loading multiple files with one path definition.  When
these configuration files are loaded, the Packager will merge all their definitions into a single configuration 
object; this is why top-level configuration objects are required to specify a unique key, like `pub1` when created.

When this command is run it will result in a `build/packages` folder being generated in the project root that 
will contain the resulting packages from the combined configuration.  The `build` folder will also contain all the
scripts necessary to bundle any Packager manifests that are generated.

(Note: even if no Packager manifest files are generated, all the script files needed to bundle a Prebid.js browser bundle
will still be output to the `build`  folder as the Packager uses a Packager manifest internally to build the browser 
bundle packages that are specified)

## [Optional] Packager manifest bundler

The Packager includes a bundle script that can be used to generate a Prebid.js browser bundle from a `.json` manifest 
file. You can use this script by executing it and pointing it at a Packager manifest file that you wish to bundle into
a Prebid.js browser bundle.

```bash
node bundle.js ./build/packages/pub2-site2.json
```

By default the bundle generated will be placed alongside the manifest file (in the example listed, inside the
`build/packages` folder).  An output filename can be specified if you wish to place the bundle somewhere else:

```bash
node bundle.js ./build/packages/pub2-site2.json -o ./dist/bundle.js
```

You may also specify which modules and code inclusions you would like in your bundle.

```bash
node bundle.js ./build/packages/pub2-site2.json --modules=rubiconBidAdapter,appnexusBidAdapter --code=adUnits,digitrust
```

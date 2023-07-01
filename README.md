# VAP-E Extension: Simplified Script Executor for Testing Purposes
This repository provides a simplified version of the script execution code found within VAP-E

## Getting Started
Before you get started you'll want to make sure you know the path to your extension.

### Yarn
```sh
yarn build
yarn start [script] [scriptDir] [scriptArgs...]
```

### NPM
```sh
npm install
npm build
npm start [script] [scriptDir] [scriptArgs...]
```

## Differences with VAP-E's implementation
Most of the differences between this simplified version and the version within VAP-E relate to it being standalone and not relying on other code. This includes removing most of the logging and extension related infrastructure pieces.

To that extent, it's important to note, unlike when extensions get loaded into VAP-E there is no bootstrapping code within the scripting language (ex. Python). This means pieces like the triggering command are ignored.

## Supported Languages
The following scripting languages are currently supported:
- Python
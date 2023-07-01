import path from 'path';
import { spawnSync, SpawnSyncReturns } from 'child_process';

import fse from 'fs-extra';

import { PythonShell, Options as PythonShellOptions } from 'python-shell';

import { ScriptRunner } from '../scripts/ScriptRunner';
import { ScriptCommunicator } from '../scripts/ScriptCommunicator';

import { PythonStreamTransform } from './PythonStreamTransform';

export class PythonRunner extends ScriptRunner  {
    /**
     * Create a new ScriptRunner object
     * 
     * @param uiCallbackMock The function to use to send a message to the UI (or mock sending a message to the UI)
     * @param interpreterOptions The interpreter (PythonShell) options to use when running a (Python) script
     * @param virtualEnvPythonPath The path to the Python interpreter/executable to use (if to use a virtual environment)
     */
    constructor(uiCallbackMock: (channel: string, ...args: any[]) => void, interpreterOptions: PythonShellOptions, virtualEnvPythonPath?: string) {
        super(uiCallbackMock, interpreterOptions);

        // If the virtual environment related parameter was set, then use it
        if(virtualEnvPythonPath) {
            this.interpreterOptions.pythonPath = virtualEnvPythonPath;
        }
    }

    /**
     * Run a Python script
     * 
     * @see ScriptCommunicator to dive into the details of the communication between the logic code/script and Electron/Node
     * 
     * @override
     */
    runScript(script: string = '.', uiCallbackArgs?: { [argName: string]: unknown }) {
        var promise = new Promise(
            async (resolve, reject) => {
                // Create a new ScriptCommunicator instance
                var scriptCommunicator = new ScriptCommunicator(script, this.interpreterOptions, this.uiCallbackMock, PythonStreamTransform);

                // Run the ScriptCommunicator
                scriptCommunicator.run(PythonShell, uiCallbackArgs, resolve, reject); 
            }
        );
        
        // Returns a Promise so that we can build off the output with 
        // .then or catch errors with .catch and makes it easy and 
        // standard
        return promise;
    }

    /**
     * Get the appropriate virtual environment folder for the current platform
     * 
     * @param repoDir The path to the logic code's folder (where the virtual environment should be located)
     * @returns The path to the virtual environment folder
     */
    private static getVenvFolder(repoDir: string = '.') {
        let venvFolder;

        if (process.platform === 'win32') {
            venvFolder = path.join(repoDir, '.venv-windows');
        }
        else {
            venvFolder = path.join(repoDir, '.venv');
        }

        return venvFolder;
    }

    /**
     * Create a virtual environment for Python
     * 
     * @param repoDir The path to the logic code's folder (where the virtual environment should be located)
     */
    private static createVenv(repoDir: string = '.') {
        // Create the virtual environment (accounting for platform differences)
        let cmdReturn: SpawnSyncReturns<Buffer>;
        if (process.platform === 'win32') {
            // If it's a Windows machine, then use the `python` command
            cmdReturn = spawnSync(`python -m venv ${this.getVenvFolder(repoDir)}`, { shell: true });
        }
        else {
            // Otherwise, use the `python3` command
            cmdReturn = spawnSync(`python3 -m venv ${this.getVenvFolder(repoDir)}`, { shell: true });
        }

        console.debug('Python Virtual Environment (stdout): ' + cmdReturn.stdout.toString());
            
        // Only log the stderr if it's not empty
        if(cmdReturn.stderr.toString() !== '') {
            console.error('Python Virtual Environment (stderr): ' + cmdReturn.stderr.toString());
        }
    }

    /**
     * Install the Python module's dependencies
     * 
     * @param repoDir The path to the logic code's folder (where the virtual environment is located)
     */
    private static installCoreDependencies(repoDir: string) {
        // Get the path to the pip executable in the virtual environment
        const pipPath = path.join(this.getVenvFolder(repoDir), 'bin', 'pip');
        
        // Combine the arguments together into a runnable command on a terminal (using a space as a separator)
        const pipInstallCmd = ['"' + pipPath + '"', 'install', '-r', '"' + path.join(repoDir, 'requirements.txt') + '"'].join(' ');
        console.debug('Pip Install Command: ' + pipInstallCmd);
        
        // Run the install command
        const { stdout, stderr } = spawnSync(pipInstallCmd, { shell: true });
        
        console.debug('Pip Install (tdout): ' + stdout.toString());
       
        if(stderr.toString() !== '') {
            console.error('Pip Istall (stderr): ' + stderr.toString());
        }
    }

    /**
     * Create a ScriptRunner (Python) that uses a virtual environment
     * 
     * @param repoDir The path to where the logic code is located (where the `requirements.txt` file is located)
     * @param uiCallbackMock The function to use to mock sending messages to the UI
     * @param scriptArgs The arguments to pass to the script (Python)
     * @returns A ScriptRunner (Python) instance (with a virtual environment setup)
     */
    static async createWithVirtualEnv(repoDir: string, uiCallbackMock: (channel: string, ...args: any[]) => void, scriptArgs: string[] = []) {
        const venvPath = path.join(this.getVenvFolder(repoDir), 'bin', 'python');

        if(!fse.existsSync(venvPath)) {
            // Create the virtual environment
            this.createVenv(repoDir);
            
            // Install the core's dependencies
            this.installCoreDependencies(repoDir);
        }
        
        // Get the path to the virtual environment's Python executable (needed to use the virtual environment for running Python scripts)
        const virtualEnvPythonPath = path.join(this.getVenvFolder(repoDir), 'bin', 'python');

        // Setup the script interpreter (PythonShell) options
        const interpreterOptions: PythonShellOptions = {
            mode: 'text',
            pythonOptions: ['-u', '-m'],  
            args: scriptArgs
        };

        // Return a new ScriptRunner instance (that uses the virtual environment)
        return new this(uiCallbackMock, interpreterOptions, virtualEnvPythonPath);
    }
}